from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends, Request
from typing import Optional, List
import uuid
from pathlib import Path
from api.schemas.notes import NoteCreate, NoteUpdate, NoteResponse, DeleteResponse
from db.connection import get_db
from db.crud.notes import (
    create_note,
    get_note_by_id,
    get_all_notes,
    update_note,
    delete_note,
    check_note_exists,
    get_notes_by_course_section,
    get_notes_by_course,
    get_available_course_sections,
    count_notes,
)
from db.crud.course_section import get_course_section_by_id
from db.crud.user import get_user_by_auth_id
from utils.ocr import extract_text
from utils.storage import upload_file, delete_file
from auth import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/heic", "image/heif", "application/pdf",
}
MAX_FILE_SIZE = 10 * 1024 * 1024


def _map_note(note: dict) -> NoteResponse:
    return NoteResponse(
        noteId=note["note_id"],
        title=note["title"],
        description=note["description"],
        dateUploaded=str(note["date_uploaded"]),
        courseSectionId=note.get("course_section_id"),
        courseCode=note.get("course_code"),
        courseName=note.get("course_name"),
        professorName=note.get("professor_name"),
        uploaderName=note.get("uploader_name"),
        notesContent=note.get("notes_content"),
        mediaUrl=note.get("media_url"),
        fileName=note.get("file_name"),
        fileUrl=note.get("file_url"),
        fileSize=note.get("file_size"),
    )


def validate_upload(file: UploadFile, data: bytes):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Allowed types: JPEG, PNG, HEIC, PDF.",
        )
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")


