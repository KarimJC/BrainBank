from fastapi import status, APIRouter, Depends, Query
from psycopg2.extensions import connection as Connection
from typing import Optional

from db.crud.course import (
    create_course as create_course_crud,
    get_course_by_id,
    get_all_courses as get_all_courses_crud,
    update_course as update_course_crud,
    delete_course as delete_course_crud,
)

from api.schemas.courses import CourseCreate, CourseUpdate, CourseResponse, CourseList, CourseDeleteResponse

from core.exceptions import CourseNotFoundException

from db.connection import get_db


router = APIRouter()


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(course_data: CourseCreate, db: Connection = Depends(get_db)):
    """Create a new course"""
    course = create_course_crud(course_data, db)
    return course


@router.get("/courses/{course_id}", response_model=CourseResponse, status_code=status.HTTP_200_OK)
def get_course(course_id: int, db: Connection = Depends(get_db)):
    """Get a course by ID"""
    course = get_course_by_id(course_id, db)
    if course:
        return course
    else:
        raise CourseNotFoundException(course_id)


@router.get("/courses", response_model=CourseList, status_code=status.HTTP_200_OK)
def get_courses(
    db: Connection = Depends(get_db), subject: Optional[str] = Query(None, description="Filter courses by subject")
):
    """Get all courses, optionally filtered by subject"""
    courses = get_all_courses_crud(db, subject=subject)
    return CourseList(courses=courses)


@router.put("/courses/{course_id}", response_model=CourseResponse, status_code=status.HTTP_200_OK)
def update_course(course_id: int, course_data: CourseUpdate, db: Connection = Depends(get_db)):
    """Update a course by ID"""
    # Check if course exists
    existing_course = get_course_by_id(course_id, db)
    if not existing_course:
        raise CourseNotFoundException(course_id)

    updated_course = update_course_crud(course_id, course_data, db)
    return updated_course


@router.delete("/courses/{course_id}", response_model=CourseDeleteResponse, status_code=status.HTTP_200_OK)
def delete_course(course_id: int, db: Connection = Depends(get_db)):
    """Delete a course by ID"""
    # Check if course exists
    existing_course = get_course_by_id(course_id, db)
    if not existing_course:
        raise CourseNotFoundException(course_id)

    delete_course_crud(course_id, db)
    return CourseDeleteResponse(message=f"Successfully deleted course {course_id}", deleted_id=course_id)