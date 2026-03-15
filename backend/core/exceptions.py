# throws custom exceptions for the applications
from typing import Any, Dict
from typing_extensions import Annotated, Doc
from fastapi import HTTPException, status


# user exceptions
class UserNotFoundException(HTTPException):
    def __init__(self, user_id: int):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with id {user_id} not found")


class UserAlreadyExistsException(HTTPException):
    def __init__(self, email: str):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=f"User with email {email} already exists")


class DatabaseException(HTTPException):
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


class CourseNotFoundException(HTTPException):
    def __init__(self, course_id: int):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"Course with id {course_id} not found")


# Exceptions related to messages
class MessageNotFoundException(HTTPException):
    def __init__(self, message_id: int):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"Message with id {message_id} not found")


class InvalidMessageRecipientException(HTTPException):
    def __init__(self, detail: str = "Invalid message recipient"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class MessageAlreadyDeletedException(HTTPException):
    def __init__(self, message_id: int):
        super().__init__(status_code=status.HTTP_410_GONE, detail=f"Message {message_id} has already been deleted")


# Course Section Exceptions
class CourseSectionNotFoundException(HTTPException):
    def __init__(self, course_section_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Course section with id {course_section_id} not found"
        )


class ProfessorNotFoundException(HTTPException):
    def __init__(self, professor_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professor with id {professor_id} not found"
        )


class ProfessorAlreadyExistsException(HTTPException):
    def __init__(self, email: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Professor with email {email} already exists"
        )

class CourseSectionAlreadyExistsException(HTTPException):
    def __init__(self, crn: int):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=f"Course section with CRN {crn} already exists")
