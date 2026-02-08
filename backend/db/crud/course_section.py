from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor
from api.schemas.course_section import CourseSectionCreate, CourseSectionUpdate
from core.exceptions import DatabaseException
import logging


def create_course_section(course_section_data: CourseSectionCreate, db: Connection):
    """Create a new course section"""
    pass


def get_course_section_by_id(section_id: int, db: Connection):
    """Get course section by ID"""
    pass


def get_course_sections_by_subject(subject: str, db: Connection):
    """Get all course sections for a given subject (requires JOIN with course table)"""
    pass


def update_course_section(section_id: int, course_section_data: CourseSectionUpdate, db: Connection):
    """Update an existing course section"""
    pass


def delete_course_section(section_id: int, db: Connection):
    """Delete a course section"""
    pass


def check_crn_exists(crn: int, db: Connection):
    """Check if a CRN already exists"""
    pass