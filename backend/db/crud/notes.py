from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor, Json
from psycopg2.extensions import adapt, AsIs
from api.schemas.notes import NoteCreate, NoteUpdate
from core.exceptions import DatabaseException
import logging
from typing import List, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)

def create_note(note_data: NoteCreate, media_url: Optional[str], file_name: Optional[str], 
                file_url: Optional[str], file_size: Optional[int], notes_content: str, 
                user_id: int, course_section_id: int, db: Connection) -> dict:
    """Create a new note in the database"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        # Build attachments array - for jsonb[] we need an array of JSONB values
        attachments_data = []
        
        if media_url:
            attachments_data.append({
                'id': media_url.split('/')[-1].split('.')[0],
                'url': media_url,
                'filename': media_url.split('/')[-1],
                'type': 'image',
                'uploadedAt': datetime.utcnow().isoformat()
            })
        
        if file_url:
            attachments_data.append({
                'id': file_url.split('/')[-1].split('.')[0],
                'url': file_url,
                'filename': file_name,
                'size': file_size,
                'type': 'document',
                'uploadedAt': datetime.utcnow().isoformat()
            })
        
        # Build the array SQL string with proper jsonb casting for jsonb[]
        if attachments_data:
            # Create ARRAY[] with each element cast to jsonb
            jsonb_elements = []
            for item in attachments_data:
                json_str = json.dumps(item)
                # Escape single quotes in JSON string
                json_str_escaped = json_str.replace("'", "''")
                jsonb_elements.append(f"'{json_str_escaped}'::jsonb")
            
            attachments_sql = f"ARRAY[{','.join(jsonb_elements)}]::jsonb[]"
        else:
            attachments_sql = "ARRAY[]::jsonb[]"
        
        query = f"""
            INSERT INTO notes (
                user_id, course_id, title, description, date_uploaded, 
                notes_content, attachments
            )
            VALUES (%s, %s, %s, %s, %s, %s, {attachments_sql})
            RETURNING note_id, user_id, course_id, title, description, 
                      date_uploaded, notes_content, attachments
        """
        
        cursor.execute(query, (
            user_id,
            course_section_id,  # This is now course_section.id (FK)
            note_data.title,
            note_data.description,
            note_data.date,
            notes_content
        ))
        
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        
        logger.info(f"Created note with id: {result['note_id']}")
        
        return {
            **dict(result),
            'media_url': media_url,
            'file_name': file_name,
            'file_url': file_url,
            'file_size': file_size,
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create note: {str(e)}")
        raise DatabaseException(f"Failed to create note: {str(e)}")


def get_note_by_id(note_id: int, db: Connection) -> Optional[dict]:
    """Get a note by its ID with course section details"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                n.note_id, 
                n.user_id, 
                n.course_id,
                n.title, 
                n.description, 
                n.date_uploaded, 
                n.notes_content,
                cs.course_title,
                c.course as course_code,
                c.title as course_name,
                p.name as professor_name
            FROM notes n
            LEFT JOIN course_section cs ON n.course_id = cs.id
            LEFT JOIN course c ON cs.course_id = c.id
            LEFT JOIN professor p ON cs.professor_id = p.professor_id   
            WHERE n.note_id = %s
        """
        
        cursor.execute(query, (note_id,))
        result = cursor.fetchone()
        cursor.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        logger.error(f"Failed to get note {note_id}: {str(e)}")
        raise DatabaseException(f"Failed to get note: {str(e)}")


def get_all_notes(
    course_section_id: Optional[int] = None,
    search_query: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    db: Connection = None
) -> List[dict]:
    """Get all notes with optional filtering, including course section details"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        # Build dynamic WHERE clause
        conditions = []
        params = []
        
        if course_section_id:
            conditions.append("n.course_id = %s")
            params.append(course_section_id)
        
        if search_query:
            conditions.append("(n.title ILIKE %s OR n.description ILIKE %s OR c.course ILIKE %s)")
            search_pattern = f"%{search_query}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        if start_date:
            conditions.append("n.date_uploaded >= %s")
            params.append(start_date)
        
        if end_date:
            # Add one day to include the entire end date
            conditions.append("n.date_uploaded < %s::date + interval '1 day'")
            params.append(end_date)
        
        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)
        
        query = f"""
            SELECT 
                n.note_id, 
                n.user_id, 
                n.course_id,
                n.title, 
                n.description, 
                n.date_uploaded, 
                n.notes_content,
                cs.course_title,
                cs.id as course_section_id,
                c.course as course_code,
                c.title as course_name,
                p.name as professor_name
            FROM notes n
            LEFT JOIN course_section cs ON n.course_id = cs.id
            LEFT JOIN course c ON cs.course_id = c.id
            LEFT JOIN professor p ON cs.professor_id = p.professor_id
            {where_clause}
            ORDER BY n.date_uploaded DESC
            LIMIT %s OFFSET %s
        """
        
        params.extend([limit, skip])
        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()
        
        return [dict(row) for row in results]
        
    except Exception as e:
        logger.error(f"Failed to get notes: {str(e)}")
        raise DatabaseException(f"Failed to get notes: {str(e)}")


