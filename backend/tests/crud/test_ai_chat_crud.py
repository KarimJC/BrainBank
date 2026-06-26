"""Tests for db/crud/ai_chat.py."""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from tests.conftest import make_db_mock
from core.exceptions import DatabaseException
from api.schemas.ai_chat import AIChatMessageCreate


SESSION_ROW = {
    "session_id": 1,
    "user_id": 10,
    "section_id": 5,
    "created_at": datetime(2025, 1, 1),
    "last_interaction": datetime(2025, 1, 1),
}

MSG_ROW = {
    "message_id": 1,
    "session_id": 1,
    "role": "user",
    "content": "Hello",
    "timestamp": datetime(2025, 1, 1),
    "tokens_used": 0,
}


class TestGetOrCreateSession:
    def test_returns_existing_session(self):
        from db.crud.ai_chat import get_or_create_session
        db, cursor = make_db_mock(fetchone=SESSION_ROW)
        # first call returns existing session, second (update) also returns it
        cursor.fetchone.side_effect = [SESSION_ROW, SESSION_ROW]
        result = get_or_create_session(10, 5, db)
        assert result["session_id"] == 1
        db.commit.assert_called()

    def test_creates_new_session_when_none_exists(self):
        from db.crud.ai_chat import get_or_create_session
        db, cursor = make_db_mock()
        # first fetchone returns None (no existing session), second returns new session
        cursor.fetchone.side_effect = [None, SESSION_ROW]
        result = get_or_create_session(10, 5, db)
        assert result["session_id"] == 1
        db.commit.assert_called()

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.ai_chat import get_or_create_session
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_or_create_session(10, 5, db)
        db.rollback.assert_called()


class TestCreateChatMessage:
    def test_creates_and_returns(self):
        from db.crud.ai_chat import create_chat_message
        db, cursor = make_db_mock(fetchone=MSG_ROW)
        data = AIChatMessageCreate(session_id=1, role="user", content="Hello", tokens_used=0)
        result = create_chat_message(data, db)
        assert result == MSG_ROW
        db.commit.assert_called_once()

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.ai_chat import create_chat_message
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        data = AIChatMessageCreate(session_id=1, role="user", content="Error", tokens_used=0)
        with pytest.raises(DatabaseException):
            create_chat_message(data, db)
        db.rollback.assert_called()


class TestGetChatHistory:
    def test_returns_list(self):
        from db.crud.ai_chat import get_chat_history
        db, cursor = make_db_mock(fetchall=[MSG_ROW])
        result = get_chat_history(1, db)
        assert len(result) == 1

    def test_returns_empty_when_none(self):
        from db.crud.ai_chat import get_chat_history
        db, cursor = make_db_mock(fetchall=[])
        result = get_chat_history(999, db)
        assert result == []

    def test_raises_on_error(self):
        from db.crud.ai_chat import get_chat_history
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_chat_history(1, db)


class TestGetSectionContext:
    def test_returns_context_dict(self):
        from db.crud.ai_chat import get_section_context
        db, cursor = make_db_mock(fetchall=[])
        result = get_section_context(5, db)
        assert "notes" in result
        assert "documents" in result

    def test_returns_notes_and_docs(self):
        from db.crud.ai_chat import get_section_context
        note = {"title": "Note", "description": "Desc", "notes_content": "content", "date_uploaded": "2025-01-01"}
        doc = {"doc_type": "study_guide", "doc_content": "Guide", "doc_date": "2025-01-01"}
        db, cursor = make_db_mock()
        cursor.fetchall.side_effect = [[note], [doc]]
        result = get_section_context(5, db)
        assert len(result["notes"]) == 1
        assert len(result["documents"]) == 1

    def test_raises_on_error(self):
        from db.crud.ai_chat import get_section_context
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_section_context(5, db)


class TestGetCourseContext:
    def test_returns_context_dict(self):
        from db.crud.ai_chat import get_course_context
        db, cursor = make_db_mock(fetchall=[])
        result = get_course_context(5, db)
        assert "notes" in result
        assert "documents" in result

    def test_raises_on_error(self):
        from db.crud.ai_chat import get_course_context
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_course_context(5, db)


class TestDeleteChatSession:
    def test_returns_true_when_deleted(self):
        from db.crud.ai_chat import delete_chat_session
        db, cursor = make_db_mock(rowcount=1)
        result = delete_chat_session(1, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        from db.crud.ai_chat import delete_chat_session
        db, cursor = make_db_mock(rowcount=0)
        result = delete_chat_session(999, db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.ai_chat import delete_chat_session
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            delete_chat_session(1, db)
        db.rollback.assert_called()
