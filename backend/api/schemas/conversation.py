from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from enum import Enum

class ConversationCreate(BaseModel):
    recipient_id: int

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "recipient_id": 2,
                }
            ]
        }
    )


class ConversationStatus(Enum):
    accepted = "accepted"
    declined = "declined"
    blocked = "blocked"

class ConversationUpdate(BaseModel):
    status: ConversationStatus
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "status": "accepted"
                }
            ]
        }
    )    

class ConversationResponse(BaseModel):
    conversation_id: int
    initiator_id: int
    recipient_id: int
    status: str
    blocked_by: Optional[int] = None
    created_at: datetime
    initiator_name: str
    initiator_profile_picture: Optional[str] = None
    recipient_name: str
    recipient_profile_picture: Optional[str] = None