def get_available_course_sections(db: Connection) -> List[dict]:
    """Get list of unique course sections that have notes"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT DISTINCT
                cs.id as course_section_id,
                c.course as course_code,
                c.title as course_name,
                cs.course_title,
                p.name as professor_name
            FROM notes n
            JOIN course_section cs ON n.course_id = cs.id
            JOIN course c ON cs.course_id = c.id
            LEFT JOIN professor p ON cs.professor_id = p.professor_id
            ORDER BY c.course, cs.course_title
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        
        return [dict(row) for row in results]
        
    except Exception as e:
        logger.error(f"Failed to get available course sections: {str(e)}")
        raise DatabaseException(f"Failed to get available course sections: {str(e)}")


def count_notes(
    course_section_id: Optional[int] = None,
    search_query: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Connection = None
) -> int:
    """Count notes with optional filtering"""
    try:
        cursor = db.cursor()
        
        # Build dynamic WHERE clause (same as get_all_notes)
        conditions = []
        params = []
        
        if course_section_id:
            conditions.append("n.course_id = %s")
            params.append(course_section_id)
        
        if search_query:
            conditions.append("(n.title ILIKE %s OR n.description ILIKE %s OR c.course ILIKE %s)")
            search_pattern = f"%{search_query}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        if start_date:
            conditions.append("n.date_uploaded >= %s")
            params.append(start_date)
        
        if end_date:
            conditions.append("n.date_uploaded < %s::date + interval '1 day'")
            params.append(end_date)
        
        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)
        
        query = f"""
            SELECT COUNT(*) 
            FROM notes n
            LEFT JOIN course_section cs ON n.course_id = cs.id
            LEFT JOIN course c ON cs.course_id = c.id
            {where_clause}
        """
        
        cursor.execute(query, params)
        count = cursor.fetchone()[0]
        cursor.close()
        
        return count
        
    except Exception as e:
        logger.error(f"Failed to count notes: {str(e)}")
        raise DatabaseException(f"Failed to count notes: {str(e)}")


def update_note(note_id: int, note_data: NoteUpdate, notes_content: Optional[str],
                db: Connection) -> Optional[dict]:
    """Update a note's information"""
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        # Get existing note
        cursor.execute("SELECT * FROM notes WHERE note_id = %s", (note_id,))
        existing = cursor.fetchone()
        if not existing:
            return None
        
        update_fields = []
        values = []
        
        if note_data.title is not None:
            update_fields.append("title = %s")
            values.append(note_data.title)
        
        if note_data.description is not None:
            update_fields.append("description = %s")
            values.append(note_data.description)
        
        if note_data.date is not None:
            update_fields.append("date_uploaded = %s")
            values.append(note_data.date)
        
        if note_data.courseSectionId is not None:
            update_fields.append("course_id = %s")
            values.append(note_data.courseSectionId)
        
        # Update notes_content if new file was uploaded
        if notes_content is not None:
            update_fields.append("notes_content = %s")
            values.append(notes_content)
        
        if not update_fields:
            return None
        
        values.append(note_id)
        
        query = f"""
            UPDATE notes
            SET {', '.join(update_fields)}
            WHERE note_id = %s
            RETURNING *
        """
        
        cursor.execute(query, values)
        result = cursor.fetchone()
        db.commit()
        cursor.close()
        
        logger.info(f"Updated note {note_id}")
        return dict(result) if result else None
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update note {note_id}: {str(e)}")
        raise DatabaseException(f"Failed to update note: {str(e)}")


def delete_note(note_id: int, db: Connection) -> bool:
    """Delete a note from the database"""
    try:
        cursor = db.cursor()
        
        query = "DELETE FROM notes WHERE note_id = %s"
        cursor.execute(query, (note_id,))
        
        db.commit()
        deleted = cursor.rowcount > 0
        cursor.close()
        
        logger.info(f"Deleted note {note_id}")
        return deleted
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete note {note_id}: {str(e)}")
        raise DatabaseException(f"Failed to delete note: {str(e)}")


def check_note_exists(note_id: int, db: Connection) -> bool:
    """Check if a note exists in the database"""
    try:
        cursor = db.cursor()
        
        query = "SELECT EXISTS(SELECT 1 FROM notes WHERE note_id = %s)"
        cursor.execute(query, (note_id,))
        
        exists = cursor.fetchone()[0]
        cursor.close()
        
        return exists
        
    except Exception as e:
        logger.error(f"Failed to check note {note_id}: {str(e)}")
        raise DatabaseException(f"Failed to check note: {str(e)}")


def get_notes_by_course_section(course_section_id: int, db: Connection) -> List[dict]:
    """Get all notes for a specific course section"""
    return get_all_notes(course_section_id=course_section_id, db=db)


def count_notes_by_course_section(course_section_id: int, db: Connection) -> int:
    """Count the number of notes for a specific course section"""
    return count_notes(course_section_id=course_section_id, db=db)