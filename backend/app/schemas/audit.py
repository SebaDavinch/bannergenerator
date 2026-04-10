from pydantic import BaseModel, Field


class AuditLogEntry(BaseModel):
    timestamp: str
    action: str
    actor: str | None = None
    resource_type: str
    resource_id: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)
