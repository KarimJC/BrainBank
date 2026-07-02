"""Tests for api/routes/conversation.py."""

import pytest
from datetime import datetime


CONV_DATA = {
    "conversation_id": 1,
    "initiator_id": 2,
    "recipient_id": 3,
    "status": "pending",
    "blocked_by": None,
    "created_at": "2025-01-01T00:00:00",
    "initiator_name": "Alice Smith",
    "initiator_profile_picture": None,
    "recipient_name": "Bob Jones",
    "recipient_profile_picture": None,
    "unread_count": 0,
}

USER_DATA = {
    "user_id": 2,
    "auth_id": "test-auth-id",
    "neu_email": "test@northeastern.edu",
    "first_name": "Alice",
    "last_name": "Smith",
    "profile_picture": None,
}


class TestCreateConversation:
    def test_creates_conversation(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.check_conversation_exists_crud", lambda *a, **k: False)
        monkeypatch.setattr("api.routes.conversation.create_conversation_crud", lambda *a, **k: CONV_DATA)
        monkeypatch.setattr("api.routes.conversation.cache_delete", lambda *a, **k: None)
        resp = client.post("/api/v1/conversations/2", json={"recipient_id": 3})
        assert resp.status_code == 201

    def test_returns_404_when_already_exists(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.check_conversation_exists_crud", lambda *a, **k: True)
        resp = client.post("/api/v1/conversations/2", json={"recipient_id": 3})
        # PRODUCTION BUG: ConversationAlreadyExists in core/exceptions.py is defined
        # with status_code=HTTP_404_NOT_FOUND instead of the semantically correct
        # HTTP_409_CONFLICT. This test pins the current (incorrect) behavior.
        assert resp.status_code == 404


class TestUpdateConversation:
    def test_updates_status(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.get_conversation_by_id_crud", lambda *a, **k: CONV_DATA)
        monkeypatch.setattr("api.routes.conversation.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr(
            "api.routes.conversation.update_conversation_status_crud",
            lambda *a, **k: {**CONV_DATA, "status": "accepted"},
        )
        monkeypatch.setattr("api.routes.conversation.cache_delete", lambda *a, **k: None)
        resp = client.patch("/api/v1/conversations/1", json={"status": "accepted"})
        assert resp.status_code == 200

    def test_returns_404_when_conversation_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.get_conversation_by_id_crud", lambda *a, **k: None)
        resp = client.patch("/api/v1/conversations/999", json={"status": "accepted"})
        assert resp.status_code == 404


class TestGetUserConversations:
    def test_returns_conversations(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.get_user_by_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.conversation.cache_get", lambda k: None)
        monkeypatch.setattr("api.routes.conversation.get_user_conversations_crud", lambda *a, **k: [CONV_DATA])
        monkeypatch.setattr("api.routes.conversation.cache_set", lambda *a, **k: None)
        resp = client.get("/api/v1/conversations/user/2")
        assert resp.status_code == 200

    def test_returns_cached_conversations(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.get_user_by_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.conversation.cache_get", lambda k: [CONV_DATA])
        resp = client.get("/api/v1/conversations/user/2")
        assert resp.status_code == 200

    def test_returns_404_when_user_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.get_user_by_id", lambda *a, **k: None)
        resp = client.get("/api/v1/conversations/user/999")
        assert resp.status_code == 404


class TestGetConversation:
    def test_returns_conversation(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.get_conversation_by_id_crud", lambda *a, **k: CONV_DATA)
        resp = client.get("/api/v1/conversations/1")
        assert resp.status_code == 200
        assert resp.json()["conversation_id"] == 1

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.get_conversation_by_id_crud", lambda *a, **k: None)
        resp = client.get("/api/v1/conversations/999")
        assert resp.status_code == 404


class TestMarkRead:
    def test_marks_conversation_as_read(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.get_conversation_by_id_crud", lambda *a, **k: CONV_DATA)
        monkeypatch.setattr("api.routes.conversation.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.conversation.mark_conversation_read_crud", lambda *a, **k: None)
        monkeypatch.setattr("api.routes.conversation.cache_delete", lambda *a, **k: None)
        resp = client.post("/api/v1/conversations/1/read")
        assert resp.status_code == 204

    def test_returns_404_when_conversation_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.conversation.get_conversation_by_id_crud", lambda *a, **k: None)
        resp = client.post("/api/v1/conversations/999/read")
        assert resp.status_code == 404
