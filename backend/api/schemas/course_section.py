
from typing import Optional
from pydantic import BaseModel, ConfigDict

class CourseSectionCreate(BaseModel):
    course_id: int 
    course_title: str 
    course_crn: int 
    professor_id: int 
    model_config = ConfigDict(
        json_schema_extra={
            "example": 
                {
                    "course_id": 1, #represents the id for a class and all of its sections share the same id
                    "course_title": "Calculus One For Science and Engineering",
                    "course_crn" : 30186, #represents CRN, a section of a class 
                    "professor_id" : 1 #represents the id for a professor teaching this section


                }
        }
    )


class CourseSectionUpdate(BaseModel):
    course_id: Optional[int] = None
    course_title: Optional[str] = None
    course_crn: Optional[int] = None
    professor_id: Optional[int] = None 
    model_config = ConfigDict(
        json_schema_extra = {
            "example":
            {
                "course_title": "Differential Equations and Linear Algebra for Engineering"



            }
        }
    )

class CourseSectionResponse(BaseModel):
    id: int 
    course_id: int 
    course_title: str 
    course_crn: int 
    professor_id: int 
    model_config = ConfigDict(
        json_schema_extra = {
            "example":
               {
                   "id": 100, # database id to refer
                    "course_id": 1, #represents the id for a class and all of its sections share the same id
                    "course_title": "Calculus One For Science and Engineering",
                    "course_crn" : 30186, #represents CRN, a section of a class 
                    "professor_id" : 1 #represents the id for a professor teaching this section


                }




        }

    )

class DeleteResponse(BaseModel):
    message: str
    deleted_id: int