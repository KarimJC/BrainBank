"""
Tests for api/routes/notes.py — GET and DELETE endpoints only.
POST (create) and PUT (update) are NOT tested — see tests/TODO.md.
"""
import pytest


NOTE_DATA = {
    "note_id": 1,
    "title": "Lecture 1",
    "description": "Intro lecture",
    "date_uploaded": "2025-01-01",
    "notes_content": "content here",
    "attachments": [],
    "course_section_id": 2,
    "course_code": "CS3000",
    "course_name": "Algorithms",
    "professor_name": "Dr. Smith",
    "uploader_name": "Alice Smith",
    "media_url": None,
    "file_url": None,
    "file_name": None,
    "file_size": None,
}

USER_DATA = {
    "user_id": 1,
    "auth_id": "test-auth-id",
    "neu_email": "test@northeastern.edu",
    "first_name": "Alice",
    "last_name": "Smith",
    "profile_picture": None,
}


class TestGetAvailableCourseSections:
    def test_returns_sections(self, client, monkeypatch):
        sections = [{"course_section_id": 1, "course_code": "CS3000", "course_name": "Algo", "professor_name": "Smith"}]
        monkeypatch.setattr("api.routes.notes.get_available_course_sections", lambda *a, **k: sections)
        resp = client.get("/api/v1/notes/course-sections")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_returns_empty_list(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_available_course_sections", lambda *a, **k: [])
        resp = client.get("/api/v1/notes/course-sections")
        assert resp.status_code == 200
        assert resp.json() == []


class TestCountNotes:
    def test_returns_count(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.notes.count_notes", lambda **k: 42)
        resp = client.get("/api/v1/notes/count")
        assert resp.status_code == 200
        assert resp.json()["count"] == 42

    def test_returns_500_when_user_not_found(self, client, monkeypatch):
        # PRODUCTION BUG: count_notes_endpoint raises HTTPException(404) when user is
        # missing, but the outer `except Exception` handler catches it (HTTPException IS
        # an Exception) and wraps it in a new HTTPException(500). So the real behavior
        # is always 500, never 404.
        monkeypatch.setattr("api.routes.notes.get_user_by_auth_id", lambda *a, **k: None)
        resp = client.get("/api/v1/notes/count")
        assert resp.status_code == 500


class TestGetNotesByCourse:
    def test_returns_notes(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_notes_by_course", lambda *a, **k: [NOTE_DATA])
        resp = client.get("/api/v1/notes/course/1")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_returns_empty_list(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_notes_by_course", lambda *a, **k: [])
        resp = client.get("/api/v1/notes/course/1")
        assert resp.status_code == 200
        assert resp.json() == []


class TestGetNotesByCourseSection:
    def test_returns_notes(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_notes_by_course_section", lambda *a, **k: [NOTE_DATA])
        resp = client.get("/api/v1/notes/course-section/2")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_returns_empty_list(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_notes_by_course_section", lambda *a, **k: [])
        resp = client.get("/api/v1/notes/course-section/999")
        assert resp.status_code == 200
        assert resp.json() == []


class TestGetNotes:
    def test_returns_all_notes(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.notes.get_all_notes", lambda **k: [NOTE_DATA])
        resp = client.get("/api/v1/notes")
        assert resp.status_code == 200

    def test_returns_500_when_user_not_found(self, client, monkeypatch):
        # PRODUCTION BUG: get_notes_endpoint raises HTTPException(404) when user is
        # missing, but the outer `except Exception` handler catches it (HTTPException IS
        # an Exception) and wraps it in a new HTTPException(500). So the real behavior
        # is always 500, never 404.
        monkeypatch.setattr("api.routes.notes.get_user_by_auth_id", lambda *a, **k: None)
        resp = client.get("/api/v1/notes")
        assert resp.status_code == 500


class TestGetNoteById:
    def test_returns_note(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_note_by_id", lambda *a, **k: NOTE_DATA)
        resp = client.get("/api/v1/notes/1")
        assert resp.status_code == 200
        assert resp.json()["noteId"] == 1

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_note_by_id", lambda *a, **k: None)
        resp = client.get("/api/v1/notes/999")
        assert resp.status_code == 404


class TestDeleteNote:
    def test_deletes_note_without_files(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_note_by_id", lambda *a, **k: NOTE_DATA)
        monkeypatch.setattr("api.routes.notes.delete_note", lambda *a, **k: True)
        monkeypatch.setattr("api.routes.notes.delete_file", lambda *a, **k: None)
        resp = client.delete("/api/v1/notes/1")
        assert resp.status_code == 200

    def test_deletes_note_with_media_and_file(self, client, monkeypatch):
        note_with_files = {
            **NOTE_DATA,
            "media_url": "http://example.com/img.png",
            "file_url": "http://example.com/doc.pdf",
        }
        deleted_files = []
        monkeypatch.setattr("api.routes.notes.get_note_by_id", lambda *a, **k: note_with_files)
        monkeypatch.setattr("api.routes.notes.delete_note", lambda *a, **k: True)
        monkeypatch.setattr("api.routes.notes.delete_file", lambda path: deleted_files.append(path))
        resp = client.delete("/api/v1/notes/1")
        assert resp.status_code == 200
        assert len(deleted_files) == 2

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_note_by_id", lambda *a, **k: None)
        resp = client.delete("/api/v1/notes/999")
        assert resp.status_code == 404

    def test_returns_500_when_delete_fails(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.notes.get_note_by_id", lambda *a, **k: NOTE_DATA)
        monkeypatch.setattr("api.routes.notes.delete_note", lambda *a, **k: False)
        monkeypatch.setattr("api.routes.notes.delete_file", lambda *a, **k: None)
        resp = client.delete("/api/v1/notes/1")
        assert resp.status_code == 500


class TestValidateUpload:
    """Unit tests for the validate_upload helper (pure function in api/routes/notes.py)."""

    def _make_file_mock(self, content_type):
        from unittest.mock import MagicMock
        f = MagicMock()
        f.content_type = content_type
        f.filename = "test.jpg"
        return f

    def test_valid_jpeg_passes(self):
        from api.routes.notes import validate_upload
        from fastapi import HTTPException
        f = self._make_file_mock("image/jpeg")
        data = b"x" * 100
        validate_upload(f, data)  # should not raise

    def test_invalid_content_type_raises_400(self):
        from api.routes.notes import validate_upload
        from fastapi import HTTPException
        f = self._make_file_mock("text/plain")
        with pytest.raises(HTTPException) as exc_info:
            validate_upload(f, b"data")
        assert exc_info.value.status_code == 400

    def test_file_too_large_raises_400(self):
        from api.routes.notes import validate_upload
        from fastapi import HTTPException
        f = self._make_file_mock("image/png")
        big_data = b"x" * (10 * 1024 * 1024 + 1)  # 1 byte over 10 MB limit
        with pytest.raises(HTTPException) as exc_info:
            validate_upload(f, big_data)
        assert exc_info.value.status_code == 400
        assert "10MB" in exc_info.value.detail

    def test_pdf_passes(self):
        from api.routes.notes import validate_upload
        f = self._make_file_mock("application/pdf")
        validate_upload(f, b"%PDF-fake")  # should not raise
