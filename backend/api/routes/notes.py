from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends, Request
from typing import Optional, List
import uuid
import shutil
from pathlib import Path
from api.schemas.notes import NoteCreate, NoteUpdate, NoteResponse, DeleteResponse
from db.connection import get_db
from db.crud.notes import (
    create_note, get_note_by_id, get_all_notes, 
    update_note, delete_note, check_note_exists,
    get_notes_by_course_section, get_available_course_sections, count_notes
)
from utils.ocr import extract_text_from_file

router = APIRouter(
    prefix="/api/notes",
    tags=["notes"]
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# TODO: Replace with actual user_id from authentication/session
DEFAULT_USER_ID = 5

def get_full_url(request: Request, path: Optional[str]) -> Optional[str]:
    """Convert relative path to full URL"""
    if not path:
        return None
    base_url = str(request.base_url).rstrip('/')
    return f"{base_url}{path}"

@router.post("", response_model=NoteResponse, status_code=201)
async def create_note_endpoint(
    request: Request,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    date: str = Form(...),
    courseSectionId: int = Form(...),  # Now accepting course_section ID
    media: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    conn = Depends(get_db)
):
    """Create a new note with optional media/file attachments"""
    if not media and not file:
        raise HTTPException(status_code=400, detail="At least one attachment required")
    
    # Verify course section exists
    course_section = get_course_section_by_id(courseSectionId, conn)
    if not course_section:
        raise HTTPException(status_code=400, detail=f"Course section {courseSectionId} not found")
    
    try:
        note_data = NoteCreate(
            title=title,
            description=description,
            date=date,
            courseSectionId=courseSectionId
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    note_id = uuid.uuid4().hex
    
    # Save media file
    media_url = None
    media_path = None
    file_to_extract = None
    file_mime_type = None
    
    if media:
        try:
            file_ext = Path(media.filename).suffix
            media_filename = f"{note_id}_media{file_ext}"
            media_path = UPLOAD_DIR / media_filename
            with media_path.open("wb") as buffer:
                shutil.copyfileobj(media.file, buffer)
            media_url = f"/uploads/{media_filename}"
            file_to_extract = media_path
            file_mime_type = media.content_type
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save media: {str(e)}")
    
    # Save document file
    file_url = None
    file_name = None
    file_size = None
    file_path = None
    if file:
        try:
            file.file.seek(0, 2)
            file_size = file.file.tell()
            file.file.seek(0)
            
            file_ext = Path(file.filename).suffix
            file_filename = f"{note_id}_file{file_ext}"
            file_path = UPLOAD_DIR / file_filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_url = f"/uploads/{file_filename}"
            file_name = file.filename
            file_to_extract = file_path
            file_mime_type = file.content_type
        except Exception as e:
            # Clean up media if file upload fails
            if media_url and media_path and media_path.exists():
                media_path.unlink()
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Extract text using OCR
    notes_content = ""
    
    if file_to_extract:
        try:
            # Extract text using OCR
            notes_content = extract_text_from_file(file_to_extract, file_mime_type)
            if notes_content:
                print(f"✅ Extracted {len(notes_content)} characters from file")
            else:
                print("⚠️ No text extracted from file")
        except Exception as e:
            print(f"⚠️ OCR extraction failed: {str(e)}")
            # Continue anyway - OCR is optional
    
    # Create note in database
    try:
        note_record = create_note(
            note_data, media_url, file_name, file_url, file_size, notes_content,
            DEFAULT_USER_ID, courseSectionId, conn
        )
        
        return NoteResponse(
            noteId=note_record['note_id'],
            title=note_record['title'],
            description=note_record['description'],
            dateUploaded=str(note_record['date_uploaded']),
            courseSectionId=courseSectionId,
            courseCode=course_section['course_code'],
            courseName=course_section['course_name'],
            professorName=course_section.get('professor_name'),
            mediaUrl=get_full_url(request, media_url),
            fileName=file_name,
            fileUrl=get_full_url(request, file_url),
            fileSize=file_size
        )
    except Exception as e:
        # Clean up uploaded files if database insert fails
        if media_url and media_path and media_path.exists():
            media_path.unlink()
        if file_url and file_path and file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[NoteResponse])
async def get_notes_endpoint(
    request: Request,
    courseSectionId: Optional[int] = None,
    search: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    conn = Depends(get_db)
):
    """Get all notes with optional filtering by course section, search query, and date range"""
    try:
        notes = get_all_notes(
            course_section_id=courseSectionId,
            search_query=search,
            start_date=startDate,
            end_date=endDate,
            limit=limit,
            skip=skip,
            db=conn
        )
        
        return [
            NoteResponse(
                noteId=note['note_id'],
                title=note['title'],
                description=note['description'],
                dateUploaded=str(note['date_uploaded']),
                courseSectionId=note.get('course_section_id'),
                courseCode=note.get('course_code'),
                courseName=note.get('course_name'),
                professorName=note.get('professor_name'),
                mediaUrl=get_full_url(request, note.get('media_url')),
                fileName=note.get('file_name'),
                fileUrl=get_full_url(request, note.get('file_url')),
                fileSize=note.get('file_size')
            )
            for note in notes
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/course-sections", response_model=List[dict])
async def get_available_course_sections_endpoint(conn = Depends(get_db)):
    """Get list of course sections that have notes"""
    try:
        course_sections = get_available_course_sections(conn)
        return course_sections
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/count", response_model=dict)
async def count_notes_endpoint(
    courseSectionId: Optional[int] = None,
    search: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    conn = Depends(get_db)
):
    """Count notes with optional filtering"""
    try:
        total = count_notes(
            course_section_id=courseSectionId,
            search_query=search,
            start_date=startDate,
            end_date=endDate,
            db=conn
        )
        return {"count": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/course-section/{course_section_id}", response_model=List[NoteResponse])
async def get_notes_by_course_section_endpoint(
    request: Request,
    course_section_id: int,
    conn = Depends(get_db)
):
    """Get all notes for a specific course section"""
    try:
        notes = get_notes_by_course_section(course_section_id, conn)
        
        if not notes:
            return []
        
        return [
            NoteResponse(
                noteId=note['note_id'],
                title=note['title'],
                description=note['description'],
                dateUploaded=str(note['date_uploaded']),
                courseSectionId=note.get('course_section_id'),
                courseCode=note.get('course_code'),
                courseName=note.get('course_name'),
                professorName=note.get('professor_name'),
                mediaUrl=get_full_url(request, note.get('media_url')),
                fileName=note.get('file_name'),
                fileUrl=get_full_url(request, note.get('file_url')),
                fileSize=note.get('file_size')
            )
            for note in notes
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note_endpoint(
    request: Request,
    note_id: int,
    conn = Depends(get_db)
):
    """Get a specific note by ID"""
    try:
        note = get_note_by_id(note_id, conn)
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return NoteResponse(
            noteId=note['note_id'],
            title=note['title'],
            description=note['description'],
            dateUploaded=str(note['date_uploaded']),
            courseSectionId=note.get('course_section_id'),
            courseCode=note.get('course_code'),
            courseName=note.get('course_name'),
            professorName=note.get('professor_name'),
            mediaUrl=get_full_url(request, note.get('media_url')),
            fileName=note.get('file_name'),
            fileUrl=get_full_url(request, note.get('file_url')),
            fileSize=note.get('file_size')
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note_endpoint(
    request: Request,
    note_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    date: Optional[str] = Form(None),
    courseSectionId: Optional[int] = Form(None),
    media: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    conn = Depends(get_db)
):
    """Update an existing note"""
    # Check if note exists
    if not check_note_exists(note_id, conn):
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Get existing note for file cleanup
    existing_note = get_note_by_id(note_id, conn)
    
    try:
        note_data = NoteUpdate(
            title=title,
            description=description,
            date=date,
            courseSectionId=courseSectionId
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Handle media update
    media_url = None
    file_to_extract = None
    file_mime_type = None
    
    if media:
        # Delete old media if exists
        if existing_note.get('media_url'):
            old_media_path = UPLOAD_DIR / Path(existing_note['media_url']).name
            if old_media_path.exists():
                old_media_path.unlink()
        
        try:
            file_ext = Path(media.filename).suffix
            media_filename = f"{note_id}_media{file_ext}"
            media_path = UPLOAD_DIR / media_filename
            with media_path.open("wb") as buffer:
                shutil.copyfileobj(media.file, buffer)
            media_url = f"/uploads/{media_filename}"
            file_to_extract = media_path
            file_mime_type = media.content_type
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save media: {str(e)}")
    
    # Handle file update
    file_url = None
    file_name = None
    file_size = None
    if file:
        # Delete old file if exists
        if existing_note.get('file_url'):
            old_file_path = UPLOAD_DIR / Path(existing_note['file_url']).name
            if old_file_path.exists():
                old_file_path.unlink()
        
        try:
            file.file.seek(0, 2)
            file_size = file.file.tell()
            file.file.seek(0)
            
            file_ext = Path(file.filename).suffix
            file_filename = f"{note_id}_file{file_ext}"
            file_path = UPLOAD_DIR / file_filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_url = f"/uploads/{file_filename}"
            file_name = file.filename
            file_to_extract = file_path
            file_mime_type = file.content_type
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Extract text if new file was uploaded
    notes_content = None
    if file_to_extract:
        try:
            notes_content = extract_text_from_file(file_to_extract, file_mime_type)
            print(f"✅ Extracted {len(notes_content)} characters from updated file")
        except Exception as e:
            print(f"⚠️ OCR extraction failed: {str(e)}")
    
    # Update note in database
    try:
        updated_note = update_note(note_id, note_data, notes_content, conn)
        
        if not updated_note:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Get course section details
        course_section_id = courseSectionId or existing_note.get('course_id')
        course_section = get_course_section_by_id(course_section_id, conn) if course_section_id else None
        
        return NoteResponse(
            noteId=updated_note['note_id'],
            title=updated_note['title'],
            description=updated_note['description'],
            dateUploaded=str(updated_note['date_uploaded']),
            courseSectionId=course_section_id,
            courseCode=course_section['course_code'] if course_section else existing_note.get('course_code'),
            courseName=course_section['course_name'] if course_section else existing_note.get('course_name'),
            professorName=course_section.get('professor_name') if course_section else existing_note.get('professor_name'),
            mediaUrl=get_full_url(request, media_url or existing_note.get('media_url')),
            fileName=file_name or existing_note.get('file_name'),
            fileUrl=get_full_url(request, file_url or existing_note.get('file_url')),
            fileSize=file_size or existing_note.get('file_size')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{note_id}", response_model=DeleteResponse)
async def delete_note_endpoint(note_id: int, conn = Depends(get_db)):
    """Delete a note by ID"""
    # Get note to delete associated files
    try:
        note = get_note_by_id(note_id, conn)
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Delete associated files from filesystem
        if note.get('media_url'):
            media_path = UPLOAD_DIR / Path(note['media_url']).name
            if media_path.exists():
                media_path.unlink()
        
        if note.get('file_url'):
            file_path = UPLOAD_DIR / Path(note['file_url']).name
            if file_path.exists():
                file_path.unlink()
        
        # Delete from database
        deleted = delete_note(note_id, conn)
        
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete note")
        
        return DeleteResponse(message="Note deleted successfully", id=note_id)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))