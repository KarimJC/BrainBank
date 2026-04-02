from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from api.schemas.ai_chat import AIChatSessionCreate, AIChatMessageCreate
from core.exceptions import DatabaseException
import logging

logger = logging.getLogger(__name__)


def get_or_create_session(user_id: int, section_id: int, db: Connection) -> dict:
    """Get existing chat session or create a new one"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        # Try to get existing session
        query = """
            SELECT session_id, user_id, section_id, created_at, last_interaction
            FROM ai_chat_session
            WHERE user_id = %s AND section_id = %s
        """
        cursor.execute(query, (user_id, section_id))
        result = cursor.fetchone()

        if result:
            # Update last_interaction timestamp
            update_query = """
                UPDATE ai_chat_session
                SET last_interaction = now()
                WHERE session_id = %s
                RETURNING session_id, user_id, section_id, created_at, last_interaction
            """
            cursor.execute(update_query, (result["session_id"],))
            updated_result = cursor.fetchone()
            db.commit()
            cursor.close()
            logger.info(f"Retrieved existing session {result['session_id']} for user {user_id}, section {section_id}")
            return dict(updated_result)

        # Create new session if one doesn't alr exist
        insert_query = """
            INSERT INTO ai_chat_session (user_id, section_id)
            VALUES (%s, %s)
            RETURNING session_id, user_id, section_id, created_at, last_interaction
        """
        cursor.execute(insert_query, (user_id, section_id))
        result = cursor.fetchone()
        db.commit()
        cursor.close()

        logger.info(f"Created new session {result['session_id']} for user {user_id}, section {section_id}")
        return dict(result)

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to get/create session: {str(e)}")
        raise DatabaseException(f"Failed to get/create session: {str(e)}")


def create_chat_message(message_data: AIChatMessageCreate, db: Connection) -> dict:
    """Create a new chat message (user or assistant)"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        query = """
            INSERT INTO ai_chat_message (session_id, role, content, tokens_used)
            VALUES (%s, %s, %s, %s)
            RETURNING message_id, session_id, role, content, timestamp, tokens_used
        """

        cursor.execute(
            query, (message_data.session_id, message_data.role, message_data.content, message_data.tokens_used)
        )

        result = cursor.fetchone()
        db.commit()
        cursor.close()

        logger.info(f"Created {message_data.role} message in session {message_data.session_id}")
        return dict(result)

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create chat message: {str(e)}")
        raise DatabaseException(f"Failed to create chat message: {str(e)}")


def get_chat_history(session_id: int, db: Connection) -> list[dict]:
    """Get all messages for a chat session"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT message_id, session_id, role, content, timestamp, tokens_used
            FROM ai_chat_message
            WHERE session_id = %s
            ORDER BY timestamp ASC
        """

        cursor.execute(query, (session_id,))
        results = cursor.fetchall()
        cursor.close()

        logger.info(f"Retrieved {len(results)} messages for session {session_id}")
        return [dict(row) for row in results]

    except Exception as e:
        logger.error(f"Failed to get chat history: {str(e)}")
        raise DatabaseException(f"Failed to get chat history: {str(e)}")


def get_section_context(section_id: int, db: Connection) -> dict:
    """Get all notes and documents for a course section to build AI context"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        # Get all notes for this section
        notes_query = """
            SELECT title, description, notes_content, date_uploaded
            FROM notes
            WHERE course_id = %s
            ORDER BY date_uploaded DESC
        """
        cursor.execute(notes_query, (section_id,))
        notes = cursor.fetchall()

        # Get all documents for this section
        docs_query = """
            SELECT doc_type, doc_content, doc_date
            FROM document
            WHERE course_id = %s
            ORDER BY doc_date DESC
        """
        cursor.execute(docs_query, (section_id,))
        documents = cursor.fetchall()

        cursor.close()

        context = {"notes": [dict(row) for row in notes], "documents": [dict(row) for row in documents]}

        logger.info(
            f"Retrieved context for section {section_id}: {len(context['notes'])} notes, {len(context['documents'])} documents"
        )
        return context

    except Exception as e:
        logger.error(f"Failed to get section context: {str(e)}")
        raise DatabaseException(f"Failed to get section context: {str(e)}")


def delete_chat_session(session_id: int, db: Connection) -> bool:
    """Delete a chat session and all its messages (cascade)"""
    try:
        cursor = db.cursor()

        query = "DELETE FROM ai_chat_session WHERE session_id = %s"
        cursor.execute(query, (session_id,))

        db.commit()
        deleted = cursor.rowcount > 0
        cursor.close()

        logger.info(f"Deleted session {session_id}")
        return deleted

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete session {session_id}: {str(e)}")
        raise DatabaseException(f"Failed to delete session: {str(e)}")
