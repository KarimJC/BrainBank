"""Tests for api/routes/courses.py."""
import pytest


COURSE_DATA = {"id": 1, "course": "CS3000", "title": "Algorithms", "subject": "CS"}


class TestCreateCourse:
    def test_creates_course(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.courses.create_course_crud", lambda *a, **k: COURSE_DATA)
        resp = client.post("/api/v1/courses", json={"course": "CS3000", "title": "Algorithms", "subject": "CS"})
        assert resp.status_code == 201
        assert resp.json()["id"] == 1

    def test_returns_422_on_invalid_body(self, client):
        resp = client.post("/api/v1/courses", json={"course": "CS3000"})  # missing fields
        assert resp.status_code == 422


class TestGetCourse:
    def test_returns_course(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.courses.get_course_by_id", lambda *a, **k: COURSE_DATA)
        resp = client.get("/api/v1/courses/1")
        assert resp.status_code == 200
        assert resp.json()["id"] == 1

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.courses.get_course_by_id", lambda *a, **k: None)
        resp = client.get("/api/v1/courses/999")
        assert resp.status_code == 404


class TestGetCourses:
    def test_returns_all_courses(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.courses.get_all_courses_crud", lambda *a, **k: [COURSE_DATA])
        resp = client.get("/api/v1/courses")
        assert resp.status_code == 200
        assert len(resp.json()["courses"]) == 1

    def test_returns_empty_list(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.courses.get_all_courses_crud", lambda *a, **k: [])
        resp = client.get("/api/v1/courses")
        assert resp.status_code == 200
        assert resp.json()["courses"] == []

    def test_filters_by_subject(self, client, monkeypatch):
        captured = {}

        def mock_get_all(db, subject=None):
            captured["subject"] = subject
            return [COURSE_DATA]

        monkeypatch.setattr("api.routes.courses.get_all_courses_crud", mock_get_all)
        resp = client.get("/api/v1/courses?subject=CS")
        assert resp.status_code == 200
        assert captured.get("subject") == "CS"


class TestUpdateCourse:
    def test_updates_course(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.courses.get_course_by_id", lambda *a, **k: COURSE_DATA)
        monkeypatch.setattr("api.routes.courses.update_course_crud", lambda *a, **k: {**COURSE_DATA, "course": "CS4000"})
        resp = client.put("/api/v1/courses/1", json={"course": "CS4000", "title": "Advanced Algo", "subject": "CS"})
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.courses.get_course_by_id", lambda *a, **k: None)
        resp = client.put("/api/v1/courses/999", json={"course": "CS4000", "title": "X", "subject": "CS"})
        assert resp.status_code == 404


class TestDeleteCourse:
    def test_deletes_course(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.courses.get_course_by_id", lambda *a, **k: COURSE_DATA)
        monkeypatch.setattr("api.routes.courses.delete_course_crud", lambda *a, **k: True)
        resp = client.delete("/api/v1/courses/1")
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.courses.get_course_by_id", lambda *a, **k: None)
        resp = client.delete("/api/v1/courses/999")
        assert resp.status_code == 404
