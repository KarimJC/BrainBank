from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from core.exceptions import DatabaseException
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def get_document_by_id(doc_id: str, db: Connection) -> Optional[dict]:
    """Get a document by its UUID"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT doc_id, user_id, doc_type, doc_content, doc_date, course_id
            FROM document
            WHERE doc_id = %s
        """
        cursor.execute(query, (doc_id,))
        result = cursor.fetchone()
        cursor.close()
        return dict(result) if result else None

    except Exception as e:
        logger.error(f"Failed to get document {doc_id}: {str(e)}")
        raise DatabaseException(f"Failed to get document: {str(e)}")


def get_all_documents(db: Connection, user_id: Optional[int] = None, course_id: Optional[int] = None) -> list[dict]:
    """Get all documents, optionally filtered by user_id and/or course_id"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        filters = []
        values = []

        if user_id is not None:
            filters.append("user_id = %s")
            values.append(user_id)

        if course_id is not None:
            filters.append("course_id = %s")
            values.append(course_id)

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        query = f"""
            SELECT doc_id, user_id, doc_type, doc_content, doc_date, course_id
            FROM document
            {where_clause}
            ORDER BY doc_date DESC
        """

        cursor.execute(query, values)
        results = cursor.fetchall()
        cursor.close()

        logger.info(f"Retrieved {len(results)} documents (user_id={user_id}, course_id={course_id})")
        return [dict(row) for row in results]

    except Exception as e:
        logger.error(f"Failed to get documents: {str(e)}")
        raise DatabaseException(f"Failed to get documents: {str(e)}")


def create_document(user_id: int, course_id: int, doc_type: str, doc_content: str, db: Connection) -> dict:
    """Insert an AI-generated document into the document table"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
            INSERT INTO document (user_id, course_id, doc_type, doc_content, doc_date)
            VALUES (%s, %s, %s, %s, CURRENT_DATE)
            RETURNING doc_id, user_id, doc_type, doc_content, doc_date, course_id
        """
        cursor.execute(query, (user_id, course_id, doc_type, doc_content))
        result = cursor.fetchone()
        db.commit()
        cursor.close()

        logger.info(f"Created {doc_type} document for user {user_id}, section {course_id}")
        return dict(result)

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create document: {str(e)}")
        raise DatabaseException(f"Failed to create document: {str(e)}")


def delete_document(doc_id: str, db: Connection) -> bool:
    """Delete a document by its UUID"""
    try:
        cursor = db.cursor()
        query = "DELETE FROM document WHERE doc_id = %s"
        cursor.execute(query, (doc_id,))
        db.commit()
        deleted = cursor.rowcount > 0
        cursor.close()

        logger.info(f"Deleted document {doc_id}")
        return deleted

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete document {doc_id}: {str(e)}")
        raise DatabaseException(f"Failed to delete document: {str(e)}")
