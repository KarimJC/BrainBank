
# Example
# from .common import (
#     PaginationParams,      -- these would be pydantic models from the common.py file in the schemas folder
#     PaginatedResponse
# )

from .professors import (ProfessorCreate, ProfessorUpdate, Professor)

__all__ = [

    # "PaginationParams",
    # "PaginatedResponse"
    "ProfessorCreate",
    "ProfessorUpdate",
    "Professor"
]