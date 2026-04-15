from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID


class MessageCreate(BaseModel):
    conversation_id: int
    content: str

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"conversation_id": 1, "content": "Hey! Want to work tg on algo?"}]}
    )


class MessageUpdate(BaseModel):
    content: Optional[str] = None

    model_config = ConfigDict(json_schema_extra={"examples": [{"message_content": "Hey! Want to work tg on algo?"}]})


class MessageResponse(BaseModel):
    message_id: UUID
    sender_id: int
    content: str
    created_at: datetime
    conversation_id: int

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "message_id": "123456",
                    "sender_id": 1,
                    "message_content": "Hey! Want to work tg on algo?",
                    "datetime": "2026-02-04T10:30:00",
                    "conversation_id": 1,
                }
            ]
        }
    )


class MessageDeleteResponse(BaseModel):
    message: str
<<<<<<< HEAD
    deleted_id: str


class PaginatedMessagesResponse(BaseModel):
    messages: List[MessageResponse]
    next_cursor: Optional[str] = None
    has_more: bool
=======
    deleted_id: str  
>>>>>>> origin/main
