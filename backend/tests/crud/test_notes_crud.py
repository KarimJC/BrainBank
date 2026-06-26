"""Tests for db/crud/notes.py — CRUD functions (not build/parse which are in unit/)."""
import pytest
from unittest.mock import MagicMock, patch
from tests.conftest import make_db_mock
from core.exceptions import DatabaseException
from api.schemas.notes import NoteCreate, NoteUpdate


NOTE_ROW = {
    "note_id": 1,
    "user_id": 1,
    "course_id": 2,
    "title": "Lecture 1",
    "description": "Intro",
    "date_uploaded": "2025-01-01",
    "notes_content": "content",
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


class TestGetNoteById:
    def test_returns_note(self):
        from db.crud.notes import get_note_by_id
        db, cursor = make_db_mock(fetchone=NOTE_ROW)
        result = get_note_by_id(1, db)
        assert result is not None
        assert result["note_id"] == 1

    def test_returns_none_when_missing(self):
        from db.crud.notes import get_note_by_id
        db, cursor = make_db_mock(fetchone=None)
        result = get_note_by_id(999, db)
        assert result is None

    def test_raises_on_error(self):
        from db.crud.notes import get_note_by_id
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_note_by_id(1, db)


class TestGetAllNotes:
    def test_returns_list(self):
        from db.crud.notes import get_all_notes
        db, cursor = make_db_mock(fetchall=[NOTE_ROW])
        result = get_all_notes(db=db)
        assert len(result) == 1

    def test_with_course_section_id_filter(self):
        from db.crud.notes import get_all_notes
        db, cursor = make_db_mock(fetchall=[NOTE_ROW])
        result = get_all_notes(course_section_id=2, db=db)
        sql = cursor.execute.call_args[0][0]
        assert "course_id" in sql.lower()

    def test_with_search_filter(self):
        from db.crud.notes import get_all_notes
        db, cursor = make_db_mock(fetchall=[NOTE_ROW])
        result = get_all_notes(search_query="lecture", db=db)
        sql = cursor.execute.call_args[0][0]
        assert "ILIKE" in sql

    def test_raises_on_error(self):
        from db.crud.notes import get_all_notes
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_all_notes(db=db)


class TestGetNotesByCourse:
    def test_returns_list(self):
        from db.crud.notes import get_notes_by_course
        db, cursor = make_db_mock(fetchall=[NOTE_ROW])
        result = get_notes_by_course(1, db=db)
        assert len(result) == 1

    def test_with_professor_filter(self):
        from db.crud.notes import get_notes_by_course
        db, cursor = make_db_mock(fetchall=[NOTE_ROW])
        result = get_notes_by_course(1, professor_id=3, db=db)
        sql = cursor.execute.call_args[0][0]
        assert "professor_id" in sql.lower()

    def test_raises_on_error(self):
        from db.crud.notes import get_notes_by_course
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_notes_by_course(1, db=db)


class TestGetAvailableCourseSections:
    def test_returns_list(self):
        from db.crud.notes import get_available_course_sections
        db, cursor = make_db_mock(fetchall=[{"course_section_id": 1, "course_code": "CS3000", "course_name": "Algo", "professor_name": "Smith"}])
        result = get_available_course_sections(db)
        assert len(result) == 1

    def test_raises_on_error(self):
        from db.crud.notes import get_available_course_sections
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_available_course_sections(db)


class TestCountNotes:
    def test_returns_count(self):
        from db.crud.notes import count_notes
        db, cursor = make_db_mock(fetchone={"count": 42})
        result = count_notes(db=db)
        assert result == 42

    def test_with_user_id_filter(self):
        from db.crud.notes import count_notes
        db, cursor = make_db_mock(fetchone={"count": 5})
        result = count_notes(user_id=1, db=db)
        sql = cursor.execute.call_args[0][0]
        assert "user_id" in sql.lower()

    def test_raises_on_error(self):
        from db.crud.notes import count_notes
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            count_notes(db=db)


class TestUpdateNote:
    def test_updates_and_returns(self):
        from db.crud.notes import update_note
        db, cursor = make_db_mock(fetchone=NOTE_ROW)
        data = NoteUpdate(title="Updated Title")
        result = update_note(1, data, None, db)
        assert result is not None

    def test_returns_none_when_no_fields_and_no_content(self):
        from db.crud.notes import update_note
        db, cursor = make_db_mock(fetchone=NOTE_ROW)
        data = NoteUpdate()
        result = update_note(1, data, None, db)
        assert result is None

    def test_returns_none_when_note_not_found(self):
        from db.crud.notes import update_note
        db, cursor = make_db_mock(fetchone=None)
        data = NoteUpdate(title="X")
        result = update_note(999, data, None, db)
        assert result is None

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.notes import update_note
        db, cursor = make_db_mock()
        # First execute (SELECT) returns, fetchone says note exists
        # Second execute (UPDATE) raises an error
        cursor.fetchone.return_value = NOTE_ROW
        cursor.execute.side_effect = [None, Exception("fail")]
        data = NoteUpdate(title="Error")
        with pytest.raises(DatabaseException):
            update_note(1, data, None, db)
        db.rollback.assert_called()


class TestDeleteNote:
    def test_returns_true_when_deleted(self):
        from db.crud.notes import delete_note
        db, cursor = make_db_mock(rowcount=1)
        result = delete_note(1, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        from db.crud.notes import delete_note
        db, cursor = make_db_mock(rowcount=0)
        result = delete_note(999, db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.notes import delete_note
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            delete_note(1, db)
        db.rollback.assert_called()


class TestCheckNoteExists:
    def test_returns_true_when_exists(self):
        from db.crud.notes import check_note_exists
        db, cursor = make_db_mock(fetchone={"exists": True})
        result = check_note_exists(1, db)
        assert result is True

    def test_returns_false_when_not_exists(self):
        from db.crud.notes import check_note_exists
        db, cursor = make_db_mock(fetchone={"exists": False})
        result = check_note_exists(999, db)
        assert result is False

    def test_raises_on_error(self):
        from db.crud.notes import check_note_exists
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            check_note_exists(1, db)
