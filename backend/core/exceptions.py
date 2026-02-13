#throws custom exceptions for the applications 
from fastapi import HTTPException, status


# Exceptions related to users
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


class CourseNotFoundException(HTTPException):
    def __init__(self, course_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {course_id} not found"
        )


# Exceptions related to messages
class MessageNotFoundException(HTTPException):
    def __init__(self, message_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message with id {message_id} not found"
        )


class InvalidMessageRecipientException(HTTPException):
    def __init__(self, detail: str = "Invalid message recipient"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class MessageAlreadyDeletedException(HTTPException):
    def __init__(self, message_id: int):
        super().__init__(
            status_code=status.HTTP_410_GONE,
            detail=f"Message {message_id} has already been deleted"
        )