"""Tests for db/crud/document.py."""

import pytest
from tests.conftest import make_db_mock
from core.exceptions import DatabaseException
from datetime import date
import uuid

DOC_UUID = str(uuid.uuid4())
DOC_ROW = {
    "doc_id": DOC_UUID,
    "user_id": 1,
    "doc_type": "study_guide",
    "doc_content": "Guide content here",
    "doc_date": date(2025, 1, 1),
    "course_id": 5,
}


class TestGetDocumentById:
    def test_returns_document(self):
        from db.crud.document import get_document_by_id

        db, cursor = make_db_mock(fetchone=DOC_ROW)
        result = get_document_by_id(DOC_UUID, db)
        assert result == DOC_ROW

    def test_returns_none_when_missing(self):
        from db.crud.document import get_document_by_id

        db, cursor = make_db_mock(fetchone=None)
        result = get_document_by_id("no-such-uuid", db)
        assert result is None

    def test_raises_on_error(self):
        from db.crud.document import get_document_by_id

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_document_by_id(DOC_UUID, db)


class TestGetAllDocuments:
    def test_returns_all_without_filter(self):
        from db.crud.document import get_all_documents

        db, cursor = make_db_mock(fetchall=[DOC_ROW])
        result = get_all_documents(db)
        assert len(result) == 1

    def test_with_user_id_filter(self):
        from db.crud.document import get_all_documents

        db, cursor = make_db_mock(fetchall=[DOC_ROW])
        get_all_documents(db, user_id=1)
        sql, params = cursor.execute.call_args[0]
        # WHERE clause must be present and contain the specific filter condition
        assert "WHERE" in sql
        assert "user_id = %s" in sql
        assert 1 in params

    def test_with_course_id_filter(self):
        from db.crud.document import get_all_documents

        db, cursor = make_db_mock(fetchall=[DOC_ROW])
        get_all_documents(db, course_id=5)
        sql, params = cursor.execute.call_args[0]
        assert "WHERE" in sql
        assert "course_id = %s" in sql
        assert 5 in params

    def test_with_both_filters(self):
        from db.crud.document import get_all_documents

        db, cursor = make_db_mock(fetchall=[DOC_ROW])
        get_all_documents(db, user_id=1, course_id=5)
        sql, params = cursor.execute.call_args[0]
        assert "user_id = %s" in sql
        assert "course_id = %s" in sql
        assert 1 in params
        assert 5 in params

    def test_returns_empty_list(self):
        from db.crud.document import get_all_documents

        db, cursor = make_db_mock(fetchall=[])
        result = get_all_documents(db)
        assert result == []

    def test_raises_on_error(self):
        from db.crud.document import get_all_documents

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_all_documents(db)


class TestCreateDocument:
    def test_creates_and_returns(self):
        from db.crud.document import create_document

        db, cursor = make_db_mock(fetchone=DOC_ROW)
        result = create_document(1, 5, "study_guide", "content", db)
        assert result == DOC_ROW
        db.commit.assert_called_once()

    def test_execute_uses_insert(self):
        from db.crud.document import create_document

        db, cursor = make_db_mock(fetchone=DOC_ROW)
        create_document(1, 5, "study_guide", "content", db)
        sql = cursor.execute.call_args[0][0]
        assert "INSERT" in sql.upper()

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.document import create_document

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            create_document(1, 5, "study_guide", "content", db)
        db.rollback.assert_called()


class TestDeleteDocument:
    def test_returns_true_when_deleted(self):
        from db.crud.document import delete_document

        db, cursor = make_db_mock(rowcount=1)
        result = delete_document(DOC_UUID, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        from db.crud.document import delete_document

        db, cursor = make_db_mock(rowcount=0)
        result = delete_document("no-such", db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.document import delete_document

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            delete_document(DOC_UUID, db)
        db.rollback.assert_called()
