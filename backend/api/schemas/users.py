from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

class UserCreate(BaseModel):
    neu_email: EmailStr
    first_name: str
    last_name: str
    password: str
    profile_picture: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "neu_email": "elmoucary.a@northeastern.edu",
                    "first_name": "Angel",
                    "last_name": "El Moucary",
                    "password": "password123",
                    "profile_picture": "https://pfp.com/pfp.jpg"
                }
            ]
        }
    )


class UserUpdate(BaseModel):
    neu_email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    profile_picture: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "first_name": "Angel",
                    "last_name": "El Moucary",
                }
            ]
        }
    )


class UserResponse(BaseModel):
    user_id: int
    neu_email: str
    first_name: str
    last_name: str
    profile_picture: Optional[str]
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "user_id": 1,
                    "neu_email": "elmoucary.a@northeastern.edu",
                    "first_name": "Angel",
                    "last_name": "El Moucary",
                    "profile_picture": "https://pfp.com/pfp.jpg"
                }
            ]
        }
    )


class DeleteResponse(BaseModel):
    message: str
    deleted_id: int