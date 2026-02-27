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
        query = "SELECT EXISTS(SELECT 1 FROM user WHERE user_id = %s)"
        cursor.execute(query, (user_id,))
        exists = cursor.fetchone()[0]
        cursor.close()
        return exists
    except Exception as e:
        logger.error(f"Failed to check if user {user_id} exists: {str(e)}")
        raise DatabaseException(f"Failed to check user: {str(e)}")


def create_message(message_data: MessageCreate, db: Connection) -> dict:
    """Create a new message in the database"""
    try:
        # To check if the sender exists
        if not check_user_exists(message_data.sender_id, db):
            from core.exceptions import UserNotFoundException

            raise UserNotFoundException(message_data.sender_id)

        # To check if the receiver exists
        if not check_user_exists(message_data.receiver_id, db):
            from core.exceptions import UserNotFoundException

            raise UserNotFoundException(message_data.receiver_id)

        cursor = db.cursor(cursor_factory=RealDictCursor)

        query = """
            INSERT INTO message (sender_id, receiver_id, message_content)
            VALUES (%s, %s, %s)
            RETURNING message_id, sender_id, receiver_id, message_content, datetime
        """

        cursor.execute(query, (message_data.sender_id, message_data.receiver_id, message_data.message_content))

        result = cursor.fetchone()
        db.commit()
        cursor.close()

        logger.info(f"Created message from user {message_data.sender_id} to user {message_data.receiver_id}")
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
            SELECT message_id, sender_id, receiver_id, message_content, datetime
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


def get_messages_between_users(from_id: int, to_id: int, db: Connection) -> list[dict]:
    """Get all messages between two users"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT message_id, sender_id, receiver_id, message_content, datetime
            FROM message
            WHERE (sender_id = %s AND receiver_id = %s)
               OR (sender_id = %s AND receiver_id = %s)
            ORDER BY datetime ASC
        """

        cursor.execute(query, (from_id, to_id, to_id, from_id))
        results = cursor.fetchall()
        cursor.close()

        logger.info(f"Retrieved {len(results)} messages between users {from_id} and {to_id}")
        return [dict(row) for row in results]

    except Exception as e:
        logger.error(f"Failed to get messages between users {from_id} and {to_id}: {str(e)}")
        raise DatabaseException(f"Failed to get messages: {str(e)}")


def update_message(message_id: str, message_data: MessageUpdate, db: Connection) -> dict:
    """Update a message's content"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        query = """
            UPDATE message
            SET message_content = %s
            WHERE message_id = %s
            RETURNING message_id, sender_id, receiver_id, message_content, datetime
        """

        cursor.execute(query, (message_data.message_content, message_id))
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
