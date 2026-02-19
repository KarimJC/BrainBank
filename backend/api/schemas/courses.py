from pydantic import BaseModel, ConfigDict
from typing import Optional

class CourseCreate(BaseModel):
    """Schema for creating a new course"""
    course: str
    title: str
    subject: str

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "course": "Intro to Algorithms",
                    "title": "CS3000",
                    "subject": "CS",
                }
            ]
        }
    )

class CourseUpdate(BaseModel):
    """Schema for updating an existing course - all fields optional"""
    course: Optional[str] = None
    title: Optional[str] = None
    subject: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "course": "Advanced Algorithms",
                }
            ]
        }
    )

class CourseResponse(BaseModel):
    """Schema for course response"""
    id: int
    course: str
    title: str
    subject: str

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "id": 1,
                    "course": "Intro to Algorithms",
                    "title": "CS3000",
                    "subject": "CS",
                }
            ]
        }
    )


class CourseList(BaseModel):
    courses: list[CourseResponse]

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "courses": [
                        {
                            "id": 1,
                            "course": "Intro to Algorithms",
                            "title": "CS3000",
                            "subject": "CS",
                        },
                        {
                            "id": 2,
                            "course": "Data Structures",
                            "title": "CS2500",
                            "subject": "CS",
                        }
                    ]
                }
            ]
        }
    )


class CourseDeleteResponse(BaseModel):
    message: str
    deleted_id: int

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Successfully deleted course 1",
                "deleted_id": 1
            }
        }
    }
