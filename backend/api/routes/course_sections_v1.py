from fastapi import APIRouter, Depends, HTTPException
from typing import List

from db.connection import get_db
from db.crud.course_section import get_all_course_sections

router = APIRouter(prefix="/api/v1/course_sections", tags=["course_sections"])


@router.get("/user/{user_id}", response_model=List[dict])
async def get_course_sections_for_user(user_id: int, conn=Depends(get_db)):
    """
    Temporary compatibility endpoint for the frontend.

    Until enrollments are modeled in the DB, this returns all course sections.
    """
    try:
        return get_all_course_sections(conn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

