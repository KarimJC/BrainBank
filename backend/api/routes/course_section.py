from fastapi import HTTPException, status, APIRouter, Depends
from psycopg2.extensions import connection as Connection
from db.connection import get_db

from db.crud.course_section import (
    create_course_section as create_course_section_crud, 
    get_course_section_by_id,
    get_course_sections_by_subject as get_course_sections_by_subject_crud,
    update_course_section as update_course_section_crud, 
    delete_course_section as delete_course_section_crud, 
    check_crn_exists
)

from api.schemas.course_section import CourseSectionCreate, CourseSectionUpdate, CourseSectionResponse, DeleteResponse

from core.exceptions import CourseSectionNotFoundException, CourseSectionAlreadyExistsException, DatabaseException

router = APIRouter()



@router.post("/course_sections", response_model= CourseSectionResponse, status_code=status.HTTP_201_CREATED)
def create_course_section(course_section_data: CourseSectionCreate, db: Connection = Depends(get_db)):
    if check_crn_exists(course_section_data.course_crn, db):
        raise CourseSectionAlreadyExistsException(course_section_data.course_crn)
    else:
        course_section = create_course_section_crud(course_section_data, db)
        return course_section
    


@router.get("/course_sections/{section_id}", response_model=CourseSectionResponse, status_code=status.HTTP_200_OK) 
def get_course_section(section_id: int, db: Connection = Depends(get_db)):
    course_section = get_course_section_by_id(section_id, db)
    if course_section:
        return course_section
    else:
        raise CourseSectionNotFoundException(section_id)


@router.get("/course_sections/subject/{subject}", response_model= list[CourseSectionResponse], status_code=status.HTTP_200_OK)
def get_course_sections_by_subject(subject: str, db: Connection = Depends(get_db)):
    course_sections = get_course_sections_by_subject_crud(subject, db)
    return course_sections


@router.patch("/course_sections/{section_id}", response_model= CourseSectionResponse, status_code=status.HTTP_200_OK) 
def update_course_section(section_id: int, updated_course_section_data: CourseSectionUpdate, db: Connection = Depends(get_db)):
    current_course_section = get_course_section_by_id(section_id, db)
    if not current_course_section:
        raise CourseSectionNotFoundException(section_id)
    
    else: 

        if (updated_course_section_data.course_crn and 
            updated_course_section_data.course_crn != current_course_section['course_crn'] 
            and check_crn_exists(updated_course_section_data.course_crn, db)):
             raise CourseSectionAlreadyExistsException(updated_course_section_data.course_crn)
        else:
            updated_course_section = update_course_section_crud(section_id, updated_course_section_data, db)
            return updated_course_section


@router.delete("/course_sections/{section_id}", response_model=DeleteResponse, status_code=status.HTTP_200_OK)
def delete_course_section(section_id: int, db: Connection = Depends(get_db)) -> DeleteResponse:
    course_section = get_course_section_by_id(section_id, db)
    if not course_section:
        raise CourseSectionNotFoundException(section_id)
    delete_course_section_crud(section_id, db)
    return DeleteResponse(message=f"Successfully deleted course section {section_id}", deleted_id=section_id)
    