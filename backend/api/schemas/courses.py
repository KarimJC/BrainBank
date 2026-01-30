from pydantic import BaseModel

class CourseCreate(BaseModel):
    course_title: str
    course_code: int
    course_CRN: int
    professor_id: int

    model_config = {
    "json_schema_extra": { #not sure if this is correct
        "example": {
            "course_title": "Intro to Algorithms",
            "course_code": 3000, #might need to change to str 
            "course_CRN": 12345,
            "professor_id": 7 # what is a professor id?
        }
    }
}

class courseUpdate(BaseModel):
    course_title: str | None = None
    course_code: int | None = None
    course_CRN: int | None = None
    professor_id: int | None = None

    model_config = {
    "json_schema_extra": {
        "example": {
            "course_title": "Advanced Algorithms",
            "course_code": 4000,
            "course_CRN": 54321,
            "professor_id": 8
        }
    }
}

class courseResponse(BaseModel):
    course_id: int
    course_title: str
    course_code: int
    course_CRN: int
    professor_id: int

    model_config = {
    "json_schema_extra": {
        "example": {
            "course_id": 1,
            "course_title": "Intro to Algorithms",
            "course_code": 3000,
            "course_CRN": 12345,
            "professor_id": 7
        }
    }
}
    
class courseList(BaseModel):
    courses: list[courseResponse]

    model_config = {
    "json_schema_extra": {
        "example": {
            "courses": [
                {
                    "course_id": 1,
                    "course_title": "Intro to Algorithms",
                    "course_code": 3000,
                    "course_CRN": 12345,
                    "professor_id": 7
                },
                {
                    "course_id": 2,
                    "course_title": "Data Structures",
                    "course_code": 2000,
                    "course_CRN": 67890,
                    "professor_id": 8
                }
            ]
        }
    }
}
    




