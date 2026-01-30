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
    
    



