from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CreateCreationRequest(BaseModel):
    event_type: str = Field(min_length=1)
    brand: str = Field(min_length=1)
    title: str = Field(min_length=1)
    description: str | None = None
    actor: str | None = None
    image_data_url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CreationRecord(BaseModel):
    id: str
    event_type: str
    brand: str
    title: str
    description: str | None = None
    actor: str | None = None
    image_path: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class CreationListItem(BaseModel):
    id: str
    event_type: str
    brand: str
    title: str
    description: str | None = None
    image_url: str | None = None
    created_at: datetime


class CreationListResponse(BaseModel):
    items: list[CreationListItem]
    total: int