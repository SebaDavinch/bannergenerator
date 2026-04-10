from fastapi import APIRouter

from app.schemas.drafts import CreateDraftRequest, DraftRecord
from app.services.audit_service import audit_service
from app.services.draft_store import draft_store


router = APIRouter()


@router.get("", response_model=list[DraftRecord])
def list_drafts() -> list[DraftRecord]:
    return draft_store.list_drafts()


@router.post("", response_model=DraftRecord)
def create_draft(payload: CreateDraftRequest) -> DraftRecord:
    draft = draft_store.create_draft(payload)
    audit_service.write(
        action="draft.created",
        actor=payload.actor,
        resource_type="draft",
        resource_id=draft.id,
        metadata={
            "event_type": payload.event_type,
            "title": payload.title,
        },
    )
    return draft
