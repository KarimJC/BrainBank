from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from api.routes.notes import router as notes_router
from api.routes.course_section import router as course_sections_router
from api.routes.user import router as user_router
from api.routes.course_sections_v1 import router as course_sections_v1_router

load_dotenv()

app = FastAPI(
    title="BrainBank API",
    description="Backend API for the BrainBank notes application",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes_router)
app.include_router(course_sections_router)
app.include_router(user_router, prefix="/api/v1/user", tags=["user"])
app.include_router(course_sections_v1_router)


@app.get("/")
async def root():
    return {"message": "Welcome to BrainBank API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)