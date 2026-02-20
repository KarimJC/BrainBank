from fastapi import APIRouter, HTTPException, Depends
from typing import List
from db.connection import get_db
from db.crud.course_section import get_all_course_sections, get_course_section_by_id
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/course-sections",
    tags=["course-sections"]
)


class CourseSectionResponse(BaseModel):
    course_section_id: int
    course_id: int
    course_title: str
    course_crn: int
    professor_id: int | None
    course_code: str
    course_name: str
    subject: str | None
    professor_name: str | None


@router.get("", response_model=List[CourseSectionResponse])
async def get_course_sections_endpoint(conn = Depends(get_db)):
    try:
        course_sections = get_all_course_sections(conn)
        return course_sections
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{course_section_id}", response_model=CourseSectionResponse)
async def get_course_section_endpoint(course_section_id: int, conn = Depends(get_db)):
    try:
        course_section = get_course_section_by_id(course_section_id, conn)
        if not course_section:
            raise HTTPException(status_code=404, detail="Course section not found")
        return course_section
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
