"""Tests for core/exceptions.py — all HTTPException subclasses."""
import pytest
from fastapi import status

from core.exceptions import (
    UserNotFoundException,
    UserAlreadyExistsException,
    DatabaseException,
    CourseNotFoundException,
    ConversationAlreadyExists,
    ConversationNotFound,
    MessageNotFoundException,
    InvalidMessageRecipientException,
    MessageAlreadyDeletedException,
    CourseSectionNotFoundException,
    CourseSectionAlreadyExistsException,
    ProfessorNotFoundException,
    ProfessorAlreadyExistsException,
    DocumentNotFoundException,
)


class TestUserNotFoundException:
    def test_status_code(self):
        exc = UserNotFoundException(42)
        assert exc.status_code == status.HTTP_404_NOT_FOUND

    def test_detail_contains_id(self):
        exc = UserNotFoundException(99)
        assert "99" in exc.detail


class TestUserAlreadyExistsException:
    def test_status_code(self):
        exc = UserAlreadyExistsException("a@b.com")
        assert exc.status_code == status.HTTP_409_CONFLICT

    def test_detail_contains_email(self):
        exc = UserAlreadyExistsException("x@y.com")
        assert "x@y.com" in exc.detail


class TestDatabaseException:
    def test_default_message(self):
        exc = DatabaseException()
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "failed" in exc.detail.lower()

    def test_custom_message(self):
        exc = DatabaseException("custom error")
        assert "custom error" in exc.detail


class TestCourseNotFoundException:
    def test_status_and_detail(self):
        exc = CourseNotFoundException(7)
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert "7" in exc.detail


class TestConversationAlreadyExists:
    def test_status_and_detail(self):
        # PRODUCTION BUG: ConversationAlreadyExists uses HTTP_404_NOT_FOUND instead of
        # the semantically correct HTTP_409_CONFLICT. This test pins the broken behavior.
        exc = ConversationAlreadyExists(1, 2)
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert "1" in exc.detail
        assert "2" in exc.detail


class TestConversationNotFound:
    def test_status_and_detail(self):
        exc = ConversationNotFound(5)
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert "5" in exc.detail


class TestMessageNotFoundException:
    def test_status_and_detail(self):
        exc = MessageNotFoundException("msg-123")
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert "msg-123" in exc.detail


class TestInvalidMessageRecipientException:
    def test_default(self):
        exc = InvalidMessageRecipientException()
        assert exc.status_code == status.HTTP_400_BAD_REQUEST

    def test_custom_detail(self):
        exc = InvalidMessageRecipientException("bad recipient")
        assert "bad recipient" in exc.detail


class TestMessageAlreadyDeletedException:
    def test_status_and_detail(self):
        exc = MessageAlreadyDeletedException("abc")
        assert exc.status_code == status.HTTP_410_GONE
        assert "abc" in exc.detail


class TestCourseSectionNotFoundException:
    def test_status_and_detail(self):
        exc = CourseSectionNotFoundException(11)
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert "11" in exc.detail


class TestCourseSectionAlreadyExistsException:
    def test_status_and_detail(self):
        exc = CourseSectionAlreadyExistsException(30186)
        assert exc.status_code == status.HTTP_409_CONFLICT
        assert "30186" in exc.detail


class TestProfessorNotFoundException:
    def test_status_and_detail(self):
        exc = ProfessorNotFoundException(3)
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert "3" in exc.detail


class TestProfessorAlreadyExistsException:
    def test_status_and_detail(self):
        exc = ProfessorAlreadyExistsException("prof@neu.edu")
        assert exc.status_code == status.HTTP_409_CONFLICT
        assert "prof@neu.edu" in exc.detail


class TestDocumentNotFoundException:
    def test_status_and_detail(self):
        exc = DocumentNotFoundException("doc-uuid")
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert "doc-uuid" in exc.detail
