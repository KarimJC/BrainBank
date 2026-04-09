from fastapi import HTTPException, status, APIRouter, Depends, WebSocket, WebSocketDisconnect
from psycopg2.extensions import connection as Connection
from typing import List
import json
from auth import get_current_user
from db.crud.user import get_user_by_auth_id
from core.exceptions import UserNotFoundException
from db.crud.conversation import get_conversation_by_id

from db.crud.message import (
    create_message as create_message_crud,
    get_message_by_id,
    get_messages_between_users,
    update_message as update_message_crud,
    delete_message as delete_message_crud,
)

from api.schemas.message import MessageCreate, MessageUpdate, MessageResponse, MessageDeleteResponse
from core.exceptions import DatabaseException, MessageNotFoundException
from api.websocket_manager.connection_manager import ConnectionManager
from db.connection import get_db


router = APIRouter()

websocket_manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def chat_websocket(websocket: WebSocket, user_id: int, db: Connection = Depends(get_db)):
    """
    receive input as a JSON
    parase into a MessageCreate object
    send message to other person
    if it works send it and save to db
    if it deoes not work, then save to db and the restendpoint should take care of it when they log in
    """
    try:
        await websocket_manager.connect(websocket, user_id)
        while True:
            data = await websocket.receive_text()
            json_data = json.loads(data)
            try:
                make_message = MessageCreate(**json_data)
                find_conversation = get_conversation_by_id(make_message.conversation_id, db)
                if find_conversation:
                    # save message to db
                    saved_message = create_message_crud(make_message, user_id, db)

                    # determine recipient
                    recipient_id = (
                        find_conversation["recipient_id"]
                        if user_id == find_conversation["initiator_id"]
                        else find_conversation["initiator_id"]
                    )

                    # send full message object as JSON
                    await websocket_manager.send_message(
                        recipient_id,
                        json.dumps(
                            {
                                "message_id": str(saved_message["message_id"]),
                                "sender_id": saved_message["sender_id"],
                                "content": saved_message["content"],
                                "conversation_id": saved_message["conversation_id"],
                                "created_at": str(saved_message["created_at"]),
                            }
                        ),
                    )
            except Exception as e:
                await websocket.send_json({"status": "error", "message": str(e)})
    except WebSocketDisconnect:
        await websocket_manager.disconnect(user_id)


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    message_data: MessageCreate, current_user: dict = Depends(get_current_user), db: Connection = Depends(get_db)
):
    """Create a new message"""
    user = get_user_by_auth_id(current_user["auth_id"], db)
    if not user:
        raise UserNotFoundException(current_user["auth_id"])
    message = create_message_crud(message_data, user["user_id"], db)
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
def get_messages(conversation_id: int, db: Connection = Depends(get_db)):
    """Get all messages between two users"""
    messages = get_messages_between_users(conversation_id, db)
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
