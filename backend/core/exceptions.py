#throws custom exceptions for the applications 
from typing import Any, Dict
from typing_extensions import Annotated, Doc
from fastapi import HTTPException, status


#uesr exceptions 
class UserNotFoundException(HTTPException):
    def __init__(self, user_id: int): 
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )



class UserAlreadyExistsException(HTTPException):
    def __init__(self, email: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {email} already exists"
        )


class DatabaseException(HTTPException):
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )

class CourseSectionNotFoundException(HTTPException):
    def __init__(self, course_section_id : int):
          super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course section with id {course_section_id} not found"
        )

class CourseSectionAlreadyExistsException(HTTPException):
    def __init__(self, crn: int):
        super().__init__(
            status_code= status.HTTP_409_CONFLICT,
            detail= f"Course section with CRN {crn} already exists"

        )