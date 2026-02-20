from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.notes import router as notes_router
from api.routes.course_sections import router as course_sections_router  # ADD THIS LINE

app = FastAPI(
    title="BrainBank API",
    description="Backend API for the BrainBank notes application",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(notes_router)
app.include_router(course_sections_router) 

@app.get("/")
async def root():
    return {"message": "Welcome to BrainBank API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)