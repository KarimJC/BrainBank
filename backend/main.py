from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from api.routes import api_router

app = FastAPI()

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Backend is running"}