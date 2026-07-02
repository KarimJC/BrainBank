"""Tests for db/crud/conversation.py."""

import pytest
from unittest.mock import MagicMock, patch
from tests.conftest import make_db_mock
from core.exceptions import DatabaseException


CONV_ROW = {
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


class TestCreateConversation:
    def test_creates_and_returns(self):
        from db.crud.conversation import create_conversation, get_conversation_by_id

        db, cursor = make_db_mock(fetchone={"id": 1})

        with patch("db.crud.conversation.get_conversation_by_id", return_value=CONV_ROW):
            result = create_conversation(2, 3, db)
        assert result == CONV_ROW
        db.commit.assert_called()

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.conversation import create_conversation

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            create_conversation(2, 3, db)
        db.rollback.assert_called()


class TestGetConversationById:
    def test_returns_conversation(self):
        from db.crud.conversation import get_conversation_by_id

        db, cursor = make_db_mock(fetchone=CONV_ROW)
        result = get_conversation_by_id(1, db)
        assert result == CONV_ROW

    def test_returns_none_when_missing(self):
        from db.crud.conversation import get_conversation_by_id

        db, cursor = make_db_mock(fetchone=None)
        result = get_conversation_by_id(999, db)
        assert result is None

    def test_raises_on_error(self):
        from db.crud.conversation import get_conversation_by_id

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_conversation_by_id(1, db)


class TestGetUserConversations:
    def test_returns_list(self):
        from db.crud.conversation import get_user_conversations

        db, cursor = make_db_mock(fetchall=[CONV_ROW])
        result = get_user_conversations(2, db)
        assert len(result) == 1

    def test_returns_empty_when_none(self):
        from db.crud.conversation import get_user_conversations

        db, cursor = make_db_mock(fetchall=[])
        result = get_user_conversations(999, db)
        assert result == []

    def test_raises_on_error(self):
        from db.crud.conversation import get_user_conversations

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_user_conversations(1, db)


class TestUpdateConversationStatus:
    def test_updates_and_returns(self):
        from db.crud.conversation import update_conversation_status

        with patch("db.crud.conversation.get_conversation_by_id", return_value=CONV_ROW):
            db, cursor = make_db_mock(fetchone={"id": 1})
            result = update_conversation_status(1, "accepted", None, db)
        assert result == CONV_ROW
        db.commit.assert_called()

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.conversation import update_conversation_status

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            update_conversation_status(1, "accepted", None, db)
        db.rollback.assert_called()


class TestMarkConversationRead:
    def test_executes_update(self):
        from db.crud.conversation import mark_conversation_read

        db, cursor = make_db_mock()
        mark_conversation_read(1, 2, db)
        cursor.execute.assert_called_once()
        db.commit.assert_called_once()

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.conversation import mark_conversation_read

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            mark_conversation_read(1, 2, db)
        db.rollback.assert_called()


class TestCheckConversationExists:
    def test_returns_true_when_exists(self):
        from db.crud.conversation import check_conversation_exists

        db, cursor = make_db_mock(fetchone=(True,))
        result = check_conversation_exists(1, 2, db)
        assert result is True

    def test_returns_false_when_not_exists(self):
        from db.crud.conversation import check_conversation_exists

        db, cursor = make_db_mock(fetchone=(False,))
        result = check_conversation_exists(5, 6, db)
        assert result is False

    def test_raises_on_error(self):
        from db.crud.conversation import check_conversation_exists

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            check_conversation_exists(1, 2, db)
