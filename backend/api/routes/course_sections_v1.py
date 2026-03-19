from fastapi import APIRouter, Depends, HTTPException
from typing import List

from db.connection import get_db
from db.crud.course_section import get_course_sections_for_user as get_user_sections

router = APIRouter(prefix="/api/v1/course_sections", tags=["course_sections"])


@router.get("/user/{user_id}", response_model=List[dict])
async def get_course_sections_for_user(user_id: int, conn=Depends(get_db)):
    """Return course sections that a user is enrolled in."""
    try:
        return get_user_sections(user_id, conn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
