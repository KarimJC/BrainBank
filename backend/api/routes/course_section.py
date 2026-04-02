from fastapi import HTTPException, status, APIRouter, Depends
from typing import List, Optional
from psycopg2.extensions import connection as Connection
from db.connection import get_db
from db.crud.course_section import (
    get_all_course_sections,
    get_course_section_by_id,
    get_course_sections_for_user,
    create_course_section as create_course_section_crud,
    get_course_sections_by_subject as get_course_sections_by_subject_crud,
    update_course_section as update_course_section_crud,
    delete_course_section as delete_course_section_crud,
    check_crn_exists,
    get_course_section_by_CRN,
    enroll_user_in_course_section,
    unenroll_user_from_course_section,
)
from api.schemas.course_section import CourseSectionCreate, CourseSectionUpdate, CourseSectionResponse, DeleteResponse
from core.exceptions import CourseSectionNotFoundException, CourseSectionAlreadyExistsException
from pydantic import BaseModel

router = APIRouter(prefix="/course-sections", tags=["course-sections"])


class CourseSectionDetailResponse(BaseModel):
    course_section_id: int
    course_id: int
    course_crn: int
    professor_id: Optional[int] = None
    professor_name: Optional[str] = None
    course_code: str
    course_name: str
    subject: str | None
    professor_name: str | None


# GET all course sections with joined course and professor details (used by frontend)
@router.get("", response_model=List[CourseSectionDetailResponse])
async def get_course_sections_endpoint(conn=Depends(get_db)):
    try:
        course_sections = get_all_course_sections(conn)
        return course_sections
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}", response_model=List[CourseSectionDetailResponse])
async def get_course_sections_for_user_endpoint(user_id: int, conn=Depends(get_db)):
    try:
        return get_course_sections_for_user(user_id, conn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# GET a course section by CRN
@router.get("/crn/{crn}", response_model=CourseSectionDetailResponse)
async def get_course_section_by_crn_endpoint(crn: int, conn=Depends(get_db)):
    course_section = get_course_section_by_CRN(crn, conn)
    if not course_section:
        raise HTTPException(status_code=404, detail="Course section not found")
    return course_section


# POST enroll a user in a course section
@router.post("/{section_id}/enroll", status_code=status.HTTP_200_OK)
async def enroll_user_endpoint(section_id: int, user_id: int, conn=Depends(get_db)):
    course_section = get_course_section_by_id(section_id, conn)
    if not course_section:
        raise HTTPException(status_code=404, detail="Course section not found")
    inserted = enroll_user_in_course_section(user_id, section_id, conn)
    if not inserted:
        raise HTTPException(status_code=409, detail="Already enrolled in this course")
    return {"message": "Enrolled successfully"}


# DELETE unenroll a user from a course section
@router.delete("/{section_id}/enroll", status_code=status.HTTP_200_OK)
async def unenroll_user_endpoint(section_id: int, user_id: int, conn=Depends(get_db)):
    removed = unenroll_user_from_course_section(user_id, section_id, conn)
    if not removed:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return {"message": "Unenrolled successfully"}


# GET a specific course section with joined details
@router.get("/{course_section_id}", response_model=CourseSectionDetailResponse)
async def get_course_section_endpoint(course_section_id: int, conn=Depends(get_db)):
    try:
        course_section = get_course_section_by_id(course_section_id, conn)
        if not course_section:
            raise HTTPException(status_code=404, detail="Course section not found")
        return course_section
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# POST create a new course section
@router.post("", response_model=CourseSectionResponse, status_code=status.HTTP_201_CREATED)
def create_course_section(course_section_data: CourseSectionCreate, db: Connection = Depends(get_db)):
    if check_crn_exists(course_section_data.course_CRN, db):
        raise CourseSectionAlreadyExistsException(course_section_data.course_CRN)
    return create_course_section_crud(course_section_data, db)


# GET course sections by subject
@router.get("/subject/{subject}", response_model=List[CourseSectionResponse], status_code=status.HTTP_200_OK)
def get_course_sections_by_subject(subject: str, db: Connection = Depends(get_db)):
    return get_course_sections_by_subject_crud(subject, db)


# PATCH update a course section
@router.patch("/{section_id}", response_model=CourseSectionResponse, status_code=status.HTTP_200_OK)
def update_course_section(
    section_id: int, updated_course_section_data: CourseSectionUpdate, db: Connection = Depends(get_db)
):
    current_course_section = get_course_section_by_id(section_id, db)
    if not current_course_section:
        raise CourseSectionNotFoundException(section_id)
    if (
        updated_course_section_data.course_CRN
        and updated_course_section_data.course_CRN != current_course_section["course_CRN"]
        and check_crn_exists(updated_course_section_data.course_CRN, db)
    ):
        raise CourseSectionAlreadyExistsException(updated_course_section_data.course_CRN)
    return update_course_section_crud(section_id, updated_course_section_data, db)


# DELETE a course section
@router.delete("/{section_id}", response_model=DeleteResponse, status_code=status.HTTP_200_OK)
def delete_course_section(section_id: int, db: Connection = Depends(get_db)) -> DeleteResponse:
    course_section = get_course_section_by_id(section_id, db)
    if not course_section:
        raise CourseSectionNotFoundException(section_id)
    delete_course_section_crud(section_id, db)
    return DeleteResponse(message=f"Successfully deleted course section {section_id}", deleted_id=section_id)
