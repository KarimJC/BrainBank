from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from api.schemas.message import MessageCreate, MessageUpdate
from core.exceptions import DatabaseException
import logging

logger = logging.getLogger(__name__)

def check_user_exists(user_id: int, db: Connection) -> bool:
    """Check if a user exists in the database"""
    try:
        cursor = db.cursor()
        query = 'SELECT EXISTS(SELECT 1 FROM "user" WHERE user_id = %s)'
        cursor.execute(query, (user_id,))
        exists = cursor.fetchone()[0]
        cursor.close()
        return exists
    except Exception as e:
        logger.error(f"Failed to check if user {user_id} exists: {str(e)}")
        raise DatabaseException(f"Failed to check user: {str(e)}")


def create_message(message_data: MessageCreate, sender_id: int, db: Connection) -> dict:
    """Create a new message in the database"""
    try:
        # To check if the sender exists
        if not check_user_exists(sender_id, db):
            from core.exceptions import UserNotFoundException

            raise UserNotFoundException(sender_id)

        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            INSERT INTO message (sender_id, conversation_id, content)
            VALUES (%s, %s, %s)
            RETURNING message_id, sender_id, conversation_id, content, created_at
        """

        cursor.execute(query, (sender_id, message_data.conversation_id, message_data.content))

        result = cursor.fetchone()
        db.commit()
        cursor.close()

        logger.info(f"Created message from user {sender_id} in {message_data.conversation_id}")
        return dict(result)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create message: {str(e)}")
        raise DatabaseException(f"Failed to create message: {str(e)}")


def get_message_by_id(message_id: str, db: Connection):
    """Get a message by its ID"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT message_id, sender_id, content, created_at, conversation_id
            FROM message
            WHERE message_id = %s
        """
        cursor.execute(query, (message_id,))
        result = cursor.fetchone()
        cursor.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        logger.error(f"Failed to get message {message_id}: {str(e)}")
        raise DatabaseException(f"Failed to get message: {str(e)}")


def get_messages_between_users(conversation_id: int, db: Connection) -> list[dict]:
    """Get all messages between two users"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT message_id, sender_id, content, created_at, conversation_id
            FROM message
            WHERE conversation_id = %s
            ORDER BY created_at  ASC
        """

        cursor.execute(query, (conversation_id,))
        results = cursor.fetchall()
        cursor.close()

        logger.info(f"Retrieved {len(results)} messages in conversation id {conversation_id}")
        return [dict(row) for row in results]
        
    except Exception as e:
        logger.error(f"Failed to get messages in conversation id {conversation_id}: {str(e)}")
        raise DatabaseException(f"Failed to get messages: {str(e)}")


def update_message(message_id: str, message_data: MessageUpdate, db: Connection) -> dict:
    """Update a message's content"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            UPDATE message
            SET content = %s
            WHERE message_id = %s
            RETURNING message_id, sender_id, content, created_at, conversation_id
        """

        cursor.execute(query, (message_data.content, message_id))
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        
        logger.info(f"Updated message {message_id}")
        return dict(result) if result else None
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update message {message_id}: {str(e)}")
        raise DatabaseException(f"Failed to update message: {str(e)}")


def delete_message(message_id: str, db: Connection) -> bool:
    """Delete a message from the database"""
    try:
        cursor = db.cursor()
        
        query = "DELETE FROM message WHERE message_id = %s"
        cursor.execute(query, (message_id,))
        
        db.commit()
        deleted = cursor.rowcount > 0
        cursor.close()
        
        logger.info(f"Deleted message {message_id}")
        return deleted
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete message {message_id}: {str(e)}")
        raise DatabaseException(f"Failed to delete message: {str(e)}")