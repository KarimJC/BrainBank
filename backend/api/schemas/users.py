
from typing import Optional
from pydantic import BaseModel, EmailStr

#since I needed these for the routers, I made them, feel free to change them up as needed

class UserCreate(BaseModel):
    neu_email: EmailStr
    first_name: str
    last_name: str
    password: str
    profile_picture: Optional[str] = None


class UserUpdate(BaseModel):
    neu_email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    profile_picture: Optional[str] = None


class UserResponse(BaseModel):
    user_id: int
    neu_email: str
    first_name: str
    last_name: str
    profile_picture: Optional[str]

 


class DeleteResponse(BaseModel):
    message: str
    deleted_id: int