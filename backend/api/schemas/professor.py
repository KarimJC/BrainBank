from typing import Optional
from pydantic import BaseModel, ConfigDict

class ProfessorCreate(BaseModel):
    name: str
    subject: str
    neu_email: str
    password: str
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "Dr. Jane Smith",
                    "subject": "Computer Science",
                    "neu_email": "j.smith@northeastern.edu",
                    "password": "password123"
                }
            ]
        }
    )


class ProfessorUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    neu_email: Optional[str] = None
    password: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "Dr. Jane Smith",
                    "subject": "Data Science"
                }
            ]
        }
    )


class ProfessorResponse(BaseModel):
    professor_id: int
    name: str
    subject: str
    neu_email: str
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "professor_id": 1,
                    "name": "Dr. Jane Smith",
                    "subject": "Computer Science",
                    "neu_email": "j.smith@northeastern.edu"
                }
            ]
        }
    )


class DeleteResponse(BaseModel):
    message: str
    deleted_id: int
