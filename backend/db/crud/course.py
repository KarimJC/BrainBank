from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from api.schemas.courses import CourseCreate, CourseUpdate
from core.exceptions import DatabaseException
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def create_course(course_data: CourseCreate, db: Connection) -> dict:
    """Create a new course in the database"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            INSERT INTO courses (course, title, subject)
            VALUES (%s, %s, %s)
            RETURNING course_id, course, title, subject
        """
        
        cursor.execute(query, (
            course_data.course,
            course_data.title,
            course_data.subject,
        ))
        
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        
        logger.info(f"Created course: {course_data.course} ({course_data.title})")
        return dict(result)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create course: {str(e)}")
        raise DatabaseException(f"Failed to create course: {str(e)}")


def get_course_by_id(id: int, db: Connection) -> Optional[dict]:
    """Get a course by its ID"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT *
            FROM courses
            WHERE id = %s
        """
        
        cursor.execute(query, (id,))
        result = cursor.fetchone()
        cursor.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        logger.error(f"Failed to get course {course_id}: {str(e)}")
        raise DatabaseException(f"Failed to get course: {str(e)}")


def get_all_courses(db: Connection, subject: Optional[str] = None) -> list[dict]:
    """Get all courses, optionally filtered by subject"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        if subject:
            query = """
                SELECT *
                FROM course
                WHERE subject = %s
            """
            cursor.execute(query, (subject,))
        else:
            query = """
                SELECT *
                FROM course
            """
            cursor.execute(query)
        
        results = cursor.fetchall()
        cursor.close()
        
        return [dict(row) for row in results]
        
    except Exception as e:
        logger.error(f"Failed to get courses: {str(e)}")
        raise DatabaseException(f"Failed to get courses: {str(e)}")


def update_course(course_id: int, course_data: CourseUpdate, db: Connection) -> Optional[dict]:
    """Update a course's information"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        update_fields = []
        values = []
        
        if course_data.course_title is not None:
            update_fields.append("course_title = %s")
            values.append(course_data.course_title)
        
        if course_data.course_code is not None:
            update_fields.append("course_code = %s")
            values.append(course_data.course_code)
        
        if course_data.course_CRN is not None:
            update_fields.append("course_CRN = %s")
            values.append(course_data.course_CRN)
        
        if course_data.professor_id is not None:
            update_fields.append("professor_id = %s")
            values.append(course_data.professor_id)
        
        if course_data.subject is not None:
            update_fields.append("subject = %s")
            values.append(course_data.subject)
        
        if not update_fields:
            # No fields to update, return current course
            return get_course_by_id(course_id, db)
        
        values.append(course_id)
        
        query = f"""
            UPDATE courses
            SET {', '.join(update_fields)}
            WHERE course_id = %s
            RETURNING course_id, course_title, course_code, course_CRN, professor_id, subject
        """
        
        cursor.execute(query, values)
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        
        logger.info(f"Updated course {course_id}")
        return dict(result) if result else None
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update course {course_id}: {str(e)}")
        raise DatabaseException(f"Failed to update course: {str(e)}")


def delete_course(course_id: int, db: Connection) -> bool:
    """Delete a course from the database"""
    try:
        cursor = db.cursor()
        
        query = "DELETE FROM courses WHERE course_id = %s"
        cursor.execute(query, (course_id,))
        
        db.commit()
        deleted = cursor.rowcount > 0
        cursor.close()
        
        logger.info(f"Deleted course {course_id}")
        return deleted
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete course {course_id}: {str(e)}")
        raise DatabaseException(f"Failed to delete course: {str(e)}")
