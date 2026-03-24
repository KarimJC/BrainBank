from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from api.schemas.course_section import CourseSectionCreate, CourseSectionUpdate
from core.exceptions import DatabaseException
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


def get_all_course_sections(db: Connection) -> List[dict]:
    """Get all course sections with joined course and professor details"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT
                cs.id as course_section_id,
                cs.course_id,
                cs."course_CRN" as course_crn,
                cs.professor_id,
                c.course as course_code,
                c.title as course_name,
                c.title as course_title,
                c.subject,
                p.name as professor_name
            FROM course_section cs
            JOIN course c ON cs.course_id = c.id
            LEFT JOIN professor p ON cs.professor_id = p.professor_id
            ORDER BY c.course, c.title
        """
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Failed to get course sections: {str(e)}")
        raise DatabaseException(f"Failed to get course sections: {str(e)}")


def get_course_section_by_id(section_id: int, db: Connection) -> Optional[dict]:
    """Get course section by ID with joined course and professor details"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT
                cs.id as course_section_id,
                cs.course_id,
                cs."course_CRN" as course_crn,
                cs.professor_id,
                c.course as course_code,
                c.title as course_name,
                c.title as course_title,
                c.subject,
                p.name as professor_name
            FROM course_section cs
            JOIN course c ON cs.course_id = c.id
            LEFT JOIN professor p ON cs.professor_id = p.professor_id
            WHERE cs.id = %s
        """
        cursor.execute(query, (section_id,))
        result = cursor.fetchone()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Failed to find section_id {section_id}: {str(e)}")
        raise DatabaseException()


def create_course_section(course_section_data: CourseSectionCreate, db: Connection):
    """Create a new course section"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
        INSERT INTO public.course_section (course_id, "course_CRN", professor_id)
        VALUES (%s, %s, %s)
        RETURNING course_id, id,"course_CRN", professor_id
        """
        cursor.execute(query, (
            course_section_data.course_id,
            course_section_data.course_CRN,
            course_section_data.professor_id
        ))
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        logger.info(f"Created course section ID {result['id']} with CRN {result['course_CRN']}")
        return result
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create section - Course ID: {course_section_data.course_id}, CRN: {course_section_data.course_CRN}: {str(e)}")
        raise DatabaseException()


def get_course_sections_by_subject(subject: str, db: Connection):
    """Get all course sections for a given subject"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
        SELECT * FROM public.course_section INNER JOIN
        public.course ON public.course_section.course_id = public.course.id
        WHERE public.course.subject = %s
        """
        cursor.execute(query, (subject,))
        result = cursor.fetchall()
        cursor.close()
        return result if result else []
    except Exception as e:
        logger.error(f"Failed to get subject {subject}: {str(e)}")
        raise DatabaseException(f"Failed to get subject {subject}: {str(e)}")


def update_course_section(section_id: int, course_section_data: CourseSectionUpdate, db: Connection):
    """Update an existing course section"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        update_fields = []
        values = []

        if course_section_data.course_id is not None:
            update_fields.append("course_id = %s")
            values.append(course_section_data.course_id)

        if course_section_data.course_CRN is not None:
            update_fields.append('"course_CRN" = %s')
            values.append(course_section_data.course_CRN)

        if course_section_data.professor_id is not None:
            update_fields.append("professor_id = %s")
            values.append(course_section_data.professor_id)

        values.append(section_id)
        
        if  len(update_fields) ==0: #if we have not updated the fields, we want to close and return early 
            cursor.close()
            return get_course_section_by_id(section_id, db)

        query = f'''
            UPDATE public.course_section
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING course_id, id, "course_CRN", professor_id
        '''
        cursor.execute(query, values)
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        logger.info(f"Updated section_id {section_id}")
        return dict(result) if result else None
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update section_id {section_id}: {str(e)}")
        raise DatabaseException(f"Failed to update section_id {section_id}: {str(e)}")


def delete_course_section(section_id: int, db: Connection):
    """Delete a course section"""
    try:
        cursor = db.cursor()
        query = 'DELETE FROM public.course_section WHERE id = %s'
        cursor.execute(query, (section_id,))
        db.commit()
        deleted = cursor.rowcount > 0
        cursor.close()
        logger.info(f"Deleted section_id {section_id}")
        return deleted
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete section_id {section_id}: {str(e)}")
        raise DatabaseException(f"Failed to delete section_id {section_id}: {str(e)}")


def check_crn_exists(crn: int, db: Connection):
    """Check if a CRN already exists"""
    try:
        cursor = db.cursor()
        query = 'SELECT EXISTS(SELECT 1 FROM public.course_section WHERE "course_CRN" = %s)'
        cursor.execute(query, (crn,))
        exists = cursor.fetchone()[0]
        cursor.close()
        return exists
    except Exception as e:
        logger.error(f"Failed to find crn {crn}: {str(e)}")
        raise DatabaseException(f"Failed to find crn {crn}: {str(e)}")