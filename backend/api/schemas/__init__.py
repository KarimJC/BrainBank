from api.schemas.user import UserUpdate, UserResponse, DeleteResponse
from api.schemas.courses import CourseCreate, CourseUpdate, CourseResponse, CourseList, CourseDeleteResponse
from api.schemas.message import MessageCreate, MessageUpdate, MessageResponse, MessageDeleteResponse

from .professor import (ProfessorCreate, ProfessorUpdate, ProfessorResponse, DeleteResponse)

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
    "DeleteResponse",
    "CourseCreate",
    "CourseUpdate",
    "CourseResponse",
    "CourseList",
    "CourseDeleteResponse",
    "MessageCreate",
    "MessageUpdate",
    "MessageResponse",
    "MessageDeleteResponse",
]