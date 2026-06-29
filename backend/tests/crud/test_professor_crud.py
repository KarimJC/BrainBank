"""Tests for db/crud/professor.py."""

import pytest
from tests.conftest import make_db_mock
from core.exceptions import DatabaseException
from api.schemas.professor import ProfessorCreate, ProfessorUpdate


PROF_ROW = {"professor_id": 1, "name": "Dr. Smith", "email": "smith@neu.edu"}


class TestCreateProfessor:
    def test_creates_and_returns(self):
        from db.crud.professor import create_professor

        db, cursor = make_db_mock(fetchone=PROF_ROW)
        data = ProfessorCreate(name="Dr. Smith", email="smith@neu.edu")
        result = create_professor(data, db)
        assert result == PROF_ROW
        db.commit.assert_called_once()

    def test_execute_uses_insert(self):
        from db.crud.professor import create_professor

        db, cursor = make_db_mock(fetchone=PROF_ROW)
        data = ProfessorCreate(name="Dr. Smith", email="smith@neu.edu")
        create_professor(data, db)
        sql = cursor.execute.call_args[0][0]
        assert "INSERT" in sql

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.professor import create_professor

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        data = ProfessorCreate(name="Dr. Smith", email="smith@neu.edu")
        with pytest.raises(DatabaseException):
            create_professor(data, db)
        db.rollback.assert_called()


class TestGetProfessorById:
    def test_returns_professor(self):
        from db.crud.professor import get_professor_by_id

        db, cursor = make_db_mock(fetchone=PROF_ROW)
        result = get_professor_by_id(1, db)
        assert result == PROF_ROW

    def test_returns_none_when_missing(self):
        from db.crud.professor import get_professor_by_id

        db, cursor = make_db_mock(fetchone=None)
        result = get_professor_by_id(999, db)
        assert result is None

    def test_raises_on_error(self):
        from db.crud.professor import get_professor_by_id

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_professor_by_id(1, db)


class TestUpdateProfessor:
    def test_updates_and_returns(self):
        from db.crud.professor import update_professor

        db, cursor = make_db_mock(fetchone=PROF_ROW)
        data = ProfessorUpdate(name="Dr. Updated")
        result = update_professor(1, data, db)
        assert result == PROF_ROW
        db.commit.assert_called_once()

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.professor import update_professor

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        data = ProfessorUpdate(name="Error")
        with pytest.raises(DatabaseException):
            update_professor(1, data, db)
        db.rollback.assert_called()


class TestDeleteProfessor:
    def test_returns_true_when_deleted(self):
        from db.crud.professor import delete_professor

        db, cursor = make_db_mock(rowcount=1)
        result = delete_professor(1, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        from db.crud.professor import delete_professor

        db, cursor = make_db_mock(rowcount=0)
        result = delete_professor(999, db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.professor import delete_professor

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            delete_professor(1, db)
        db.rollback.assert_called()


class TestCheckProfessorEmailExists:
    def test_returns_true_when_exists(self):
        from db.crud.professor import check_professor_email_exists

        db, cursor = make_db_mock(fetchone=(True,))
        result = check_professor_email_exists("exists@neu.edu", db)
        assert result is True

    def test_returns_false_when_not_exists(self):
        from db.crud.professor import check_professor_email_exists

        db, cursor = make_db_mock(fetchone=(False,))
        result = check_professor_email_exists("new@neu.edu", db)
        assert result is False

    def test_raises_on_error(self):
        from db.crud.professor import check_professor_email_exists

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            check_professor_email_exists("x@y.com", db)
