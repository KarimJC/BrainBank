from fastapi import HTTPException, status, APIRouter, Depends
from psycopg2.extensions import connection as Connection
from typing import List

from db.crud.ai_chat import (
    get_or_create_session,
    create_chat_message,
    get_chat_history,
    get_section_context,
    delete_chat_session
)

from api.schemas.ai_chat import (
    ChatRequest,
    ChatResponse,
    ChatHistoryResponse,
    AIChatMessageCreate,
    AIChatSessionResponse
)

from core.ai_service import ai_service
from core.exceptions import DatabaseException
from db.connection import get_db

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class AIChatNotFoundException(HTTPException):
    def __init__(self, session_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI chat session with id {session_id} not found"
        )


@router.post("/ai-chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def send_message_to_ai(chat_request: ChatRequest, db: Connection = Depends(get_db)):
    """
    Send a message to the AI chatbot for a specific course section.
    The AI will respond based on all notes and documents in that section.
    """
    try:
        # Get or create chat session
        session = get_or_create_session(chat_request.user_id, chat_request.section_id, db)
        session_id = session['session_id']
        
        # Get chat history for context
        history = get_chat_history(session_id, db)
        
        # Get course materials for context
        context = get_section_context(chat_request.section_id, db)
        
        # Store user's message
        user_message = AIChatMessageCreate(
            session_id=session_id,
            role="user",
            content=chat_request.message,
            tokens_used=0
        )
        create_chat_message(user_message, db)
        
        # Generate AI response
        ai_response_text, tokens_used = ai_service.generate_response(
            chat_request.message,
            context,
            history
        )
        
        # Store AI's response
        ai_message = AIChatMessageCreate(
            session_id=session_id,
            role="assistant",
            content=ai_response_text,
            tokens_used=tokens_used
        )
        ai_msg = create_chat_message(ai_message, db)
        
        logger.info(f"AI chat interaction completed for session {session_id}")
        
        return ChatResponse(
            session_id=session_id,
            user_message=chat_request.message,
            ai_response=ai_response_text,
            timestamp=ai_msg['timestamp'],
            tokens_used=tokens_used
        )
        
    except Exception as e:
        logger.error(f"Failed to process AI chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process AI chat: {str(e)}"
        )


@router.get("/ai-chat/history", response_model=ChatHistoryResponse, status_code=status.HTTP_200_OK)
def get_chat_history_route(user_id: int, section_id: int, db: Connection = Depends(get_db)):
    """
    Get the full chat history for a user in a specific course section.
    Returns empty list if no chat exists yet.
    """
    try:
        # Get session 
        session = get_or_create_session(user_id, section_id, db)
        session_id = session['session_id']
        
        # Get all messages
        messages = get_chat_history(session_id, db)
        
        return ChatHistoryResponse(
            session_id=session_id,
            section_id=section_id,
            messages=messages
        )
        
    except Exception as e:
        logger.error(f"Failed to get chat history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get chat history: {str(e)}"
        )


@router.post("/ai-chat/study-guide", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def generate_study_guide(user_id: int, section_id: int, db: Connection = Depends(get_db)):
    """
    Generate a study guide based on all materials in the course section.
    """
    try:
        # Get or create session
        session = get_or_create_session(user_id, section_id, db)
        session_id = session['session_id']
        
        # Get course materials
        context = get_section_context(section_id, db)
        
        # Store user's request
        user_message = AIChatMessageCreate(
            session_id=session_id,
            role="user",
            content="Generate a study guide for this course",
            tokens_used=0
        )
        create_chat_message(user_message, db)
        
        # Generate study guide
        study_guide, tokens_used = ai_service.generate_study_guide(context)
        
        # Store AI's response
        ai_message = AIChatMessageCreate(
            session_id=session_id,
            role="assistant",
            content=study_guide,
            tokens_used=tokens_used
        )
        ai_msg = create_chat_message(ai_message, db)
        
        return ChatResponse(
            session_id=session_id,
            user_message="Generate a study guide for this course",
            ai_response=study_guide,
            timestamp=ai_msg['timestamp'],
            tokens_used=tokens_used
        )
        
    except Exception as e:
        logger.error(f"Failed to generate study guide: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate study guide: {str(e)}"
        )


@router.post("/ai-chat/practice-exam", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def generate_practice_exam(
    user_id: int, 
    section_id: int, 
    num_questions: int = 10,
    db: Connection = Depends(get_db)
):
    """
    Generate a practice exam based on all materials in the course section.
    """
    try:
        # Get or create session
        session = get_or_create_session(user_id, section_id, db)
        session_id = session['session_id']
        
        # Get course materials
        context = get_section_context(section_id, db)
        
        # Store user's request
        user_message = AIChatMessageCreate(
            session_id=session_id,
            role="user",
            content=f"Generate a practice exam with {num_questions} questions",
            tokens_used=0
        )
        create_chat_message(user_message, db)
        
        # Generate practice exam
        practice_exam, tokens_used = ai_service.generate_practice_exam(context, num_questions)
        
        # Store AI's response
        ai_message = AIChatMessageCreate(
            session_id=session_id,
            role="assistant",
            content=practice_exam,
            tokens_used=tokens_used
        )
        ai_msg = create_chat_message(ai_message, db)
        
        return ChatResponse(
            session_id=session_id,
            user_message=f"Generate a practice exam with {num_questions} questions",
            ai_response=practice_exam,
            timestamp=ai_msg['timestamp'],
            tokens_used=tokens_used
        )
        
    except Exception as e:
        logger.error(f"Failed to generate practice exam: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate practice exam: {str(e)}"
        )


@router.post("/ai-chat/course-summary", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def generate_course_summary(user_id: int, section_id: int, db: Connection = Depends(get_db)):
    """
    Generate a course summary based on all materials in the course section.
    """
    try:
        # Get or create session
        session = get_or_create_session(user_id, section_id, db)
        session_id = session['session_id']
        
        # Get course materials
        context = get_section_context(section_id, db)
        
        # Store user's request
        user_message = AIChatMessageCreate(
            session_id=session_id,
            role="user",
            content="Generate a summary of this course",
            tokens_used=0
        )
        create_chat_message(user_message, db)
        
        # Generate summary
        summary, tokens_used = ai_service.summarize_course(context)
        
        # Store AI's response
        ai_message = AIChatMessageCreate(
            session_id=session_id,
            role="assistant",
            content=summary,
            tokens_used=tokens_used
        )
        ai_msg = create_chat_message(ai_message, db)
        
        return ChatResponse(
            session_id=session_id,
            user_message="Generate a summary of this course",
            ai_response=summary,
            timestamp=ai_msg['timestamp'],
            tokens_used=tokens_used
        )
        
    except Exception as e:
        logger.error(f"Failed to generate course summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate course summary: {str(e)}"
        )


@router.delete("/ai-chat/{session_id}", status_code=status.HTTP_200_OK)
def delete_chat_session_route(session_id: int, db: Connection = Depends(get_db)):
    """
    Delete an AI chat session and all its messages.
    """
    try:
        deleted = delete_chat_session(session_id, db)
        if not deleted:
            raise AIChatNotFoundException(session_id)
        
        return {"message": f"Successfully deleted AI chat session {session_id}"}
        
    except AIChatNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chat session: {str(e)}"
        )