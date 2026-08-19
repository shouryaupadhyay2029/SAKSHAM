from fastapi import APIRouter

router = APIRouter()

@router.get("", summary="Get service health status")
async def health_check():
    return {
        "status": "ok",
        "service": "saksham-fastapi",
        "version": "0.1.0"
    }
