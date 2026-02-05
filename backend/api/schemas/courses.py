from pydantic import BaseModel, Field

class CourseCreate(BaseModel):
    course_title: str = Field(..., min_length=1, max_length=100)
    course_code: int = Field(..., ge=1, le=10000)
    course_CRN: int = Field(..., ge=1, le=100000)
    professor_id: int
    subject: str = Field(..., min_length=1, max_length=50)

    model_config = {
        "json_schema_extra": {
            "example": {
                "course_title": "Intro to Algorithms",
                "course_code": 3000,
                "course_CRN": 12345,
                "professor_id": 7,
                "subject": "Computer Science"
            }
        }
    }

class CourseUpdate(BaseModel):
    course_title: str | None = None
    course_code: int | None = None
    course_CRN: int | None = None
    professor_id: int | None = None
    subject: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "course_title": "Advanced Algorithms",
                "course_code": 4000,
                "course_CRN": 54321,
                "professor_id": 8,
                "subject": "Computer Science"
            }
        }
    }

class CourseResponse(BaseModel):
    course_id: int
    course_title: str
    course_code: int
    course_CRN: int
    professor_id: int
    subject: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "course_id": 1,
                "course_title": "Intro to Algorithms",
                "course_code": 3000,
                "course_CRN": 12345,
                "professor_id": 7,
                "subject": "Computer Science"
            }
        }
    }

class CourseList(BaseModel):
    courses: list[CourseResponse]

    model_config = {
        "json_schema_extra": {
            "example": {
                "courses": [
                    {
                        "course_id": 1,
                        "course_title": "Intro to Algorithms",
                        "course_code": 3000,
                        "course_CRN": 12345,
                        "professor_id": 7,
                        "subject": "Computer Science"
                    },
                    {
                        "course_id": 2,
                        "course_title": "Data Structures",
                        "course_code": 2000,
                        "course_CRN": 67890,
                        "professor_id": 8,
                        "subject": "Computer Science"
                    }
                ]
            }
        }
    }

class CourseDeleteResponse(BaseModel):
    message: str
    deleted_id: int

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Successfully deleted course 1",
                "deleted_id": 1
            }
        }
    }
    




