from api.schemas.user import UserCreate, UserUpdate, UserResponse, DeleteResponse

from .professor import (ProfessorCreate, ProfessorUpdate, Professor)

__all__ = [

    # "PaginationParams",
    # "PaginatedResponse"
    "ProfessorCreate",
    "ProfessorUpdate",
    "Professor",
    "UserCreate",
    "UserUpdate", 
    "UserResponse",
    "DeleteResponse"
]