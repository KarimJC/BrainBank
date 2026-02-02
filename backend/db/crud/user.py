from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from api.schemas.users import UserCreate, UserUpdate
from core.exceptions import DatabaseException
import logging

logger = logging.getLogger(__name__)

def create_user(user_data: UserCreate, db: Connection) -> dict:
    """Create a new user in the database"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            INSERT INTO users (neu_email, first_name, last_name, password, profile_picture)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING user_id, neu_email, first_name, last_name, profile_picture
        """
        
        cursor.execute(query, (
            user_data.neu_email,
            user_data.first_name,
            user_data.last_name,
            user_data.password,
            user_data.profile_picture
        ))
        
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        
        logger.info(f"Created user with email: {user_data.neu_email}")
        return dict(result)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create user: {str(e)}")
        raise DatabaseException(f"Failed to create user: {str(e)}")


def get_user_by_id(user_id: int, db: Connection):
    """Get a user by their ID"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT user_id, neu_email, first_name, last_name, profile_picture
            FROM users
            WHERE user_id = %s
        """
        
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        cursor.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        logger.error(f"Failed to get user {user_id}: {str(e)}")
        raise DatabaseException(f"Failed to get user: {str(e)}")


def update_user(user_id: int, user_data: UserUpdate, db: Connection) -> dict:
    """Update a user's information"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        update_fields = []
        values = []
        
        if user_data.neu_email is not None:
            update_fields.append("neu_email = %s")
            values.append(user_data.neu_email)
        
        if user_data.first_name is not None:
            update_fields.append("first_name = %s")
            values.append(user_data.first_name)
        
        if user_data.last_name is not None:
            update_fields.append("last_name = %s")
            values.append(user_data.last_name)
        
        if user_data.password is not None:
            update_fields.append("password = %s")
            values.append(user_data.password)
        
        if user_data.profile_picture is not None:
            update_fields.append("profile_picture = %s")
            values.append(user_data.profile_picture)
        
        values.append(user_id)
        
        query = f"""
            UPDATE users
            SET {', '.join(update_fields)}
            WHERE user_id = %s
            RETURNING user_id, neu_email, first_name, last_name, profile_picture
        """
        
        cursor.execute(query, values)
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        
        logger.info(f"Updated user {user_id}")
        return dict(result) if result else None
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update user {user_id}: {str(e)}")
        raise DatabaseException(f"Failed to update user: {str(e)}")


def delete_user(user_id: int, db: Connection) -> bool:
    """Delete a user from the database"""
    try:
        cursor = db.cursor()
        
        query = "DELETE FROM users WHERE user_id = %s"
        cursor.execute(query, (user_id,))
        
        db.commit()
        deleted = cursor.rowcount > 0
        cursor.close()
        
        logger.info(f"Deleted user {user_id}")
        return deleted
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete user {user_id}: {str(e)}")
        raise DatabaseException(f"Failed to delete user: {str(e)}")


def check_email_exists(email: str, db: Connection) -> bool:
    """Check if an email already exists in the database"""
    try:
        cursor = db.cursor()
        
        query = "SELECT EXISTS(SELECT 1 FROM users WHERE neu_email = %s)"
        cursor.execute(query, (email,))
        
        exists = cursor.fetchone()[0]
        cursor.close()
        
        return exists
        
    except Exception as e:
        logger.error(f"Failed to check email {email}: {str(e)}")
        raise DatabaseException(f"Failed to check email: {str(e)}")