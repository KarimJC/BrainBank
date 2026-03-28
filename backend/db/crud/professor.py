from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from api.schemas.professor import ProfessorCreate, ProfessorUpdate
from core.exceptions import DatabaseException
import logging

logger = logging.getLogger(__name__)


def create_professor(professor_data: ProfessorCreate, db: Connection) -> dict:
    """Create a new professor in the database"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        query = """
            INSERT INTO public.professor (name, email)
            VALUES (%s, %s)
            RETURNING professor_id, name, email
        """

        cursor.execute(
            query,
            (
                professor_data.name,
                professor_data.email,
            ),
        )

        result = cursor.fetchone()
        db.commit()
        cursor.close()

        logger.info(f"Created professor with email: {professor_data.email}")
        return dict(result)

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create professor: {str(e)}")
        raise DatabaseException(f"Failed to create professor: {str(e)}")


def get_professor_by_id(professor_id: int, db: Connection):
    """Get a professor by their ID"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT professor_id, name, email
            FROM public.professor
            WHERE professor_id = %s
        """

        cursor.execute(query, (professor_id,))
        result = cursor.fetchone()
        cursor.close()

        return dict(result) if result else None

    except Exception as e:
        logger.error(f"Failed to get professor {professor_id}: {str(e)}")
        raise DatabaseException(f"Failed to get professor: {str(e)}")


def update_professor(professor_id: int, professor_data: ProfessorUpdate, db: Connection) -> dict:
    """Update a professor's information"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        update_fields = []
        values = []

        if professor_data.name is not None:
            update_fields.append("name = %s")
            values.append(professor_data.name)

        if professor_data.email is not None:
            update_fields.append("email = %s")
            values.append(professor_data.email)

        values.append(professor_id)

        query = f"""
            UPDATE public.professor
            SET {", ".join(update_fields)}
            WHERE professor_id = %s
            RETURNING professor_id, name, email
        """

        cursor.execute(query, values)
        result = cursor.fetchone()
        db.commit()
        cursor.close()

        logger.info(f"Updated professor {professor_id}")
        return dict(result) if result else None

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update professor {professor_id}: {str(e)}")
        raise DatabaseException(f"Failed to update professor: {str(e)}")


def delete_professor(professor_id: int, db: Connection) -> bool:
    """Delete a professor from the database"""
    try:
        cursor = db.cursor()

        query = "DELETE FROM public.professor WHERE professor_id = %s"
        cursor.execute(query, (professor_id,))

        db.commit()
        deleted = cursor.rowcount > 0
        cursor.close()

        logger.info(f"Deleted professor {professor_id}")
        return deleted

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete professor {professor_id}: {str(e)}")
        raise DatabaseException(f"Failed to delete professor: {str(e)}")


def check_professor_email_exists(email: str, db: Connection) -> bool:
    """Check if an email already exists in the database"""
    try:
        cursor = db.cursor()

        query = "SELECT EXISTS(SELECT 1 FROM public.professor WHERE email = %s)"
        cursor.execute(query, (email,))

        exists = cursor.fetchone()[0]
        cursor.close()

        return exists

    except Exception as e:
        logger.error(f"Failed to check email {email}: {str(e)}")
        raise DatabaseException(f"Failed to check email: {str(e)}")
