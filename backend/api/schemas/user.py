from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_picture: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"first_name": "Angel", "last_name": "El Moucary", "profile_picture": "https://pfp.com/pfp.jpg"}
            ]
        }
    )


class UserResponse(BaseModel):
    user_id: int
    auth_id: str  # Added: UUID from Supabase auth
    neu_email: str
    first_name: str
    last_name: str
    profile_picture: Optional[str]
    created_at: Optional[datetime] = None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "user_id": 1,
                    "auth_id": "550e8400-e29b-41d4-a716-446655440000",
                    "neu_email": "elmoucary.a@northeastern.edu",
                    "first_name": "Angel",
                    "last_name": "El Moucary",
                    "profile_picture": "https://pfp.com/pfp.jpg",
                    "created_at": "2024-02-12T10:30:00Z",
                }
            ]
        }
    )


class DeleteResponse(BaseModel):
    message: str
    deleted_id: int
