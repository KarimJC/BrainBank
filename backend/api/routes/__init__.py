from fastapi import APIRouter
from api.routes.user import router as user_router
from api.routes.courses import router as courses_router
from api.routes.message import router as message_router
from api.routes.course_section import router as course_section_router
from api.routes.conversation import router as conversation_router
from api.routes.notes import router as notes_router  
from api.routes.ai_chat import router as ai_chat_router 

api_router = APIRouter()
api_router.include_router(user_router, tags=["user"])
api_router.include_router(courses_router, tags=["courses"])
api_router.include_router(message_router, tags=["message"])
api_router.include_router(conversation_router, tags=["conversations"])

api_router.include_router(course_section_router, tags=["course-sections"])
api_router.include_router(notes_router, tags=["notes"])
api_router.include_router(ai_chat_router, tags=["ai-chat"])
