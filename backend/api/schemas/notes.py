from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date, datetime

class NoteBase(BaseModel):
    """Base model for note creation/validation"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    date: str
    courseSectionId: int = Field(..., gt=0)  
    
    @validator('date')
    def validate_date(cls, v):
        try:
            parsed_date = datetime.strptime(v, '%Y-%m-%d').date()
            if parsed_date > date.today():
                raise ValueError('Date cannot be in the future')
            return v
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD')
    
    @validator('title')
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()


class NoteCreate(NoteBase):
    """Model for creating a new note"""
    pass


class NoteUpdate(BaseModel):
    """Model for updating an existing note"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    date: Optional[str] = None
    courseSectionId: Optional[int] = Field(None, gt=0)  
    
    @validator('date')
    def validate_date(cls, v):
        if v is None:
            return v
        try:
            parsed_date = datetime.strptime(v, '%Y-%m-%d').date()
            if parsed_date > date.today():
                raise ValueError('Date cannot be in the future')
            return v
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD')


class NoteResponse(BaseModel):
    """Model for note responses"""
    noteId: int
    title: str
    description: Optional[str]
    dateUploaded: str
    courseSectionId: Optional[int]  
    courseCode: Optional[str]  
    courseName: Optional[str]  
    professorName: Optional[str] 
    mediaUrl: Optional[str] = None
    fileName: Optional[str] = None
    fileUrl: Optional[str] = None
    fileSize: Optional[int] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True


class DeleteResponse(BaseModel):
    """Model for delete operation response"""
    message: str
    id: int