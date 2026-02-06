from pydantic import BaseModel

class ProfessorBase(BaseModel):
    name: str

class ProfessorCreate(ProfessorBase):
    pass

class ProfessorUpdate(ProfessorBase):
    pass

class Professor(ProfessorBase):
    professor_id: int
    