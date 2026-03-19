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
    get_available_course_sections,
    count_notes,
)
from db.crud.course_section import get_course_section_by_id
from db.crud.user import get_user_by_auth_id
from utils.ocr import extract_text
from utils.storage import upload_file, delete_file
from auth import get_current_user

router = APIRouter(prefix="/api/notes", tags=["notes"])

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif",
    "application/pdf",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_upload(file: UploadFile, data: bytes):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400, detail=f"File type '{file.content_type}' not allowed. Allowed types: JPEG, PNG, HEIC, PDF."
        )
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")


@router.get("/course-sections", response_model=List[dict])
async def get_available_course_sections_endpoint(conn=Depends(get_db)):
    try:
        return get_available_course_sections(conn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/course-section/{course_section_id}", response_model=List[NoteResponse])
async def get_notes_by_course_section_endpoint(request: Request, course_section_id: int, conn=Depends(get_db)):
    try:
        notes = get_notes_by_course_section(course_section_id, conn)
        return [
            NoteResponse(
                noteId=note["note_id"],
                title=note["title"],
                description=note["description"],
                dateUploaded=str(note["date_uploaded"]),
                courseSectionId=note.get("course_section_id"),
                courseCode=note.get("course_name"),
                courseName=note.get("course_code"),
                professorName=note.get("professor_name"),
                notesContent=note.get("notes_content"),
                mediaUrl=note.get("media_url"),
                fileName=note.get("file_name"),
                fileUrl=note.get("file_url"),
                fileSize=note.get("file_size"),
            )
            for note in notes
        ]
    except Exception as e:
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
        return [
            NoteResponse(
                noteId=note["note_id"],
                title=note["title"],
                description=note["description"],
                dateUploaded=str(note["date_uploaded"]),
                courseSectionId=note.get("course_section_id"),
                courseCode=note.get("course_name"),
                courseName=note.get("course_code"),
                professorName=note.get("professor_name"),
                notesContent=note.get("notes_content"),
                mediaUrl=note.get("media_url"),
                fileName=note.get("file_name"),
                fileUrl=note.get("file_url"),
                fileSize=note.get("file_size"),
            )
            for note in notes
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

    user_id = user["user_id"]

    course_section = get_course_section_by_id(courseSectionId, conn)
    if not course_section:
        raise HTTPException(status_code=400, detail=f"Course section {courseSectionId} not found")

    try:
        note_data = NoteCreate(title=title, description=description, date=date, courseSectionId=courseSectionId)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    note_id = uuid.uuid4().hex
    media_url = None
    file_url = None
    file_name = None
    file_size = None
    file_data = None
    file_mime_type = None

    if media:
        try:
            data = await media.read()
            validate_upload(media, data)
            ext = Path(media.filename).suffix
            path = f"{note_id}/media{ext}"
            media_url = upload_file(data, path, media.content_type)
            file_data = data
            file_mime_type = media.content_type
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
            path = f"{note_id}/file{ext}"
            file_url = upload_file(data, path, file.content_type)
            file_name = file.filename
            file_data = data
            file_mime_type = file.content_type
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
            print(f"Extracted {len(notes_content)} characters from file")
        except Exception as e:
            print(f"OCR extraction failed: {str(e)}")

    try:
        note_record = create_note(
            note_data, media_url, file_name, file_url, file_size, notes_content, user_id, courseSectionId, conn
        )
        return NoteResponse(
            noteId=note_record["note_id"],
            title=note_record["title"],
            description=note_record["description"],
            dateUploaded=str(note_record["date_uploaded"]),
            courseSectionId=courseSectionId,
            courseCode=course_section["course_name"],
            courseName=course_section["course_code"],
            professorName=course_section.get("professor_name"),
            notesContent=note_record.get("notes_content"),
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


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note_endpoint(request: Request, note_id: int, conn=Depends(get_db)):
    try:
        note = get_note_by_id(note_id, conn)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        return NoteResponse(
            noteId=note["note_id"],
            title=note["title"],
            description=note["description"],
            dateUploaded=str(note["date_uploaded"]),
            courseSectionId=note.get("course_section_id"),
            courseCode=note.get("course_name"),
            courseName=note.get("course_code"),
            professorName=note.get("professor_name"),
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

    existing_note = get_note_by_id(note_id, conn)

    try:
        note_data = NoteUpdate(title=title, description=description, date=date, courseSectionId=courseSectionId)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    media_url = None
    file_url = None
    file_name = None
    file_size = None
    file_data = None
    file_mime_type = None

    if media:
        try:
            data = await media.read()
            validate_upload(media, data)
            ext = Path(media.filename).suffix
            path = f"{note_id}/media{ext}"
            if existing_note.get("media_url"):
                old_ext = Path(existing_note["media_url"]).suffix
                delete_file(f"{note_id}/media{old_ext}")
            media_url = upload_file(data, path, media.content_type)
            file_data = data
            file_mime_type = media.content_type
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
            path = f"{note_id}/file{ext}"
            if existing_note.get("file_url"):
                old_ext = Path(existing_note["file_url"]).suffix
                delete_file(f"{note_id}/file{old_ext}")
            file_url = upload_file(data, path, file.content_type)
            file_name = file.filename
            file_data = data
            file_mime_type = file.content_type
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    notes_content = None
    if file_data and file_mime_type:
        try:
            notes_content = extract_text(file_data, file_mime_type)
            print(f"Extracted {len(notes_content)} characters from updated file")
        except Exception as e:
            print(f"OCR extraction failed: {str(e)}")

    try:
        updated_note = update_note(note_id, note_data, notes_content, conn)
        if not updated_note:
            raise HTTPException(status_code=400, detail="No fields to update")

        full_note = get_note_by_id(note_id, conn)
        course_section_id = courseSectionId or existing_note.get("course_section_id")
        course_section = get_course_section_by_id(course_section_id, conn) if course_section_id else None

        return NoteResponse(
            noteId=full_note["note_id"],
            title=full_note["title"],
            description=full_note["description"],
            dateUploaded=str(full_note["date_uploaded"]),
            courseSectionId=course_section_id,
            courseCode=course_section["course_name"] if course_section else existing_note.get("course_name"),
            courseName=course_section["course_code"] if course_section else existing_note.get("course_code"),
            professorName=course_section.get("professor_name")
            if course_section
            else existing_note.get("professor_name"),
            notesContent=full_note.get("notes_content"),
            mediaUrl=media_url or existing_note.get("media_url"),
            fileName=file_name or existing_note.get("file_name"),
            fileUrl=file_url or existing_note.get("file_url"),
            fileSize=file_size or existing_note.get("file_size"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{note_id}", response_model=DeleteResponse)
async def delete_note_endpoint(note_id: int, conn=Depends(get_db)):
    try:
        note = get_note_by_id(note_id, conn)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        if note.get("media_url"):
            ext = Path(note["media_url"]).suffix
            delete_file(f"{note_id}/media{ext}")

        if note.get("file_url"):
            ext = Path(note["file_url"]).suffix
            delete_file(f"{note_id}/file{ext}")

        deleted = delete_note(note_id, conn)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete note")

        return DeleteResponse(message="Note deleted successfully", id=note_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
