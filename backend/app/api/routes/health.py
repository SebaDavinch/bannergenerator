from datetime import datetime, timezone

from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "va-assistant-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
