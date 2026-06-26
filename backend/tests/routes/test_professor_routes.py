"""Tests for api/routes/professor.py."""
import pytest


PROF_DATA = {"professor_id": 1, "name": "Dr. Smith", "email": "smith@neu.edu"}


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
        monkeypatch.setattr("api.routes.professor.update_professor_crud", lambda *a, **k: {**PROF_DATA, "name": "Dr. Updated"})
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
