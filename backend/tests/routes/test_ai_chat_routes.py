"""Tests for api/routes/ai_chat.py — mocking ai_service."""
import pytest
from datetime import datetime


SESSION_DATA = {
    "session_id": 1,
    "user_id": 1,
    "section_id": 5,
    "created_at": datetime(2025, 1, 1).isoformat(),
    "last_interaction": datetime(2025, 1, 1).isoformat(),
}

AI_MSG = {
    "message_id": 1,
    "session_id": 1,
    "role": "assistant",
    "content": "Here is your answer.",
    "timestamp": datetime(2025, 1, 1).isoformat(),
    "tokens_used": 42,
}

HISTORY_MSG = {
    "message_id": 1,
    "session_id": 1,
    "role": "user",
    "content": "Hello",
    "timestamp": datetime(2025, 1, 1).isoformat(),
    "tokens_used": 0,
}


def _patch_ai(monkeypatch, method="generate_response", return_value=("response text", 42)):
    monkeypatch.setattr(f"api.routes.ai_chat.ai_service.{method}", lambda *a, **k: return_value)


class TestSendMessageToAI:
    def test_returns_chat_response(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.get_or_create_session", lambda *a, **k: SESSION_DATA)
        monkeypatch.setattr("api.routes.ai_chat.get_chat_history", lambda *a, **k: [])
        monkeypatch.setattr("api.routes.ai_chat.get_section_context", lambda *a, **k: {"notes": [], "documents": []})
        monkeypatch.setattr("api.routes.ai_chat.create_chat_message", lambda *a, **k: AI_MSG)
        _patch_ai(monkeypatch, "generate_response")
        resp = client.post("/api/v1/ai-chat", json={
            "user_id": 1, "section_id": 5, "message": "Help me study"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "ai_response" in data

    def test_uses_all_sections_context(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.get_or_create_session", lambda *a, **k: SESSION_DATA)
        monkeypatch.setattr("api.routes.ai_chat.get_chat_history", lambda *a, **k: [])
        captured = {}

        def mock_course_ctx(*a, **k):
            captured["called"] = True
            return {"notes": [], "documents": []}

        monkeypatch.setattr("api.routes.ai_chat.get_course_context", mock_course_ctx)
        monkeypatch.setattr("api.routes.ai_chat.create_chat_message", lambda *a, **k: AI_MSG)
        _patch_ai(monkeypatch, "generate_response")
        resp = client.post("/api/v1/ai-chat", json={
            "user_id": 1, "section_id": 5, "message": "Help", "use_all_sections": True
        })
        assert resp.status_code == 200
        assert captured.get("called")

    def test_returns_500_on_exception(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.get_or_create_session", lambda *a, **k: (_ for _ in ()).throw(Exception("boom")))
        resp = client.post("/api/v1/ai-chat", json={"user_id": 1, "section_id": 5, "message": "Help"})
        assert resp.status_code == 500


class TestGetChatHistory:
    def test_returns_history(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.get_or_create_session", lambda *a, **k: SESSION_DATA)
        monkeypatch.setattr("api.routes.ai_chat.get_chat_history", lambda *a, **k: [HISTORY_MSG])
        resp = client.get("/api/v1/ai-chat/history?user_id=1&section_id=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["session_id"] == 1
        assert len(data["messages"]) == 1

    def test_returns_500_on_exception(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.get_or_create_session", lambda *a, **k: (_ for _ in ()).throw(Exception("boom")))
        resp = client.get("/api/v1/ai-chat/history?user_id=1&section_id=5")
        assert resp.status_code == 500

    def test_returns_422_on_missing_params(self, client):
        resp = client.get("/api/v1/ai-chat/history")  # user_id and section_id are required
        assert resp.status_code == 422


class TestGenerateStudyGuide:
    def test_generates_study_guide(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.get_or_create_session", lambda *a, **k: SESSION_DATA)
        monkeypatch.setattr("api.routes.ai_chat.get_section_context", lambda *a, **k: {"notes": [], "documents": []})
        monkeypatch.setattr("api.routes.ai_chat.create_chat_message", lambda *a, **k: AI_MSG)
        _patch_ai(monkeypatch, "generate_study_guide")
        resp = client.post("/api/v1/ai-chat/study-guide?user_id=1&section_id=5")
        assert resp.status_code == 200

    def test_returns_500_on_exception(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.get_or_create_session", lambda *a, **k: (_ for _ in ()).throw(Exception("boom")))
        resp = client.post("/api/v1/ai-chat/study-guide?user_id=1&section_id=5")
        assert resp.status_code == 500


class TestGeneratePracticeExam:
    def test_generates_practice_exam(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.get_or_create_session", lambda *a, **k: SESSION_DATA)
        monkeypatch.setattr("api.routes.ai_chat.get_section_context", lambda *a, **k: {"notes": [], "documents": []})
        monkeypatch.setattr("api.routes.ai_chat.create_chat_message", lambda *a, **k: AI_MSG)
        _patch_ai(monkeypatch, "generate_practice_exam")
        resp = client.post("/api/v1/ai-chat/practice-exam?user_id=1&section_id=5&num_questions=5")
        assert resp.status_code == 200


class TestGenerateCourseSummary:
    def test_generates_summary(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.get_or_create_session", lambda *a, **k: SESSION_DATA)
        monkeypatch.setattr("api.routes.ai_chat.get_section_context", lambda *a, **k: {"notes": [], "documents": []})
        monkeypatch.setattr("api.routes.ai_chat.create_chat_message", lambda *a, **k: AI_MSG)
        _patch_ai(monkeypatch, "summarize_course")
        resp = client.post("/api/v1/ai-chat/course-summary?user_id=1&section_id=5")
        assert resp.status_code == 200


class TestDeleteChatSession:
    def test_deletes_session(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.delete_chat_session", lambda *a, **k: True)
        resp = client.delete("/api/v1/ai-chat/1")
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.ai_chat.delete_chat_session", lambda *a, **k: False)
        resp = client.delete("/api/v1/ai-chat/999")
        assert resp.status_code == 404
