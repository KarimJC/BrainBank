from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from core.exceptions import DatabaseException
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

def get_all_course_sections(db: Connection) -> List[dict]:
    """Get all course sections with course and professor details"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                cs.id as course_section_id,
                cs.course_id,
                cs.course_title,
                cs."course_CRN" as course_crn,
                cs.professor_id,
                c.course as course_code,
                c.title as course_name,
                c.subject,
                p.name as professor_name
            FROM course_section cs
            JOIN course c ON cs.course_id = c.id
            LEFT JOIN professor p ON cs.professor_id = p.professor_id
            ORDER BY c.course, cs.course_title
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        
        return [dict(row) for row in results]
        
    except Exception as e:
        logger.error(f"Failed to get course sections: {str(e)}")
        raise DatabaseException(f"Failed to get course sections: {str(e)}")


def get_course_section_by_id(course_section_id: int, db: Connection) -> Optional[dict]:
    """Get a specific course section with details"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                cs.id as course_section_id,
                cs.course_id,
                cs.course_title,
                cs."course_CRN" as course_crn,
                cs.professor_id,
                c.course as course_code,
                c.title as course_name,
                c.subject,
                p.name as professor_name
            FROM course_section cs
            JOIN course c ON cs.course_id = c.id
            LEFT JOIN professor p ON cs.professor_id = p.professor_id
            WHERE cs.id = %s
        """
        
        cursor.execute(query, (course_section_id,))
        result = cursor.fetchone()
        cursor.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        logger.error(f"Failed to get course section {course_section_id}: {str(e)}")
        raise DatabaseException(f"Failed to get course section: {str(e)}")