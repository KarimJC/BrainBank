from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date
import uuid


class DocumentResponse(BaseModel):
    doc_id: uuid.UUID
    user_id: int
    doc_type: str
    doc_content: str
    doc_date: Optional[date] = None
    course_id: Optional[int] = None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "doc_id": "550e8400-e29b-41d4-a716-446655440000",
                    "user_id": 1,
                    "doc_type": "study_guide",
                    "doc_content": "Study guide for algo",
                    "doc_date": "2026-02-23",
                    "course_id": 5
                }
            ]
        }
    )


class DocumentDeleteResponse(BaseModel):
    message: str
    deleted_id: str