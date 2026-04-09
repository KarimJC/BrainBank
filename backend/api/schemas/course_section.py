from typing import Optional
from pydantic import BaseModel, ConfigDict


class CourseSectionCreate(BaseModel):
    course_id: int
    course_CRN: int
    professor_id: int
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "course_id": 1,  # represents the id for a class and all of its sections share the same id
                "course_CRN": 30186,  # represents CRN, a section of a class
                "professor_id": 1,  # represents the id for a professor teaching this section
            }
        }
    )


class CourseSectionUpdate(BaseModel):
    course_id: Optional[int] = None
    course_CRN: Optional[int] = None
    professor_id: Optional[int] = None
    model_config = ConfigDict(json_schema_extra={"example": {"course_CRN": 30187}})


class CourseSectionResponse(BaseModel):
    id: int
    course_id: int
    course_CRN: int
    professor_id: int
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": 100,  # database id to refer
                "course_id": 1,  # represents the id for a class and all of its sections share the same id
                "course_CRN": 30186,  # represents CRN, a section of a class
                "professor_id": 1,  # represents the id for a professor teaching this section
            }
        }
    )


class DeleteResponse(BaseModel):
    message: str
    deleted_id: int
