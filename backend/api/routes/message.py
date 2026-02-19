from fastapi import HTTPException, status, APIRouter, Depends
from psycopg2.extensions import connection as Connection
from typing import List

from db.crud.message import (
    create_message as create_message_crud,
    get_message_by_id,
    get_messages_between_users,
    update_message as update_message_crud,
    delete_message as delete_message_crud
)

from api.schemas.message import MessageCreate, MessageUpdate, MessageResponse, MessageDeleteResponse

from db.connection import get_db


router = APIRouter()


class MessageNotFoundException(HTTPException):
    def __init__(self, message_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message with id {message_id} not found"
        )


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(message_data: MessageCreate, db: Connection = Depends(get_db)):
    """Create a new message"""
    message = create_message_crud(message_data, db)
    return message


@router.get("/messages/{message_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def get_message(message_id: str, db: Connection = Depends(get_db)):
    """Get a message by ID"""
    message = get_message_by_id(message_id, db)
    if message:
        return message
    else:
        raise MessageNotFoundException(message_id)


@router.get("/messages", response_model=List[MessageResponse], status_code=status.HTTP_200_OK)
def get_messages(from_id: int, to_id: int, db: Connection = Depends(get_db)):
    """Get all messages between two users"""
    messages = get_messages_between_users(from_id, to_id, db)
    return messages


@router.patch("/messages/{message_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def update_message(message_id: str, updated_message_data: MessageUpdate, db: Connection = Depends(get_db)):
    """Update a message's content"""
    current_message = get_message_by_id(message_id, db)
    if not current_message:
        raise MessageNotFoundException(message_id)
    
    updated_message = update_message_crud(message_id, updated_message_data, db)
    return updated_message


@router.delete("/messages/{message_id}", response_model=MessageDeleteResponse, status_code=status.HTTP_200_OK)
def delete_message_route(message_id: str, db: Connection = Depends(get_db)) -> MessageDeleteResponse:
    """Delete a message"""
    message = get_message_by_id(message_id, db)
    if not message:
        raise MessageNotFoundException(message_id)
    
    delete_message_crud(message_id, db)
    return MessageDeleteResponse(message=f"Successfully deleted message {message_id}", deleted_id=message_id)