"""
Tests for api/routes/message.py HTTP endpoints only.
chat_websocket is NOT tested — see tests/TODO.md.
"""

import pytest
from datetime import datetime
import uuid


MSG_UUID = str(uuid.uuid4())
MSG_DATA = {
    "message_id": MSG_UUID,
    "sender_id": 1,
    "content": "Hello!",
    "created_at": datetime(2025, 1, 1, 12, 0, 0).isoformat(),
    "conversation_id": 2,
}

USER_DATA = {
    "user_id": 1,
    "auth_id": "test-auth-id",
    "neu_email": "test@northeastern.edu",
    "first_name": "Alice",
    "last_name": "Smith",
    "profile_picture": None,
}


class TestCreateMessage:
    def test_creates_message(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.message.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.message.create_message_crud", lambda *a, **k: MSG_DATA)
        resp = client.post("/api/v1/messages", json={"conversation_id": 2, "content": "Hello!"})
        assert resp.status_code == 201

    def test_returns_404_when_user_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.message.get_user_by_auth_id", lambda *a, **k: None)
        resp = client.post("/api/v1/messages", json={"conversation_id": 2, "content": "Hello!"})
        assert resp.status_code == 404


class TestGetMessage:
    def test_returns_message(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.message.get_message_by_id", lambda *a, **k: MSG_DATA)
        resp = client.get(f"/api/v1/messages/{MSG_UUID}")
        assert resp.status_code == 200
        assert resp.json()["message_id"] == MSG_UUID

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.message.get_message_by_id", lambda *a, **k: None)
        resp = client.get("/api/v1/messages/no-such-id")
        assert resp.status_code == 404


class TestGetMessages:
    def test_returns_paginated_messages(self, client, monkeypatch):
        monkeypatch.setattr(
            "api.routes.message.get_messages_paginated",
            lambda *a, **k: {"messages": [MSG_DATA], "next_cursor": None, "has_more": False},
        )
        resp = client.get("/api/v1/messages?conversation_id=2")
        assert resp.status_code == 200
        assert "messages" in resp.json()

    def test_with_before_cursor(self, client, monkeypatch):
        monkeypatch.setattr(
            "api.routes.message.get_messages_paginated",
            lambda *a, **k: {"messages": [], "next_cursor": None, "has_more": False},
        )
        resp = client.get("/api/v1/messages?conversation_id=2&before=2025-01-01T00:00:00")
        assert resp.status_code == 200


class TestUpdateMessage:
    def test_updates_message(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.message.get_message_by_id", lambda *a, **k: MSG_DATA)
        monkeypatch.setattr(
            "api.routes.message.update_message_crud", lambda *a, **k: {**MSG_DATA, "content": "Updated"}
        )
        resp = client.patch(f"/api/v1/messages/{MSG_UUID}", json={"content": "Updated"})
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.message.get_message_by_id", lambda *a, **k: None)
        resp = client.patch(f"/api/v1/messages/{MSG_UUID}", json={"content": "Updated"})
        assert resp.status_code == 404


class TestDeleteMessage:
    def test_deletes_message(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.message.get_message_by_id", lambda *a, **k: MSG_DATA)
        monkeypatch.setattr("api.routes.message.delete_message_crud", lambda *a, **k: True)
        resp = client.delete(f"/api/v1/messages/{MSG_UUID}")
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.message.get_message_by_id", lambda *a, **k: None)
        resp = client.delete(f"/api/v1/messages/{MSG_UUID}")
        assert resp.status_code == 404
