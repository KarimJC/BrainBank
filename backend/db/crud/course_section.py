from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from api.schemas.course_section import CourseSectionCreate, CourseSectionUpdate
from core.exceptions import DatabaseException
import logging

logger = logging.getLogger(__name__)

def create_course_section(course_section_data: CourseSectionCreate, db: Connection):
    """Create a new course section"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
        INSERT INTO public.course_section (course_id, course_title, "course_CRN", professor_id)
        VALUES (%s, %s, %s, %s)
        RETURNING course_id, id, course_title, "course_CRN", professor_id
        """
        cursor.execute(query, (
            course_section_data.course_id, 
            course_section_data.course_title,
            course_section_data.course_crn, 
            course_section_data.professor_id
        ))
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        logger.info(f"Created course section ID {result['id']} with CRN {result['course_CRN']}")
        return result
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create section - Course ID: {course_section_data.course_id}, CRN: {course_section_data.course_crn}: {str(e)}")
        raise DatabaseException()




def get_course_section_by_id(section_id: int, db: Connection):
    """Get course section by ID"""
    try:
        cursor = db.cursor()
        query = 'SELECT * FROM public.course_section WHERE id = %s'
        cursor.execute(query, (section_id,))
        row = cursor.fetchone()
        cursor.close()
        if row:
            return row 
        else:
            return None 
    except Exception as e:
        logger.error(f"Failed to find section_id {section_id}: {str(e)}")
        raise DatabaseException()
        



def get_course_sections_by_subject(subject: str, db: Connection):
    """Get all course sections for a given subject (requires JOIN with course table)"""
    pass


def update_course_section(section_id: int, course_section_data: CourseSectionUpdate, db: Connection):
    """Update an existing course section"""
    pass


def delete_course_section(section_id: int, db: Connection):
    """Delete a course section"""
    try:
        cursor = db.cursor()
        query = 'DELETE FROM public.course_section WHERE id = %s'
        cursor.execute(query, (section_id,))
        db.commit()
        deleted = cursor.rowcount > 0
        cursor.close()
        
        logger.info(f"Deleted section_id  {section_id}")
        return deleted
    
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete section_id {section_id}: {str(e)}")
        raise DatabaseException()



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
        raise DatabaseException()
