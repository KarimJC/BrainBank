from fastapi import HTTPException, status, APIRouter, Depends
from psycopg2.extensions import connection as Connection

from db.crud.professor import (
    create_professor as create_professor_crud,
    get_professor_by_id,
    get_all_professors,
    update_professor as update_professor_crud,
    delete_professor as delete_professor_crud,
    check_professor_email_exists,
)

from db.crud.user import get_user_by_auth_id
from auth import get_current_user

from api.schemas.professor import ProfessorCreate, ProfessorUpdate, ProfessorResponse, ProfessorDeleteResponse

from core.exceptions import ProfessorNotFoundException, ProfessorAlreadyExistsException, UserNotFoundException

from db.connection import get_db

router = APIRouter(prefix="/professors", tags=["professors"])


@router.post("", response_model=ProfessorResponse, status_code=status.HTTP_201_CREATED)
def create_professor(professor_data: ProfessorCreate, db: Connection = Depends(get_db)):
    """Create a new professor"""
    if check_professor_email_exists(professor_data.email, db):
        raise ProfessorAlreadyExistsException(professor_data.email)
    else:
        professor = create_professor_crud(professor_data, db)
        return professor


@router.get("", response_model=list[ProfessorResponse], status_code=status.HTTP_200_OK)
def list_professors(current_user: dict = Depends(get_current_user), db: Connection = Depends(get_db)):
    """List all professors ordered by name"""
    user = get_user_by_auth_id(current_user["auth_id"], db)
    if not user:
        raise UserNotFoundException(current_user["auth_id"])
    return get_all_professors(db)


@router.get("/{professor_id}", response_model=ProfessorResponse, status_code=status.HTTP_200_OK)
def get_professor(professor_id: int, db: Connection = Depends(get_db)):
    """Get a professor by ID"""
    professor = get_professor_by_id(professor_id, db)
    if professor:
        return professor
    else:
        raise ProfessorNotFoundException(professor_id)


@router.patch("/{professor_id}", response_model=ProfessorResponse, status_code=status.HTTP_200_OK)
def update_professor(professor_id: int, updated_professor_data: ProfessorUpdate, db: Connection = Depends(get_db)):
    """Update a professor's information"""
    current_professor = get_professor_by_id(professor_id, db)
    if not current_professor:
        raise ProfessorNotFoundException(professor_id)
    else:
        if (
            updated_professor_data.email
            and current_professor["email"] != updated_professor_data.email
            and check_professor_email_exists(updated_professor_data.email, db)
        ):
            raise ProfessorAlreadyExistsException(updated_professor_data.email)
        else:
            updated_professor = update_professor_crud(professor_id, updated_professor_data, db)
            return updated_professor


@router.delete("/{professor_id}", response_model=ProfessorDeleteResponse, status_code=status.HTTP_200_OK)
def delete_professor_route(professor_id: int, db: Connection = Depends(get_db)) -> ProfessorDeleteResponse:
    """Delete a professor"""
    professor = get_professor_by_id(professor_id, db)
    if not professor:
        raise ProfessorNotFoundException(professor_id)
    delete_professor_crud(professor_id, db)
    return ProfessorDeleteResponse(message=f"Successfully deleted professor {professor_id}", deleted_id=professor_id)
