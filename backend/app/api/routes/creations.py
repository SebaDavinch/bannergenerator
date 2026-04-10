from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.schemas.creations import CreateCreationRequest, CreationListResponse, CreationRecord
from app.services.audit_service import audit_service
from app.services.creation_archive import creation_archive_service


router = APIRouter()


@router.get("", response_model=CreationListResponse)
def list_creations() -> CreationListResponse:
    return creation_archive_service.list_creations()


@router.post("", response_model=CreationRecord)
def create_creation(payload: CreateCreationRequest) -> CreationRecord:
    try:
        creation = creation_archive_service.create(payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    audit_service.write(
        action="creation.archived",
        actor=payload.actor,
        resource_type="creation",
        resource_id=creation.id,
        metadata={
            "event_type": payload.event_type,
            "brand": payload.brand,
            "title": payload.title,
        },
    )
    return creation


@router.get("/{creation_id}", response_model=CreationRecord)
def get_creation(creation_id: str) -> CreationRecord:
    try:
        return creation_archive_service.get_record(creation_id)
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creation not found") from error


@router.get("/{creation_id}/image")
def get_creation_image(creation_id: str) -> FileResponse:
    try:
        image_path = creation_archive_service.get_image_path(creation_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creation image not found") from error

    return FileResponse(image_path, media_type="image/png")