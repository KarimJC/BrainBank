"""Pydantic schema validation tests."""

import pytest
from datetime import datetime
from uuid import UUID
import uuid

from api.schemas.user import UserUpdate, UserResponse, DeleteResponse as UserDeleteResponse
from api.schemas.courses import CourseCreate, CourseUpdate, CourseResponse, CourseList
from api.schemas.notes import NoteCreate, NoteUpdate, NoteResponse, DeleteResponse as NoteDeleteResponse
from api.schemas.message import MessageCreate, MessageUpdate, MessageResponse, MessageDeleteResponse
from api.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationResponse, ConversationStatus
from api.schemas.ai_chat import ChatRequest, ChatResponse, AIChatMessageCreate
from api.schemas.professor import ProfessorCreate, ProfessorUpdate, ProfessorResponse
from api.schemas.course_section import CourseSectionCreate, CourseSectionUpdate, CourseSectionResponse
from api.schemas.document import DocumentResponse, DocumentDeleteResponse


# ── User Schemas ──────────────────────────────────────────────────────────────


class TestUserUpdate:
    def test_all_optional(self):
        u = UserUpdate()
        assert u.first_name is None

    def test_partial_update(self):
        u = UserUpdate(first_name="Alice")
        assert u.first_name == "Alice"
        assert u.last_name is None


class TestUserResponse:
    def test_valid(self):
        u = UserResponse(user_id=1, auth_id="uuid-abc", neu_email="a@neu.edu", first_name="Alice", last_name="Smith")
        assert u.user_id == 1
        assert u.auth_id == "uuid-abc"

    def test_optional_fields_default_none(self):
        u = UserResponse(user_id=2, auth_id="x", neu_email="b@neu.edu")
        assert u.first_name is None
        assert u.profile_picture is None


class TestUserDeleteResponse:
    def test_valid(self):
        d = UserDeleteResponse(message="deleted", deleted_id=5)
        assert d.deleted_id == 5


# ── Course Schemas ────────────────────────────────────────────────────────────


class TestCourseCreate:
    def test_valid(self):
        c = CourseCreate(course="CS3000", title="Intro to Algo", subject="CS")
        assert c.course == "CS3000"

    def test_missing_field_raises(self):
        with pytest.raises(Exception):
            CourseCreate(course="CS3000")


class TestCourseUpdate:
    def test_all_optional(self):
        c = CourseUpdate()
        assert c.course is None

    def test_partial(self):
        c = CourseUpdate(course="CS4000")
        assert c.course == "CS4000"


class TestCourseResponse:
    def test_valid(self):
        c = CourseResponse(id=1, course="CS3000", title="Intro", subject="CS")
        assert c.id == 1


class TestCourseList:
    def test_empty(self):
        cl = CourseList(courses=[])
        assert cl.courses == []

    def test_with_courses(self):
        cr = CourseResponse(id=1, course="CS3000", title="Intro", subject="CS")
        cl = CourseList(courses=[cr])
        assert len(cl.courses) == 1


# ── Notes Schemas ─────────────────────────────────────────────────────────────


class TestNoteCreate:
    def test_valid(self):
        n = NoteCreate(title="Lecture 1", date="2025-01-01", courseSectionId=1)
        assert n.title == "Lecture 1"

    def test_future_date_raises(self):
        with pytest.raises(Exception):
            NoteCreate(title="Test", date="2099-01-01", courseSectionId=1)

    def test_empty_title_raises(self):
        with pytest.raises(Exception):
            NoteCreate(title="   ", date="2025-01-01", courseSectionId=1)

    def test_invalid_date_format_raises(self):
        with pytest.raises(Exception):
            NoteCreate(title="Test", date="01-01-2025", courseSectionId=1)


class TestNoteUpdate:
    def test_all_optional(self):
        n = NoteUpdate()
        assert n.title is None

    def test_valid_partial(self):
        n = NoteUpdate(title="Updated")
        assert n.title == "Updated"

    def test_future_date_raises(self):
        with pytest.raises(Exception):
            NoteUpdate(date="2099-01-01")

    def test_invalid_date_format_raises(self):
        with pytest.raises(Exception):
            NoteUpdate(date="01-01-2025")

    def test_none_date_is_valid(self):
        n = NoteUpdate(date=None)
        assert n.date is None

    def test_negative_course_section_id_raises(self):
        with pytest.raises(Exception):
            NoteUpdate(courseSectionId=0)


class TestNoteResponse:
    def test_valid(self):
        n = NoteResponse(
            noteId=1,
            title="T",
            description=None,
            dateUploaded="2025-01-01",
            courseSectionId=1,
            courseCode="CS3000",
            courseName="Algo",
            professorName="Smith",
            uploaderName="Alice",
        )
        assert n.noteId == 1


