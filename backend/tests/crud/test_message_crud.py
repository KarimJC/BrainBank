"""Tests for db/crud/message.py."""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from tests.conftest import make_db_mock
from core.exceptions import DatabaseException
from api.schemas.message import MessageCreate, MessageUpdate
import uuid


MSG_UUID = str(uuid.uuid4())
MSG_ROW = {
    "message_id": MSG_UUID,
    "sender_id": 1,
    "content": "Hello!",
    "created_at": datetime(2025, 1, 1, 12, 0, 0),
    "conversation_id": 2,
}


class TestCheckUserExists:
    def test_returns_true_when_exists(self):
        from db.crud.message import check_user_exists
        db, cursor = make_db_mock(fetchone=(True,))
        result = check_user_exists(1, db)
        assert result is True

    def test_returns_false_when_not_exists(self):
        from db.crud.message import check_user_exists
        db, cursor = make_db_mock(fetchone=(False,))
        result = check_user_exists(999, db)
        assert result is False

    def test_raises_on_error(self):
        from db.crud.message import check_user_exists
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            check_user_exists(1, db)


class TestCreateMessage:
    def test_creates_and_returns(self):
        from db.crud.message import create_message
        db, cursor = make_db_mock(fetchone=MSG_ROW)
        # check_user_exists will also call fetchone; set it up to return (True,) first
        call_count = [0]

        def side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return (True,)
            return MSG_ROW

        cursor.fetchone.side_effect = side_effect

        data = MessageCreate(conversation_id=2, content="Hello!")
        result = create_message(data, sender_id=1, db=db)
        assert result == MSG_ROW
        db.commit.assert_called_once()

    def test_raises_when_user_not_exists(self):
        from db.crud.message import create_message
        from core.exceptions import UserNotFoundException
        db, cursor = make_db_mock(fetchone=(False,))
        data = MessageCreate(conversation_id=2, content="Hi")
        with pytest.raises(Exception):
            create_message(data, sender_id=999, db=db)

    def test_raises_on_db_error(self):
        from db.crud.message import create_message
        db, cursor = make_db_mock()
        cursor.fetchone.return_value = (True,)
        cursor.execute.side_effect = [None, Exception("fail")]
        data = MessageCreate(conversation_id=2, content="Hi")
        with pytest.raises(DatabaseException):
            create_message(data, sender_id=1, db=db)
        db.rollback.assert_called()


class TestGetMessageById:
    def test_returns_message(self):
        from db.crud.message import get_message_by_id
        db, cursor = make_db_mock(fetchone=MSG_ROW)
        result = get_message_by_id(MSG_UUID, db)
        assert result == MSG_ROW

    def test_returns_none_when_missing(self):
        from db.crud.message import get_message_by_id
        db, cursor = make_db_mock(fetchone=None)
        result = get_message_by_id("no-such-id", db)
        assert result is None

    def test_raises_on_error(self):
        from db.crud.message import get_message_by_id
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_message_by_id(MSG_UUID, db)


class TestGetMessagesBetweenUsers:
    def test_returns_list(self):
        from db.crud.message import get_messages_between_users
        db, cursor = make_db_mock(fetchall=[MSG_ROW])
        result = get_messages_between_users(2, db)
        assert len(result) == 1

    def test_returns_empty_list(self):
        from db.crud.message import get_messages_between_users
        db, cursor = make_db_mock(fetchall=[])
        result = get_messages_between_users(999, db)
        assert result == []

    def test_raises_on_error(self):
        from db.crud.message import get_messages_between_users
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_messages_between_users(2, db)


class TestGetMessagesPaginated:
    def test_returns_paginated_structure(self):
        from db.crud.message import get_messages_paginated
        db, cursor = make_db_mock(fetchall=[MSG_ROW])
        result = get_messages_paginated(2, 50, None, db)
        assert "messages" in result
        assert "has_more" in result
        assert "next_cursor" in result

    def test_has_more_false_when_below_limit(self):
        from db.crud.message import get_messages_paginated
        db, cursor = make_db_mock(fetchall=[MSG_ROW])
        result = get_messages_paginated(2, 50, None, db)
        assert result["has_more"] is False

    def test_with_before_cursor(self):
        from db.crud.message import get_messages_paginated
        db, cursor = make_db_mock(fetchall=[MSG_ROW])
        get_messages_paginated(2, 50, "2025-01-01T12:00:00", db)
        sql, params = cursor.execute.call_args[0]
        # With a before cursor, the WHERE clause must filter on created_at < %s
        assert "created_at < %s" in sql
        # The timestamp cursor value must appear in the params
        assert "2025-01-01T12:00:00" in params

    def test_raises_on_error(self):
        from db.crud.message import get_messages_paginated
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_messages_paginated(2, 50, None, db)


class TestUpdateMessage:
    def test_updates_and_returns(self):
        from db.crud.message import update_message
        db, cursor = make_db_mock(fetchone=MSG_ROW)
        data = MessageUpdate(content="Updated!")
        result = update_message(MSG_UUID, data, db)
        assert result == MSG_ROW
        db.commit.assert_called_once()

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.message import update_message
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        data = MessageUpdate(content="Error")
        with pytest.raises(DatabaseException):
            update_message(MSG_UUID, data, db)
        db.rollback.assert_called()


class TestDeleteMessage:
    def test_returns_true_when_deleted(self):
        from db.crud.message import delete_message
        db, cursor = make_db_mock(rowcount=1)
        result = delete_message(MSG_UUID, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        from db.crud.message import delete_message
        db, cursor = make_db_mock(rowcount=0)
        result = delete_message("no-id", db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.message import delete_message
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            delete_message(MSG_UUID, db)
        db.rollback.assert_called()
