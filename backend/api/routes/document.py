from fastapi import HTTPException, status, APIRouter, Depends, Query
from psycopg2.extensions import connection as Connection
from typing import Optional

from db.crud.document import (
    get_document_by_id,
    get_all_documents,
    delete_document,
    create_document
)
from core.ai_service import ai_service
from api.schemas.document import DocumentResponse, DocumentDeleteResponse
from core.exceptions import DatabaseException
from db.connection import get_db

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class DocumentNotFoundException(HTTPException):
    def __init__(self, doc_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with id {doc_id} not found"
        )


@router.get("/documents/{doc_id}", response_model=DocumentResponse, status_code=status.HTTP_200_OK)
def get_document(doc_id: str, db: Connection = Depends(get_db)):
    """Get a document by its ID"""
    document = get_document_by_id(doc_id, db)
    if not document:
        raise DocumentNotFoundException(doc_id)
    return document


@router.get("/documents", response_model=list[DocumentResponse], status_code=status.HTTP_200_OK)
def get_documents(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    course_id: Optional[int] = Query(None, description="Filter by course section ID"),
    db: Connection = Depends(get_db)
):
    """Get all documents, optionally filtered by user_id and/or course_id"""
    documents = get_all_documents(db, user_id=user_id, course_id=course_id)
    return documents


@router.delete("/documents/{doc_id}", response_model=DocumentDeleteResponse, status_code=status.HTTP_200_OK)
def delete_document_route(doc_id: str, db: Connection = Depends(get_db)):
    """Delete a document by its ID"""
    document = get_document_by_id(doc_id, db)
    if not document:
        raise DocumentNotFoundException(doc_id)
    delete_document(doc_id, db)
    return DocumentDeleteResponse(
        message=f"Successfully deleted document {doc_id}",
        deleted_id=doc_id
    )
@router.post("/documents/generate/study-guide", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def generate_study_guide(user_id: int, section_id: int, db: Connection = Depends(get_db)):
    """Generate a study guide from course materials and save it as a document"""
    try:
        from db.crud.ai_chat import get_section_context
        context = get_section_context(section_id, db)
        content, _ = ai_service.generate_study_guide(context)
        document = create_document(user_id, section_id, "study_guide", content, db)
        return document
    except Exception as e:
        logger.error(f"Failed to generate study guide: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/documents/generate/practice-exam", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def generate_practice_exam(user_id: int, section_id: int, num_questions: int = 10, db: Connection = Depends(get_db)):
    """Generate a practice exam from course materials and save it as a document"""
    try:
        from db.crud.ai_chat import get_section_context
        context = get_section_context(section_id, db)
        content, _ = ai_service.generate_practice_exam(context, num_questions)
        document = create_document(user_id, section_id, "practice_exam", content, db)
        return document
    except Exception as e:
        logger.error(f"Failed to generate practice exam: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/documents/generate/summary", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def generate_summary(user_id: int, section_id: int, db: Connection = Depends(get_db)):
    """Generate a course summary from course materials and save it as a document"""
    try:
        from db.crud.ai_chat import get_section_context
        context = get_section_context(section_id, db)
        content, _ = ai_service.summarize_course(context)
        document = create_document(user_id, section_id, "summary", content, db)
        return document
    except Exception as e:
        logger.error(f"Failed to generate summary: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))