"""Tests for api/routes/professor.py."""

import pytest
from unittest.mock import MagicMock

from core.exceptions import DatabaseException


PROF_DATA = {"professor_id": 1, "name": "Dr. Smith", "email": "smith@neu.edu"}

USER_DATA = {
    "user_id": 1,
    "auth_id": "test-auth-id",
    "neu_email": "test@northeastern.edu",
    "first_name": "Alice",
    "last_name": "Smith",
    "profile_picture": None,
}


class TestListProfessors:
    def test_returns_professors(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.professor.get_all_professors", lambda *a, **k: [PROF_DATA])
        resp = client.get("/api/v1/professors")
        assert resp.status_code == 200
        assert resp.json() == [PROF_DATA]

    def test_returns_empty_list(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.professor.get_all_professors", lambda *a, **k: [])
        resp = client.get("/api/v1/professors")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_preserves_crud_order(self, client, monkeypatch):
        adams = {"professor_id": 2, "name": "Dr. Adams", "email": "adams@neu.edu"}
        smith = {"professor_id": 1, "name": "Dr. Smith", "email": "smith@neu.edu"}
        monkeypatch.setattr("api.routes.professor.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.professor.get_all_professors", lambda *a, **k: [adams, smith])
        resp = client.get("/api/v1/professors")
        assert resp.status_code == 200
        names = [p["name"] for p in resp.json()]
        assert names == ["Dr. Adams", "Dr. Smith"]

    def test_returns_404_when_user_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_user_by_auth_id", lambda *a, **k: None)
        resp = client.get("/api/v1/professors")
        assert resp.status_code == 404

    def test_does_not_query_professors_when_user_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_user_by_auth_id", lambda *a, **k: None)
        mock_get_all = MagicMock()
        monkeypatch.setattr("api.routes.professor.get_all_professors", mock_get_all)
        resp = client.get("/api/v1/professors")
        assert resp.status_code == 404
        mock_get_all.assert_not_called()

    def test_returns_500_on_db_error(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_user_by_auth_id", lambda *a, **k: USER_DATA)

        def raise_db_error(*a, **k):
            raise DatabaseException("fail")

        monkeypatch.setattr("api.routes.professor.get_all_professors", raise_db_error)
        resp = client.get("/api/v1/professors")
        assert resp.status_code == 500

    def test_returns_401_when_unauthenticated(self, client):
        from main import app
        from auth import get_current_user

        app.dependency_overrides.pop(get_current_user, None)
        resp = client.get("/api/v1/professors")
        assert resp.status_code == 401


class TestCreateProfessor:
    def test_creates_professor(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.check_professor_email_exists", lambda *a, **k: False)
        monkeypatch.setattr("api.routes.professor.create_professor_crud", lambda *a, **k: PROF_DATA)
        resp = client.post("/api/v1/professors", json={"name": "Dr. Smith", "email": "smith@neu.edu"})
        assert resp.status_code == 201

    def test_returns_409_when_email_exists(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.check_professor_email_exists", lambda *a, **k: True)
        resp = client.post("/api/v1/professors", json={"name": "Dr. Smith", "email": "smith@neu.edu"})
        assert resp.status_code == 409

    def test_returns_422_on_invalid_body(self, client):
        resp = client.post("/api/v1/professors", json={"name": "Dr. Smith"})
        assert resp.status_code == 422


class TestGetProfessor:
    def test_returns_professor(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_professor_by_id", lambda *a, **k: PROF_DATA)
        resp = client.get("/api/v1/professors/1")
        assert resp.status_code == 200
        assert resp.json()["professor_id"] == 1

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_professor_by_id", lambda *a, **k: None)
        resp = client.get("/api/v1/professors/999")
        assert resp.status_code == 404


class TestUpdateProfessor:
    def test_updates_professor(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_professor_by_id", lambda *a, **k: PROF_DATA)
        monkeypatch.setattr("api.routes.professor.check_professor_email_exists", lambda *a, **k: False)
        monkeypatch.setattr(
            "api.routes.professor.update_professor_crud", lambda *a, **k: {**PROF_DATA, "name": "Dr. Updated"}
        )
        resp = client.patch("/api/v1/professors/1", json={"name": "Dr. Updated"})
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_professor_by_id", lambda *a, **k: None)
        resp = client.patch("/api/v1/professors/999", json={"name": "X"})
        assert resp.status_code == 404

    def test_returns_409_when_email_conflict(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_professor_by_id", lambda *a, **k: PROF_DATA)
        monkeypatch.setattr("api.routes.professor.check_professor_email_exists", lambda *a, **k: True)
        resp = client.patch("/api/v1/professors/1", json={"email": "other@neu.edu"})
        assert resp.status_code == 409


class TestDeleteProfessor:
    def test_deletes_professor(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_professor_by_id", lambda *a, **k: PROF_DATA)
        monkeypatch.setattr("api.routes.professor.delete_professor_crud", lambda *a, **k: True)
        resp = client.delete("/api/v1/professors/1")
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.professor.get_professor_by_id", lambda *a, **k: None)
        resp = client.delete("/api/v1/professors/999")
        assert resp.status_code == 404
