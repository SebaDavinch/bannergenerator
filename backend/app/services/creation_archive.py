from __future__ import annotations

import base64
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.core.files import ensure_directory, read_json, write_bytes, write_json
from app.schemas.creations import CreateCreationRequest, CreationListItem, CreationListResponse, CreationRecord


class CreationArchiveService:
    def __init__(self, records_dir: Path, images_dir: Path) -> None:
        self._records_dir = records_dir
        self._images_dir = images_dir
        ensure_directory(self._records_dir)
        ensure_directory(self._images_dir)

    def create(self, payload: CreateCreationRequest) -> CreationRecord:
        creation_id = uuid4().hex
        image_path: str | None = None

        if payload.image_data_url:
            image_bytes = self._decode_data_url(payload.image_data_url)
            image_filename = f"{creation_id}.png"
            write_bytes(self._images_dir / image_filename, image_bytes)
            image_path = image_filename

        record = CreationRecord(
            id=creation_id,
            event_type=payload.event_type,
            brand=payload.brand,
            title=payload.title,
            description=payload.description,
            actor=payload.actor,
            image_path=image_path,
            metadata=payload.metadata,
            created_at=datetime.now(timezone.utc),
        )
        write_json(self._records_dir / f"{creation_id}.json", record.model_dump(mode="json"))
        return record

    def list_creations(self) -> CreationListResponse:
        records = self._read_records()
        items = [
            CreationListItem(
                id=record.id,
                event_type=record.event_type,
                brand=record.brand,
                title=record.title,
                description=record.description,
                image_url=f"/api/creations/{record.id}/image" if record.image_path else None,
                created_at=record.created_at,
            )
            for record in records
        ]
        return CreationListResponse(items=items, total=len(items))

    def get_record(self, creation_id: str) -> CreationRecord:
        return CreationRecord.model_validate(read_json(self._records_dir / f"{creation_id}.json", default={}))

    def get_image_path(self, creation_id: str) -> Path:
        record = self.get_record(creation_id)

        if not record.image_path:
            raise FileNotFoundError(creation_id)

        image_path = self._images_dir / record.image_path

        if not image_path.exists():
            raise FileNotFoundError(record.image_path)

        return image_path

    def _read_records(self) -> list[CreationRecord]:
        records: list[CreationRecord] = []

        for path in sorted(self._records_dir.glob("*.json"), reverse=True):
            record_payload = read_json(path, default={})

            if not record_payload:
                continue

            records.append(CreationRecord.model_validate(record_payload))

        return records

    def _decode_data_url(self, value: str) -> bytes:
        if not value.startswith("data:image/") or ";base64," not in value:
            raise ValueError("Only base64-encoded image data URLs are supported")

        _, encoded_bytes = value.split(",", 1)
        return base64.b64decode(encoded_bytes)


settings = get_settings()
creation_archive_service = CreationArchiveService(settings.creation_records_dir, settings.creation_images_dir)