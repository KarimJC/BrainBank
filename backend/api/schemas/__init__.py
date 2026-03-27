from api.schemas.user import UserUpdate, UserResponse, DeleteResponse
from api.schemas.courses import CourseCreate, CourseUpdate, CourseResponse, CourseList, CourseDeleteResponse
from api.schemas.message import MessageCreate, MessageUpdate, MessageResponse, MessageDeleteResponse
from api.schemas.professor import ProfessorCreate, ProfessorUpdate, ProfessorResponse, ProfessorDeleteResponse
from api.schemas.conversation import ConversationCreate,ConversationUpdate,ConversationResponse
from api.schemas.document import DocumentResponse, DocumentDeleteResponse

__all__ = [

    # "PaginationParams",
    # "PaginatedResponse"
    "ProfessorCreate",
    "ProfessorUpdate",
    "ProfessorResponse",
    "DeleteResponse",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "ProfessorDeleteResponse",
    "CourseCreate",
    "CourseUpdate",
    "CourseResponse",
    "CourseList",
    "CourseDeleteResponse",
    "MessageCreate",
    "MessageUpdate",
    "MessageResponse",
    "MessageDeleteResponse",
    "ConversationCreate",
    "ConversationUpdate",
    "ConversationResponse",
    "DocumentResponse",
    "DocumentDeleteResponse",
]
