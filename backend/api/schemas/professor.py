from typing import Optional
from pydantic import BaseModel, ConfigDict

class ProfessorCreate(BaseModel):
    name: str
    email: str
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "Dr. Jane Smith",
                    "email": "j.smith@northeastern.edu",
                }
            ]
        }
    )


class ProfessorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "Dr. Jane Smith",
                    "email": "j.smith@northeastern.edu",
                }
            ]
        }
    )


class ProfessorResponse(BaseModel):
    professor_id: int
    name: str
    email: str
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "professor_id": 1,
                    "name": "Dr. Jane Smith",
                    "email": "j.smith@northeastern.edu"
                }
            ]
        }
    )


class DeleteResponse(BaseModel):
    message: str
    deleted_id: int
