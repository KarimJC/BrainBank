"""
Tests for api/routes/course_section.py.

NOTE: get_students_in_section endpoint is NOT tested — see tests/TODO.md.
"""

import pytest


SECTION_DETAIL = {
    "course_section_id": 1,
    "course_id": 2,
    "course_crn": 30186,
    "professor_id": 3,
    "course_code": "CS3000",
    "course_name": "Algorithms",
    "subject": "CS",
    "professor_name": "Dr. Smith",
}

SECTION_SIMPLE = {
    "id": 1,
    "course_id": 2,
    "course_CRN": 30186,
    "professor_id": 3,
}

USER_DATA = {
    "user_id": 1,
    "auth_id": "test-auth-id",
    "neu_email": "test@northeastern.edu",
    "first_name": "Alice",
    "last_name": "Smith",
    "profile_picture": None,
}


class TestGetMyCourseSections:
    def test_returns_sections_for_current_user(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.course_section.get_course_sections_for_user", lambda *a, **k: [SECTION_DETAIL])
        resp = client.get("/api/v1/course-sections/me")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_returns_404_when_user_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_user_by_auth_id", lambda *a, **k: None)
        resp = client.get("/api/v1/course-sections/me")
        assert resp.status_code == 404


class TestGetAllCourseSections:
    def test_returns_all_sections(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_all_course_sections", lambda *a, **k: [SECTION_DETAIL])
        resp = client.get("/api/v1/course-sections")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_returns_empty_list(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_all_course_sections", lambda *a, **k: [])
        resp = client.get("/api/v1/course-sections")
        assert resp.status_code == 200
        assert resp.json() == []


class TestGetCourseSectionsForUser:
    def test_returns_sections_for_user(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_sections_for_user", lambda *a, **k: [SECTION_DETAIL])
        resp = client.get("/api/v1/course-sections/user/1")
        assert resp.status_code == 200


class TestGetCourseSectionByCrn:
    def test_returns_section(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_section_by_CRN", lambda *a, **k: SECTION_DETAIL)
        resp = client.get("/api/v1/course-sections/crn/30186")
        assert resp.status_code == 200
        assert resp.json()["course_crn"] == 30186

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_section_by_CRN", lambda *a, **k: None)
        resp = client.get("/api/v1/course-sections/crn/99999")
        assert resp.status_code == 404


class TestGetCourseSectionById:
    def test_returns_section(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_section_by_id", lambda *a, **k: SECTION_DETAIL)
        resp = client.get("/api/v1/course-sections/1")
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_section_by_id", lambda *a, **k: None)
        resp = client.get("/api/v1/course-sections/999")
        assert resp.status_code == 404


class TestEnrollUser:
    def test_enrolls_successfully(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_section_by_id", lambda *a, **k: SECTION_DETAIL)
        monkeypatch.setattr("api.routes.course_section.enroll_user_in_course_section", lambda *a, **k: True)
        resp = client.post("/api/v1/course-sections/1/enroll?user_id=1")
        assert resp.status_code == 200

    def test_returns_404_when_section_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_section_by_id", lambda *a, **k: None)
        resp = client.post("/api/v1/course-sections/999/enroll?user_id=1")
        assert resp.status_code == 404

    def test_returns_409_when_already_enrolled(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_section_by_id", lambda *a, **k: SECTION_DETAIL)
        monkeypatch.setattr("api.routes.course_section.enroll_user_in_course_section", lambda *a, **k: False)
        resp = client.post("/api/v1/course-sections/1/enroll?user_id=1")
        assert resp.status_code == 409


class TestUnenrollUser:
    def test_unenrolls_successfully(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.unenroll_user_from_course_section", lambda *a, **k: True)
        resp = client.delete("/api/v1/course-sections/1/enroll?user_id=1")
        assert resp.status_code == 200

    def test_returns_404_when_enrollment_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.unenroll_user_from_course_section", lambda *a, **k: False)
        resp = client.delete("/api/v1/course-sections/1/enroll?user_id=1")
        assert resp.status_code == 404


class TestCreateCourseSection:
    def test_creates_section(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.check_crn_exists", lambda *a, **k: False)
        monkeypatch.setattr("api.routes.course_section.create_course_section_crud", lambda *a, **k: SECTION_SIMPLE)
        resp = client.post("/api/v1/course-sections", json={"course_id": 2, "course_CRN": 30186, "professor_id": 3})
        assert resp.status_code == 201

    def test_returns_409_when_crn_exists(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.check_crn_exists", lambda *a, **k: True)
        resp = client.post("/api/v1/course-sections", json={"course_id": 2, "course_CRN": 30186, "professor_id": 3})
        assert resp.status_code == 409


class TestDeleteCourseSection:
    def test_deletes_section(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_section_by_id", lambda *a, **k: SECTION_DETAIL)
        monkeypatch.setattr("api.routes.course_section.delete_course_section_crud", lambda *a, **k: True)
        resp = client.delete("/api/v1/course-sections/1")
        assert resp.status_code == 200

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.course_section.get_course_section_by_id", lambda *a, **k: None)
        resp = client.delete("/api/v1/course-sections/999")
        assert resp.status_code == 404
