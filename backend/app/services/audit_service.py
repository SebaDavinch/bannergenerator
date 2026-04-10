from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings
from app.core.files import append_jsonl, read_json
from app.schemas.audit import AuditLogEntry


class AuditService:
    def __init__(self, log_path: Path) -> None:
        self._log_path = log_path

    def write(
        self,
        action: str,
        resource_type: str,
        actor: str | None = None,
        resource_id: str | None = None,
        metadata: dict[str, object] | None = None,
    ) -> None:
        entry = AuditLogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            action=action,
            actor=actor,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata or {},
        )
        append_jsonl(self._log_path, entry.model_dump())

    def read(self, limit: int = 200) -> list[AuditLogEntry]:
        if not self._log_path.exists():
            return []

        lines = self._log_path.read_text(encoding="utf-8").splitlines()
        parsed = [AuditLogEntry.model_validate_json(line) for line in lines if line.strip()]
        return list(reversed(parsed[-limit:]))


settings = get_settings()
audit_service = AuditService(settings.logs_dir / "audit.jsonl")
