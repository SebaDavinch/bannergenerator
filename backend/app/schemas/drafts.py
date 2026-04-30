from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


EventType = Literal[
    "focus-airport",
    "event",
    "vatsim-region",
    "tour",
    "roster",
    "curated-roster",
    "community-goal",
    "community-challenge",
]


class CreateDraftRequest(BaseModel):
    event_type: EventType
    title: str = Field(min_length=1)
    actor: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class DraftRecord(BaseModel):
    id: str
    event_type: EventType
    title: str
    actor: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
