from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import api_router
from db.connection import init_pool, close_pool
from cache.redis_client import init_redis, close_redis

app = FastAPI(
    title="BrainBank API",
    description="Backend API for the BrainBank notes application",
    version="1.0.0",
)


@app.on_event("startup")
async def startup():
    init_pool()
    init_redis()


@app.on_event("shutdown")
async def shutdown():
    close_pool()
    close_redis()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Welcome to BrainBank API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
