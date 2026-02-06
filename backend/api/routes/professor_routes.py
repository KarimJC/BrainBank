from fastapi import APIRouter, HTTPException
from api.schemas import Professor

router = APIRouter(
    prefix="/professors",
    tags=["professors"],
)

@router.get("/{professor_id}")
async def get_professor(professor_id: int) -> Professor:
    try:
        return get_professor_by_id(professor_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
    