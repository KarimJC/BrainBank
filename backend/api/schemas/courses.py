from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CourseCreate(BaseModel):
    """Schema for creating a new course"""
    name: str
    code: str
    subject: str
    description: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "Intro to Algorithms",
                    "code": "CS3000",
                    "subject": "CS",
                    "description": "Introduction to algorithm design and analysis",
                }
            ]
        }
    )


class CourseUpdate(BaseModel):
    """Schema for updating an existing course - all fields optional"""
    name: Optional[str] = None
    code: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "Advanced Algorithms",
                }
            ]
        }
    )


class CourseResponse(BaseModel):
    """Schema for course response"""
    course_id: int
    name: str
    code: str
    subject: str
    description: Optional[str]
    created_at: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "course_id": 1,
                    "name": "Intro to Algorithms",
                    "code": "CS3000",
                    "subject": "CS",
                    "description": "Introduction to algorithm design and analysis",
                    "created_at": "2024-01-15T10:30:00"
                }
            ]
        }
    )


class CourseList(BaseModel):
    """Schema for list of courses"""
    courses: list[CourseResponse]

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "courses": [
                        {
                            "course_id": 1,
                            "name": "Intro to Algorithms",
                            "code": "CS3000",
                            "subject": "CS",
                            "description": "Introduction to algorithm design and analysis",                            "credits": 4,
                            "created_at": "2024-01-15T10:30:00"
                        },
                        {
                            "course_id": 2,
                            "name": "Data Structures",
                            "code": "CS2500",
                            "subject": "CS",
                            "description": "Fundamental data structures",
                            "created_at": "2024-01-15T11:00:00"
                        }
                    ]
                }
            ]
        }
    )


class CourseDeleteResponse(BaseModel):
    """Schema for delete confirmation"""
    message: str
    deleted_id: int
