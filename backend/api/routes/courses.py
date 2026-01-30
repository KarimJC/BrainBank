from fastapi import FastAPI, APIRouter, status, HTTPException, Depends, Query
from api.routes import api_router
from typing import Optional
import asyncpg

router = APIRouter()

@router.post("/courses", status_code=status.HTTP_201_CREATED, tags=["Courses"])
async def create_course(
    course_data: dict,

    # Need to make a function to get the db lol
    db: asyncpg.Connection = Depends(get_db)
):
    """Create a new course"""
    try:
        # Insert into database
        query = """
        INSERT INTO courses (name, code, subject, description, credits)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING course_id, name, code, subject, description, credits, created_at
        """
        result = await db.fetchrow(
            query,
            course_data.get("name"),
            course_data.get("code"),
            course_data.get("subject"),
            course_data.get("description"),
            course_data.get("credits")
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating course: {str(e)}"
        )
    

@router.get("/courses", status_code=status.HTTP_200_OK, tags=["Courses"])
async def get_courses(
    db: asyncpg.Connection = Depends(get_db),
    subject: Optional[str] = Query(None, description="Filter by subject"),
    search: Optional[str] = Query(None, description="Search in name, code, or subject")
    ):
    try:
        # Build dynamic query based on filters
        conditions = []
        params = []
        param_count = 1
        
        if subject:
            conditions.append(f"subject = ${param_count}")
            params.append(subject)
            param_count += 1
        
        if search:
            conditions.append(f"(name ILIKE ${param_count} OR code ILIKE ${param_count} OR subject ILIKE ${param_count})")
            params.append(f"%{search}%")
            param_count += 1
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        
        query = f"""
            SELECT *
            FROM courses
            {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_count} OFFSET ${param_count + 1}
        """
        
        results = await db.fetch(query, *params)
        
        courses = [dict(row) for row in results]
        
        return {
            "courses": courses
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving courses: {str(e)}"
        )

    