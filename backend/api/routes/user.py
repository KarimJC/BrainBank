from fastapi import HTTPException, status, APIRouter, Depends
from psycopg2.extensions import connection as Connection

# Import placeholder CRUD functions with different names 
from db.crud.user import (
    create_user as create_user_crud,
    get_user_by_id,
    update_user as update_user_crud,
    delete_user as delete_user_crud,
    check_email_exists
)


from api.schemas.user import UserCreate, UserUpdate, UserResponse, DeleteResponse

from core.exceptions import UserNotFoundException, UserAlreadyExistsException 


from db.connection import get_db


router = APIRouter()



@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Connection = Depends(get_db)):
    if check_email_exists(user_data.neu_email, db):
            raise UserAlreadyExistsException(user_data.neu_email)
    else:
        user = create_user_crud(user_data, db)
        return user





@router.get("/user/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK) 
def get_user(user_id: int, db: Connection = Depends(get_db)):
    user = get_user_by_id(user_id, db)
    if user:
        return user
    else:
        raise UserNotFoundException(user_id)


@router.patch("/user/{user_id}", response_model= UserResponse, status_code=status.HTTP_200_OK) 
def update_user(user_id: int, updated_user_data: UserUpdate, db: Connection = Depends(get_db)):
    current_user = get_user_by_id(user_id, db)
    if not current_user:
        raise UserNotFoundException(user_id)
    else: 
        if (updated_user_data.neu_email
            and current_user['neu_email'] != updated_user_data.neu_email
            and check_email_exists(updated_user_data.neu_email, db)):
            raise UserAlreadyExistsException(updated_user_data.neu_email)
        else:
            updated_user = update_user_crud(user_id, updated_user_data, db)
            return updated_user
     

@router.delete("/user/{user_id}", response_model=DeleteResponse, status_code=status.HTTP_200_OK)
def delete_user_route(user_id: int, db: Connection = Depends(get_db)) -> DeleteResponse:
    user = get_user_by_id(user_id, db)
    if not user:
        raise UserNotFoundException(user_id)
    delete_user_crud(user_id, db)
    return DeleteResponse(message=f"Successfully deleted user {user_id}", deleted_id=user_id)
    