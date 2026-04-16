from fastapi import HTTPException, status, APIRouter, Depends
from psycopg2.extensions import connection as Connection
from typing import List

from db.crud.conversation import (
    create_conversation as create_conversation_crud,
    get_conversation_by_id as get_conversation_by_id_crud,
    get_user_conversations as get_user_conversations_crud,
    update_conversation_status as update_conversation_status_crud,
    check_conversation_exists as check_conversation_exists_crud,
    mark_conversation_read as mark_conversation_read_crud,
)

from db.crud.user import get_user_by_id, get_user_by_auth_id
from api.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationResponse, ConversationStatus
from auth import get_current_user
from core.exceptions import DatabaseException, ConversationAlreadyExists, ConversationNotFound, UserNotFoundException
from db.connection import get_db
from cache.redis_client import cache_get, cache_set, cache_delete

router = APIRouter()


@router.post("/conversations/{initiator_id}", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    initiator_id: int, conversation_to_create: ConversationCreate, db: Connection = Depends(get_db)
):
    if check_conversation_exists_crud(initiator_id, conversation_to_create.recipient_id, db):
        raise ConversationAlreadyExists(initiator_id, conversation_to_create.recipient_id)

    conversation = create_conversation_crud(initiator_id, conversation_to_create.recipient_id, db)
    cache_delete(
        f"conversations:{initiator_id}",
        f"conversations:{conversation_to_create.recipient_id}",
    )
    return conversation


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse, status_code=status.HTTP_200_OK)
def update_conversation(
    conversation_id: int,
    updated_conversation_data: ConversationUpdate,
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db),
):
    conv = get_conversation_by_id_crud(conversation_id, db)
    if not conv:
        raise ConversationNotFound(conversation_id)

    user = get_user_by_auth_id(current_user["auth_id"], db)

    # Record who blocked; clear it for any other status transition
    blocked_by = user["user_id"] if updated_conversation_data.status == ConversationStatus.blocked else None

    updated_conversation = update_conversation_status_crud(
        conversation_id, updated_conversation_data.status.name, blocked_by, db
    )
    cache_delete(
        f"conversations:{conv['initiator_id']}",
        f"conversations:{conv['recipient_id']}",
    )
    return updated_conversation


@router.get("/conversations/user/{user_id}", response_model=list[ConversationResponse], status_code=status.HTTP_200_OK)
def get_user_conversations(user_id: int, db: Connection = Depends(get_db)):
    find_user = get_user_by_id(user_id, db)
    if not find_user:
        raise UserNotFoundException(user_id)

    cache_key = f"conversations:{user_id}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    conversations = get_user_conversations_crud(user_id, db)
    cache_set(cache_key, conversations, ttl=5)
    return conversations


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse, status_code=status.HTTP_200_OK)
def get_conversation(conversation_id: int, db: Connection = Depends(get_db)):
    get_conversation = get_conversation_by_id_crud(conversation_id, db)
    if not get_conversation:
        raise ConversationNotFound(conversation_id)
    else:
        return get_conversation


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    conversation_id: int,
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db),
):
    conv = get_conversation_by_id_crud(conversation_id, db)
    if not conv:
        raise ConversationNotFound(conversation_id)

    user = get_user_by_auth_id(current_user["auth_id"], db)
    mark_conversation_read_crud(conversation_id, user["user_id"], db)
    cache_delete(
        f"conversations:{conv['initiator_id']}",
        f"conversations:{conv['recipient_id']}",
    )
