"""Tests for api/routes/document.py — mocking ai_service and pdf_service."""

import pytest
from datetime import date
import uuid


DOC_UUID = str(uuid.uuid4())
DOC_DATA = {
    "doc_id": DOC_UUID,
    "user_id": 1,
    "doc_type": "study_guide",
    "doc_content": "Guide content here",
    "doc_date": str(date(2025, 1, 1)),
    "course_id": 5,
}


class TestGetDocument:
    def test_returns_document(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.document.get_document_by_id", lambda *a, **k: DOC_DATA)
        resp = client.get(f"/api/v1/documents/{DOC_UUID}")
        assert resp.status_code == 200
        assert resp.json()["doc_id"] == DOC_UUID

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.document.get_document_by_id", lambda *a, **k: None)
        resp = client.get("/api/v1/documents/no-such-uuid")
        assert resp.status_code == 404


class TestDownloadDocumentPdf:
    def test_returns_pdf_bytes(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.document.get_document_by_id", lambda *a, **k: DOC_DATA)
        monkeypatch.setattr("api.routes.document.pdf_service.markdown_to_pdf", lambda *a, **k: b"%PDF-fake")
        resp = client.get(f"/api/v1/documents/{DOC_UUID}/pdf")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.document.get_document_by_id", lambda *a, **k: None)
        resp = client.get("/api/v1/documents/no-such/pdf")
        assert resp.status_code == 404

    def test_returns_500_on_pdf_error(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.document.get_document_by_id", lambda *a, **k: DOC_DATA)
        monkeypatch.setattr(
            "api.routes.document.pdf_service.markdown_to_pdf",
            lambda *a, **k: (_ for _ in ()).throw(Exception("PDF error")),
        )
        resp = client.get(f"/api/v1/documents/{DOC_UUID}/pdf")
        assert resp.status_code == 500


class TestGetDocuments:
    def test_returns_all_documents(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.document.get_all_documents", lambda *a, **k: [DOC_DATA])
        resp = client.get("/api/v1/documents")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_filters_by_user_id(self, client, monkeypatch):
        captured = {}

        def mock_get_all(db, user_id=None, course_id=None):
            captured["user_id"] = user_id
            return [DOC_DATA]

        monkeypatch.setattr("api.routes.document.get_all_documents", mock_get_all)
        resp = client.get("/api/v1/documents?user_id=1")
        assert resp.status_code == 200
        assert captured["user_id"] == 1

    def test_filters_by_course_id(self, client, monkeypatch):
        captured = {}

        def mock_get_all(db, user_id=None, course_id=None):
            captured["course_id"] = course_id
            return [DOC_DATA]

        monkeypatch.setattr("api.routes.document.get_all_documents", mock_get_all)
        resp = client.get("/api/v1/documents?course_id=5")
        assert resp.status_code == 200
        assert captured["course_id"] == 5


class TestDeleteDocument:
    def test_deletes_document(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.document.get_document_by_id", lambda *a, **k: DOC_DATA)
        monkeypatch.setattr("api.routes.document.delete_document", lambda *a, **k: True)
        resp = client.delete(f"/api/v1/documents/{DOC_UUID}")
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.document.get_document_by_id", lambda *a, **k: None)
        resp = client.delete("/api/v1/documents/no-such")
        assert resp.status_code == 404


class TestGenerateStudyGuide:
    def test_generates_study_guide(self, client, monkeypatch):
        monkeypatch.setattr(
            "api.routes.document.ai_service.generate_study_guide", lambda *a, **k: ("guide content", 42)
        )
        monkeypatch.setattr("api.routes.document.create_document", lambda *a, **k: DOC_DATA)

        # patch inside document route for the local import
        from db.crud.ai_chat import get_section_context as real_ctx

        monkeypatch.setattr("db.crud.ai_chat.get_section_context", lambda *a, **k: {"notes": [], "documents": []})
        resp = client.post("/api/v1/documents/generate/study-guide?user_id=1&section_id=5")
        assert resp.status_code == 201

    def test_returns_500_on_exception(self, client, monkeypatch):
        monkeypatch.setattr(
            "api.routes.document.ai_service.generate_study_guide",
            lambda *a, **k: (_ for _ in ()).throw(Exception("AI fail")),
        )
        monkeypatch.setattr("db.crud.ai_chat.get_section_context", lambda *a, **k: {"notes": [], "documents": []})
        resp = client.post("/api/v1/documents/generate/study-guide?user_id=1&section_id=5")
        assert resp.status_code == 500

    def test_returns_422_on_missing_params(self, client):
        resp = client.post("/api/v1/documents/generate/study-guide")  # user_id and section_id are required
        assert resp.status_code == 422


class TestGeneratePracticeExam:
    def test_generates_practice_exam(self, client, monkeypatch):
        monkeypatch.setattr(
            "api.routes.document.ai_service.generate_practice_exam", lambda *a, **k: ("exam content", 42)
        )
        monkeypatch.setattr("api.routes.document.create_document", lambda *a, **k: DOC_DATA)
        monkeypatch.setattr("db.crud.ai_chat.get_section_context", lambda *a, **k: {"notes": [], "documents": []})
        resp = client.post("/api/v1/documents/generate/practice-exam?user_id=1&section_id=5")
        assert resp.status_code == 201


class TestGenerateSummary:
    def test_generates_summary(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.document.ai_service.summarize_course", lambda *a, **k: ("summary content", 42))
        monkeypatch.setattr("api.routes.document.create_document", lambda *a, **k: DOC_DATA)
        monkeypatch.setattr("db.crud.ai_chat.get_section_context", lambda *a, **k: {"notes": [], "documents": []})
        resp = client.post("/api/v1/documents/generate/summary?user_id=1&section_id=5")
        assert resp.status_code == 201
