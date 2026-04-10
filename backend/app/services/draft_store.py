from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.core.files import ensure_directory, read_json, write_json
from app.schemas.drafts import CreateDraftRequest, DraftRecord


class DraftStore:
    def __init__(self, directory: Path) -> None:
        self._directory = directory
        ensure_directory(self._directory)

    def create_draft(self, payload: CreateDraftRequest) -> DraftRecord:
        draft = DraftRecord(
            id=uuid4().hex,
            event_type=payload.event_type,
            title=payload.title,
            actor=payload.actor,
            payload=payload.payload,
            created_at=datetime.now(timezone.utc),
        )
        write_json(self._path_for(draft.id), draft.model_dump(mode="json"))
        return draft

    def list_drafts(self) -> list[DraftRecord]:
        drafts = []
        for path in sorted(self._directory.glob("*.json"), reverse=True):
            drafts.append(DraftRecord.model_validate(read_json(path, default={})))
        return drafts

    def _path_for(self, draft_id: str) -> Path:
        return self._directory / f"{draft_id}.json"


settings = get_settings()
draft_store = DraftStore(settings.drafts_dir)
