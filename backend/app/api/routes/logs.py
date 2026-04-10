from fastapi import APIRouter, Query

from app.schemas.audit import AuditLogEntry
from app.services.audit_service import audit_service


router = APIRouter()


@router.get("", response_model=list[AuditLogEntry])
def list_logs(limit: int = Query(default=200, ge=1, le=1000)) -> list[AuditLogEntry]:
    return audit_service.read(limit=limit)
