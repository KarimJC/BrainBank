from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class MessageCreate(BaseModel):
    sender_id: int
    receiver_id: int
    message_content: str

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"sender_id": 1, "receiver_id": 2, "message_content": "Hey! Want to work tg on algo?"}]
        }
    )


class MessageUpdate(BaseModel):
    message_content: Optional[str] = None

    model_config = ConfigDict(json_schema_extra={"examples": [{"message_content": "Hey! Want to work tg on algo?"}]})


class MessageResponse(BaseModel):
    message_id: str
    sender_id: int
    receiver_id: int
    message_content: str
    datetime: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "message_id": "123456",
                    "sender_id": 1,
                    "receiver_id": 2,
                    "message_content": "Hey! Want to work tg on algo?",
                    "datetime": "2026-02-04T10:30:00",
                }
            ]
        }
    )


class MessageDeleteResponse(BaseModel):
    message: str
    deleted_id: str
