from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# AI Chat Session Schemas
class AIChatSessionCreate(BaseModel):
    user_id: int
    section_id: int


class AIChatSessionResponse(BaseModel):
    session_id: int
    user_id: int
    section_id: int
    created_at: datetime
    last_interaction: datetime


# AI Chat Message Schemas
class AIChatMessageCreate(BaseModel):
    session_id: int
    role: Literal["user", "assistant"]
    content: str
    tokens_used: Optional[int] = 0


class AIChatMessageResponse(BaseModel):
    message_id: int
    session_id: int
    role: str
    content: str
    timestamp: datetime
    tokens_used: int


# Request/Response for the API endpoints
class ChatRequest(BaseModel):
    """User sends a message to the AI"""
    user_id: int
    section_id: int
    message: str = Field(..., min_length=1, max_length=5000)


class ChatResponse(BaseModel):
    """AI responds with a message"""
    session_id: int
    user_message: str
    ai_response: str
    timestamp: datetime
    tokens_used: int


class ChatHistoryResponse(BaseModel):
    """Returns full chat history"""
    session_id: int
    section_id: int
    messages: List[AIChatMessageResponse]