# ── GET available course sections ──────────────────────────────────────────────
@router.get("/course-sections", response_model=List[dict])
async def get_available_course_sections_endpoint(conn=Depends(get_db)):
    try:
        return get_available_course_sections(conn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET count ──────────────────────────────────────────────────────────────────
@router.get("/count", response_model=dict)
async def count_notes_endpoint(
    courseSectionId: Optional[int] = None,
    search: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        user = get_user_by_auth_id(current_user["auth_id"], conn)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        total = count_notes(
            course_section_id=courseSectionId,
            search_query=search,
            start_date=startDate,
            end_date=endDate,
            user_id=user["user_id"],
            db=conn,
        )
        return {"count": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET notes for all sections of a course (+ optional professor filter) ───────
@router.get("/course/{course_id}", response_model=List[NoteResponse])
async def get_notes_by_course_endpoint(
    course_id: int,
    professor_id: Optional[int] = None,
    conn=Depends(get_db),
):
    """
    Returns notes from every section of `course_id`.
    Pass `professor_id` to narrow down to a specific professor's sections only.
    This is the default 'all sections' view on the course page.
    """
    try:
        notes = get_notes_by_course(course_id, professor_id, conn)
        return [_map_note(n) for n in notes]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET notes for a specific section (user's own section view) ─────────────────
@router.get("/course-section/{course_section_id}", response_model=List[NoteResponse])
async def get_notes_by_course_section_endpoint(
    course_section_id: int,
    conn=Depends(get_db),
):
    try:
        notes = get_notes_by_course_section(course_section_id, conn)
        return [_map_note(n) for n in notes]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET all notes (filtered) ───────────────────────────────────────────────────
@router.get("", response_model=List[NoteResponse])
async def get_notes_endpoint(
    request: Request,
    courseSectionId: Optional[int] = None,
    search: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        user = get_user_by_auth_id(current_user["auth_id"], conn)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        notes = get_all_notes(
            course_section_id=courseSectionId,
            search_query=search,
            start_date=startDate,
            end_date=endDate,
            limit=limit,
            skip=skip,
            user_id=user["user_id"],
            db=conn,
        )
        return [_map_note(n) for n in notes]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST create note ───────────────────────────────────────────────────────────
@router.post("", response_model=NoteResponse, status_code=201)
async def create_note_endpoint(
    request: Request,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    date: str = Form(...),
    courseSectionId: int = Form(...),
    media: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if not media and not file:
        raise HTTPException(status_code=400, detail="At least one attachment required")

    user = get_user_by_auth_id(current_user["auth_id"], conn)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    course_section = get_course_section_by_id(courseSectionId, conn)
    if not course_section:
        raise HTTPException(status_code=400, detail=f"Course section {courseSectionId} not found")

    try:
        note_data = NoteCreate(title=title, description=description, date=date, courseSectionId=courseSectionId)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    note_id = uuid.uuid4().hex
    media_url = file_url = file_name = file_size = file_data = file_mime_type = None

    if media:
        try:
            data = await media.read()
            validate_upload(media, data)
            ext = Path(media.filename).suffix
            media_url = upload_file(data, f"{note_id}/media{ext}", media.content_type)
            file_data, file_mime_type = data, media.content_type
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload media: {str(e)}")

    if file:
        try:
            data = await file.read()
            validate_upload(file, data)
            file_size = len(data)
            ext = Path(file.filename).suffix
            file_url = upload_file(data, f"{note_id}/file{ext}", file.content_type)
            file_name = file.filename
            file_data, file_mime_type = data, file.content_type
        except HTTPException:
            if media_url:
                delete_file(f"{note_id}/media{Path(media.filename).suffix}")
            raise
        except Exception as e:
            if media_url:
                delete_file(f"{note_id}/media{Path(media.filename).suffix}")
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    notes_content = ""
    if file_data and file_mime_type:
        try:
            notes_content = extract_text(file_data, file_mime_type)
        except Exception as e:
            print(f"OCR extraction failed: {str(e)}")

    try:
        record = create_note(
            note_data, media_url, file_name, file_url, file_size,
            notes_content, user["user_id"], courseSectionId, conn,
        )
        return NoteResponse(
            noteId=record["note_id"],
            title=record["title"],
            description=record["description"],
            dateUploaded=str(record["date_uploaded"]),
            courseSectionId=courseSectionId,
            courseCode=course_section["course_code"],
            courseName=course_section["course_name"],
            professorName=course_section.get("professor_name"),
            uploaderName=None,
            notesContent=record.get("notes_content"),
            mediaUrl=media_url,
            fileName=file_name,
            fileUrl=file_url,
            fileSize=file_size,
        )
    except Exception as e:
        if media_url:
            delete_file(f"{note_id}/media{Path(media.filename).suffix}")
        if file_url:
            delete_file(f"{note_id}/file{Path(file.filename).suffix}")
        raise HTTPException(status_code=500, detail=str(e))


# ── GET note by id ─────────────────────────────────────────────────────────────
@router.get("/{note_id}", response_model=NoteResponse)
async def get_note_endpoint(request: Request, note_id: int, conn=Depends(get_db)):
    try:
        note = get_note_by_id(note_id, conn)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        # NOTE: original code had course_code/course_name swapped — fixed here
        return NoteResponse(
            noteId=note["note_id"],
            title=note["title"],
            description=note["description"],
            dateUploaded=str(note["date_uploaded"]),
            courseSectionId=note.get("course_section_id"),
            courseCode=note.get("course_code"),
            courseName=note.get("course_name"),
            professorName=note.get("professor_name"),
            uploaderName=note.get("uploader_name"),
            notesContent=note.get("notes_content"),
            mediaUrl=note.get("media_url"),
            fileName=note.get("file_name"),
            fileUrl=note.get("file_url"),
            fileSize=note.get("file_size"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── PUT update note ────────────────────────────────────────────────────────────
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
    conn=Depends(get_db),
):
    if not check_note_exists(note_id, conn):
        raise HTTPException(status_code=404, detail="Note not found")

    existing = get_note_by_id(note_id, conn)

    try:
        note_data = NoteUpdate(title=title, description=description, date=date, courseSectionId=courseSectionId)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    media_url = file_url = file_name = file_size = file_data = file_mime_type = None

    if media:
        try:
            data = await media.read()
            validate_upload(media, data)
            ext = Path(media.filename).suffix
            if existing.get("media_url"):
                delete_file(f"{note_id}/media{Path(existing['media_url']).suffix}")
            media_url = upload_file(data, f"{note_id}/media{ext}", media.content_type)
            file_data, file_mime_type = data, media.content_type
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload media: {str(e)}")

    if file:
        try:
            data = await file.read()
            validate_upload(file, data)
            file_size = len(data)
            ext = Path(file.filename).suffix
            if existing.get("file_url"):
                delete_file(f"{note_id}/file{Path(existing['file_url']).suffix}")
            file_url = upload_file(data, f"{note_id}/file{ext}", file.content_type)
            file_name = file.filename
            file_data, file_mime_type = data, file.content_type
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    notes_content = None
    if file_data and file_mime_type:
        try:
            notes_content = extract_text(file_data, file_mime_type)
        except Exception as e:
            print(f"OCR extraction failed: {str(e)}")

    try:
        updated = update_note(note_id, note_data, notes_content, conn)
        if not updated:
            raise HTTPException(status_code=400, detail="No fields to update")

        full = get_note_by_id(note_id, conn)
        section_id = courseSectionId or existing.get("course_section_id")
        section = get_course_section_by_id(section_id, conn) if section_id else None

        return NoteResponse(
            noteId=full["note_id"],
            title=full["title"],
            description=full["description"],
            dateUploaded=str(full["date_uploaded"]),
            courseSectionId=section_id,
            courseCode=section["course_code"] if section else existing.get("course_code"),
            courseName=section["course_name"] if section else existing.get("course_name"),
            professorName=section.get("professor_name") if section else existing.get("professor_name"),
            uploaderName=full.get("uploader_name"),
            notesContent=full.get("notes_content"),
            mediaUrl=media_url or existing.get("media_url"),
            fileName=file_name or existing.get("file_name"),
            fileUrl=file_url or existing.get("file_url"),
            fileSize=file_size or existing.get("file_size"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── DELETE note ────────────────────────────────────────────────────────────────
@router.delete("/{note_id}", response_model=DeleteResponse)
async def delete_note_endpoint(note_id: int, conn=Depends(get_db)):
    try:
        note = get_note_by_id(note_id, conn)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        if note.get("media_url"):
            delete_file(f"{note_id}/media{Path(note['media_url']).suffix}")
        if note.get("file_url"):
            delete_file(f"{note_id}/file{Path(note['file_url']).suffix}")

        if not delete_note(note_id, conn):
            raise HTTPException(status_code=500, detail="Failed to delete note")

        return DeleteResponse(message="Note deleted successfully", id=note_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))