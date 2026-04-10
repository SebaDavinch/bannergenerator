from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.vamsys import (
    SubmitActivityRequest,
    SubmitActivityResponse,
    VamsysConnectivityStatus,
)
from app.services.audit_service import audit_service
from app.services.vamsys_operations import vamsys_operations_service


router = APIRouter()


@router.get("/status", response_model=VamsysConnectivityStatus)
async def get_status(source: str | None = Query(default=None)) -> VamsysConnectivityStatus:
    try:
        return await vamsys_operations_service.get_status(source=source)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.post("/activities/{activity_type}", response_model=SubmitActivityResponse)
async def submit_activity(
    activity_type: str,
    payload: SubmitActivityRequest,
    source: str = Query(..., min_length=2),
) -> SubmitActivityResponse:
    try:
        response = await vamsys_operations_service.submit_activity(source=source, activity_type=activity_type, payload=payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    audit_service.write(
        action="vamsys.activity.submitted",
        actor=payload.actor,
        resource_type=activity_type,
        resource_id=str(response.remote_id),
        metadata={
            "source": source,
            "title": payload.title,
            "operation_path": response.operation_path,
        },
    )
    return response
