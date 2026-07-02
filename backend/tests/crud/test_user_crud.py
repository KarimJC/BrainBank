"""Tests for db/crud/user.py."""

import pytest
from unittest.mock import MagicMock, call
from tests.conftest import make_db_mock
from core.exceptions import DatabaseException
from api.schemas.user import UserUpdate


USER_ROW = {
    "user_id": 1,
    "auth_id": "auth-abc",
    "neu_email": "a@neu.edu",
    "first_name": "Alice",
    "last_name": "Smith",
    "profile_picture": None,
}


class TestGetUserById:
    def test_returns_user_dict(self):
        from db.crud.user import get_user_by_id

        db, cursor = make_db_mock(fetchone=USER_ROW)
        result = get_user_by_id(1, db)
        assert result == USER_ROW

    def test_returns_none_when_not_found(self):
        from db.crud.user import get_user_by_id

        db, cursor = make_db_mock(fetchone=None)
        result = get_user_by_id(999, db)
        assert result is None

    def test_raises_database_exception_on_error(self):
        from db.crud.user import get_user_by_id

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("db error")
        with pytest.raises(DatabaseException):
            get_user_by_id(1, db)


class TestGetUserByAuthId:
    def test_returns_user_dict(self):
        from db.crud.user import get_user_by_auth_id

        db, cursor = make_db_mock(fetchone=USER_ROW)
        result = get_user_by_auth_id("auth-abc", db)
        assert result == USER_ROW

    def test_returns_none_when_not_found(self):
        from db.crud.user import get_user_by_auth_id

        db, cursor = make_db_mock(fetchone=None)
        result = get_user_by_auth_id("no-such-auth", db)
        assert result is None

    def test_raises_database_exception_on_error(self):
        from db.crud.user import get_user_by_auth_id

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_user_by_auth_id("auth-id", db)


class TestUpdateUser:
    def test_updates_first_name(self):
        from db.crud.user import update_user

        db, cursor = make_db_mock(fetchone=USER_ROW)
        user_data = UserUpdate(first_name="Bob")
        result = update_user(1, user_data, db)
        assert result == USER_ROW
        db.commit.assert_called_once()

    def test_no_fields_returns_current_user(self):
        from db.crud.user import update_user

        db, cursor = make_db_mock(fetchone=USER_ROW)
        user_data = UserUpdate()
        result = update_user(1, user_data, db)
        # Should call get_user_by_id which fetches fetchone
        assert result is not None

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.user import update_user

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        user_data = UserUpdate(first_name="Error")
        with pytest.raises(DatabaseException):
            update_user(1, user_data, db)
        db.rollback.assert_called()


class TestUpdateUserByAuthId:
    def test_updates_and_commits(self):
        from db.crud.user import update_user_by_auth_id

        db, cursor = make_db_mock(fetchone=USER_ROW)
        user_data = UserUpdate(last_name="Updated")
        result = update_user_by_auth_id("auth-abc", user_data, db)
        assert result == USER_ROW
        db.commit.assert_called_once()

    def test_no_fields_returns_current(self):
        from db.crud.user import update_user_by_auth_id

        db, cursor = make_db_mock(fetchone=USER_ROW)
        user_data = UserUpdate()
        result = update_user_by_auth_id("auth-abc", user_data, db)
        assert result is not None

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.user import update_user_by_auth_id

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        user_data = UserUpdate(first_name="Error")
        with pytest.raises(DatabaseException):
            update_user_by_auth_id("auth-abc", user_data, db)
        db.rollback.assert_called()


class TestDeleteUser:
    def test_returns_true_when_deleted(self):
        from db.crud.user import delete_user

        db, cursor = make_db_mock(rowcount=1)
        result = delete_user(1, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        from db.crud.user import delete_user

        db, cursor = make_db_mock(rowcount=0)
        result = delete_user(999, db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.user import delete_user

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            delete_user(1, db)
        db.rollback.assert_called()


class TestCheckEmailExists:
    def test_returns_true_when_exists(self):
        from db.crud.user import check_email_exists

        db, cursor = make_db_mock(fetchone=(True,))
        result = check_email_exists("a@neu.edu", db)
        assert result is True

    def test_returns_false_when_not_exists(self):
        from db.crud.user import check_email_exists

        db, cursor = make_db_mock(fetchone=(False,))
        result = check_email_exists("new@neu.edu", db)
        assert result is False

    def test_raises_database_exception_on_error(self):
        from db.crud.user import check_email_exists

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            check_email_exists("a@neu.edu", db)
