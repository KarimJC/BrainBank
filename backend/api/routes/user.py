from fastapi import HTTPException, status, APIRouter, Depends, Request
from psycopg2.extensions import connection as Connection


from db.crud.user import (
    check_email_exists,
    get_user_by_id,
    get_user_by_auth_id,
    update_user as update_user_crud,
    update_user_by_auth_id,
    delete_user as delete_user_crud,
)

from api.schemas.user import UserUpdate, UserResponse, DeleteResponse
from core.exceptions import UserNotFoundException, UserAlreadyExistsException
from db.connection import get_db
from auth import get_current_user
from cache.redis_client import cache_get, cache_set, cache_delete

router = APIRouter()


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db)
):
    """
    Get current logged-in user's profile.
    Protected route - requires JWT token.
    """
    cache_key = f"user:{current_user['auth_id']}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    user = get_user_by_auth_id(current_user["auth_id"], db)
    if not user:
        raise UserNotFoundException(current_user["auth_id"])

    cache_set(cache_key, user, ttl=300)
    return user


@router.patch("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def update_current_user_profile(
    updated_user_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db)
):
    """
    Update current logged-in user's profile.
    Users can only update their own profile.
    """
    current_user_data = get_user_by_auth_id(current_user["auth_id"], db)
    if not current_user_data:
        raise UserNotFoundException(current_user["auth_id"])

    if (
        updated_user_data.neu_email
        and current_user_data["neu_email"] != updated_user_data.neu_email
        and check_email_exists(updated_user_data.neu_email, db)
    ):
        raise UserAlreadyExistsException(updated_user_data.neu_email)

    
    # Update using auth_id instead of user_id
    updated_user = update_user_by_auth_id(current_user["auth_id"], updated_user_data, db)
    cache_delete(f"user:{current_user['auth_id']}")
    return updated_user

# Keep these routes for admin purposes if needed, but protect them
@router.get("/user/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK) 
def get_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),  # Must be logged in
    db: Connection = Depends(get_db)
):
    """
    Get user by ID. For now, users can only get their own profile.
    In the future, you might add admin role checks here.
    """
    user = get_user_by_id(user_id, db)
    if user:
        return user
    else:
        raise UserNotFoundException(user_id)

@router.patch("/user/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK) 
def update_user(
    user_id: int,
    updated_user_data: UserUpdate,
    current_user: dict = Depends(get_current_user),  # Must be logged in
    db: Connection = Depends(get_db)
):
    """
    Update user by ID. For now, users can only update their own profile.
    """
    current_user_db = get_user_by_id(user_id, db)
    if not current_user_db:
        raise UserNotFoundException(user_id)
    
    # Check if user is updating their own data
    if current_user_db["auth_id"] != current_user["auth_id"]:
        raise HTTPException(status_code=403, detail="You can only update your own profile")
    
    updated_user = update_user_crud(user_id, updated_user_data, db)
    return updated_user

@router.put("/me/profile-picture")
async def update_my_profile_picture(
   request: Request,
   current_user: dict = Depends(get_current_user),
   db: Connection = Depends(get_db)
):
   """Update the current user's profile picture URL"""
   body = await request.json()
   profile_picture_url = body.get("profile_picture_url")
  
   if not profile_picture_url:
       raise HTTPException(status_code=400, detail="profile_picture_url is required")
  
   user_data = UserUpdate(profile_picture=profile_picture_url)
   updated_user = update_user_by_auth_id(current_user["auth_id"], user_data, db)
  
   if not updated_user:
       raise HTTPException(status_code=404, detail="User not found")
  
   return updated_user

@router.delete("/user/{user_id}", response_model=DeleteResponse, status_code=status.HTTP_200_OK)
def delete_user_route(
    user_id: int,
    current_user: dict = Depends(get_current_user),  # Must be logged in
    db: Connection = Depends(get_db)
) -> DeleteResponse:
    """
    Delete user. For now, users can only delete their own account.
    """
    user = get_user_by_id(user_id, db)
    if not user:
        raise UserNotFoundException(user_id)

    # Check if user is deleting their own account
    if user["auth_id"] != current_user["auth_id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own account")
    
    delete_user_crud(user_id, db)
    return DeleteResponse(message=f"Successfully deleted user {user_id}", deleted_id=user_id)
