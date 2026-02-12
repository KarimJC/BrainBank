from fastapi import APIRouter
from api.routes.user import router as user_router
from api.routes.courses import router as courses_router
from api.routes.message import router as message_router

api_router = APIRouter()
api_router.include_router(user_router, tags=["user"])
api_router.include_router(courses_router, tags=["courses"])
api_router.include_router(message_router, tags=["message"])
