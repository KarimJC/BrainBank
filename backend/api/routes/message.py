from fastapi import HTTPException, status, APIRouter, Depends, WebSocket, WebSocketDisconnect
from psycopg2.extensions import connection as Connection
from typing import List
import json 

from db.crud.message import (
    create_message as create_message_crud,
    get_message_by_id,
    get_messages_between_users,
    update_message as update_message_crud,
    delete_message as delete_message_crud
)

from api.schemas.message import MessageCreate, MessageUpdate, MessageResponse, MessageDeleteResponse
from core.exceptions import DatabaseException
from api.websocket_manager.connection_manager import ConnectionManager
from db.crud.conversation import get_conversation_by_id
from db.connection import get_db



router = APIRouter()

websocket_manager = ConnectionManager() 

@router.websocket("/ws/{user_id}")
async def chat_websocket(websocket: WebSocket,  user_id: int, db: Connection = Depends(get_db)):
    '''
    receive input as a JSON 
    parase into a MessageCreate object
    send message to other person
    if it works send it and save to db 
    if it deoes not work, then save to db and the restendpoint should take care of it when they log in            
    '''
    try:
        await websocket_manager.connect(websocket, user_id)
        while True:
             data = await websocket.receive_text()
             json_data = json.loads(data)
             try:
                make_message = MessageCreate(**json_data)
                find_conversation =  get_conversation_by_id(make_message.conversation_id, db)
                if find_conversation:
                    create_message_crud(make_message, user_id, db)  
                    if user_id == find_conversation['initiator_id']:
                     await websocket_manager.send_message(find_conversation['recipient_id'], make_message.content)
                       
                    else:
                        await websocket_manager.send_message(find_conversation['initiator_id'],make_message.content)  
             except Exception as e:
                  await websocket.send_json({"status": "error", "message": f"Validation error: {e}"}) 
    except WebSocketDisconnect:
        
        await websocket_manager.disconnect(user_id)
        
        
        

class MessageNotFoundException(HTTPException):
    def __init__(self, message_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message with id {message_id} not found"
        )


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(message_data: MessageCreate, user_id: int, db: Connection = Depends(get_db)):
    """Create a new message"""
    message = create_message_crud(message_data,user_id, db)
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
def get_messages(conversation_id:int, db: Connection = Depends(get_db)):
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