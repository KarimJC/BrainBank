from fastapi import FastAPI
from api.routes import api_router

router = FastAPI()
# Temporary code, currently this is not accurate. 
# @router.post("/courses", status_code=status.HTTP_201_CREATED, tags=["Courses"])
# async def create_course(
#     course_data: dict,
#     db: asyncpg.Connection = Depends(get_db)
# ):
#     """Create a new course"""
#     try:
#         # Insert into database
#         query = """
#         INSERT INTO courses (name, code, subject, description, credits)
#         VALUES ($1, $2, $3, $4, $5)
#         RETURNING course_id, name, code, subject, description, credits, created_at
#         """
#         result = await db.fetchrow(
#             query,
#             course_data.get("name"),
#             course_data.get("code"),
#             course_data.get("subject"),
#             course_data.get("description"),
#             course_data.get("credits")
#         )
#         return result
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error creating course: {str(e)}"
#         )
    