# ── Message Schemas ───────────────────────────────────────────────────────────


class TestMessageCreate:
    def test_valid(self):
        m = MessageCreate(conversation_id=1, content="Hello!")
        assert m.content == "Hello!"


class TestMessageUpdate:
    def test_optional(self):
        m = MessageUpdate()
        assert m.content is None


class TestMessageResponse:
    def test_valid(self):
        m = MessageResponse(
            message_id=uuid.uuid4(),
            sender_id=1,
            content="Hi",
            created_at=datetime.now(),
            conversation_id=2,
        )
        assert isinstance(m.message_id, UUID)


class TestMessageDeleteResponse:
    def test_valid(self):
        d = MessageDeleteResponse(message="deleted", deleted_id="abc")
        assert d.deleted_id == "abc"


# ── Conversation Schemas ──────────────────────────────────────────────────────


class TestConversationCreate:
    def test_valid(self):
        c = ConversationCreate(recipient_id=5)
        assert c.recipient_id == 5


class TestConversationStatus:
    def test_all_values(self):
        assert ConversationStatus.accepted.value == "accepted"
        assert ConversationStatus.declined.value == "declined"
        assert ConversationStatus.blocked.value == "blocked"


class TestConversationUpdate:
    def test_valid(self):
        c = ConversationUpdate(status=ConversationStatus.accepted)
        assert c.status == ConversationStatus.accepted


class TestConversationResponse:
    def test_valid(self):
        cr = ConversationResponse(
            conversation_id=1,
            initiator_id=2,
            recipient_id=3,
            status="pending",
            created_at=datetime.now(),
            initiator_name="Alice Smith",
            recipient_name="Bob Jones",
        )
        assert cr.unread_count == 0


# ── AI Chat Schemas ───────────────────────────────────────────────────────────


class TestChatRequest:
    def test_valid(self):
        r = ChatRequest(user_id=1, section_id=2, message="Help me")
        assert r.use_all_sections is False

    def test_empty_message_raises(self):
        with pytest.raises(Exception):
            ChatRequest(user_id=1, section_id=2, message="")


class TestAIChatMessageCreate:
    def test_user_role(self):
        m = AIChatMessageCreate(session_id=1, role="user", content="Hello")
        assert m.role == "user"

    def test_assistant_role(self):
        m = AIChatMessageCreate(session_id=1, role="assistant", content="Response")
        assert m.role == "assistant"

    def test_invalid_role_raises(self):
        with pytest.raises(Exception):
            AIChatMessageCreate(session_id=1, role="admin", content="X")


# ── Professor Schemas ─────────────────────────────────────────────────────────


class TestProfessorCreate:
    def test_valid(self):
        p = ProfessorCreate(name="Dr. Smith", email="smith@neu.edu")
        assert p.name == "Dr. Smith"


class TestProfessorUpdate:
    def test_all_optional(self):
        p = ProfessorUpdate()
        assert p.name is None


class TestProfessorResponse:
    def test_valid(self):
        p = ProfessorResponse(professor_id=1, name="Dr. Smith", email="smith@neu.edu")
        assert p.professor_id == 1


# ── Course Section Schemas ────────────────────────────────────────────────────


class TestCourseSectionCreate:
    def test_valid(self):
        cs = CourseSectionCreate(course_id=1, course_CRN=30186, professor_id=1)
        assert cs.course_CRN == 30186


class TestCourseSectionUpdate:
    def test_all_optional(self):
        cs = CourseSectionUpdate()
        assert cs.course_id is None


class TestCourseSectionResponse:
    def test_valid(self):
        cs = CourseSectionResponse(id=1, course_id=2, course_CRN=30186, professor_id=3)
        assert cs.id == 1


# ── Document Schemas ──────────────────────────────────────────────────────────


class TestDocumentResponse:
    def test_valid(self):
        d = DocumentResponse(
            doc_id=uuid.uuid4(),
            user_id=1,
            doc_type="study_guide",
            doc_content="content here",
        )
        assert isinstance(d.doc_id, UUID)

    def test_optional_fields(self):
        d = DocumentResponse(doc_id=uuid.uuid4(), user_id=1, doc_type="summary", doc_content="x")
        assert d.doc_date is None
        assert d.course_id is None


class TestDocumentDeleteResponse:
    def test_valid(self):
        d = DocumentDeleteResponse(message="deleted", deleted_id="doc-uuid")
        assert d.deleted_id == "doc-uuid"
