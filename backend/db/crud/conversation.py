from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from api.schemas.conversation import ConversationCreate, ConversationUpdate
from core.exceptions import DatabaseException
import logging

logger = logging.getLogger(__name__)


def create_conversation(initiator_id: int, recipient_id: int, db: Connection) -> dict:
    """Create a new conversation between two users"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
            INSERT INTO conversation (initiator_id, recipient_id, status)
            VALUES (%s, %s, 'pending')
            RETURNING id
        """
        cursor.execute(query, (initiator_id, recipient_id))
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        logger.info(f"Created conversation between {initiator_id} and {recipient_id}")
        return get_conversation_by_id(result["id"], db)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create conversation: {str(e)}")
        raise DatabaseException(f"Failed to create conversation: {str(e)}")


def get_conversation_by_id(conversation_id: int, db: Connection) -> dict | None:
    """Get a single conversation by its ID with participant names"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT 
                c.id AS conversation_id,
                c.initiator_id,
                c.recipient_id,
                c.status,
                c.blocked_by,
                c.created_at,
                initiator.first_name || ' ' || initiator.last_name AS initiator_name,
                initiator.profile_picture AS initiator_profile_picture,
                recipient.first_name || ' ' || recipient.last_name AS recipient_name,
                recipient.profile_picture AS recipient_profile_picture
            FROM conversation c
            JOIN public.user initiator ON c.initiator_id = initiator.user_id
            JOIN public.user recipient ON c.recipient_id = recipient.user_id
            WHERE c.id = %s
        """
        cursor.execute(query, (conversation_id,))
        result = cursor.fetchone()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Failed to get conversation {conversation_id}: {str(e)}")
        raise DatabaseException(f"Failed to get conversation: {str(e)}")


def get_user_conversations(user_id: int, db: Connection) -> list[dict]:
    """Get all conversations for a user with participant names"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT 
                c.id AS conversation_id,
                c.initiator_id,
                c.recipient_id,
                c.status,
                c.blocked_by,
                c.created_at,
                initiator.first_name || ' ' || initiator.last_name AS initiator_name,
                initiator.profile_picture AS initiator_profile_picture,
                recipient.first_name || ' ' || recipient.last_name AS recipient_name,
                recipient.profile_picture AS recipient_profile_picture
            FROM conversation c
            JOIN public.user initiator ON c.initiator_id = initiator.user_id
            JOIN public.user recipient ON c.recipient_id = recipient.user_id
            WHERE c.initiator_id = %s OR c.recipient_id = %s
            ORDER BY c.created_at DESC
        """
        cursor.execute(query, (user_id, user_id))
        results = cursor.fetchall()
        cursor.close()
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Failed to get conversations for user {user_id}: {str(e)}")
        raise DatabaseException(f"Failed to get conversations: {str(e)}")


def update_conversation_status(
    conversation_id: int, status: str, blocked_by: int | None, db: Connection
) -> dict | None:
    """Update conversation status - accept, decline or block"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
            UPDATE conversation
            SET status = %s, blocked_by = %s
            WHERE id = %s
            RETURNING id
        """
        cursor.execute(query, (status, blocked_by, conversation_id))
        db.commit()
        cursor.close()
        # Fetch the updated conversation with names using existing function
        return get_conversation_by_id(conversation_id, db)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update conversation {conversation_id}: {str(e)}")
        raise DatabaseException(f"Failed to update conversation: {str(e)}")


def check_conversation_exists(initiator_id: int, recipient_id: int, db: Connection) -> bool:
    """Check if a conversation already exists between two users in either direction"""
    try:
        cursor = db.cursor()
        query = """
            SELECT EXISTS(
                SELECT 1 FROM conversation
                WHERE (initiator_id = %s AND recipient_id = %s)
                OR (initiator_id = %s AND recipient_id = %s)
            )
        """
        cursor.execute(query, (initiator_id, recipient_id, recipient_id, initiator_id))
        exists = cursor.fetchone()[0]
        cursor.close()
        return exists
    except Exception as e:
        logger.error(f"Failed to check conversation existence: {str(e)}")
        raise DatabaseException(f"Failed to check conversation: {str(e)}")
