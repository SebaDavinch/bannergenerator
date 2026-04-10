from pydantic import BaseModel, Field


class AircraftRecord(BaseModel):
    source: str = Field(min_length=1)
    aircraft_id: int | None = None
    fleet_id: int | None = None
    registration: str = Field(min_length=1)
    name: str = Field(min_length=1)
    fleet_name: str | None = None
    fleet_code: str | None = None
    fleet_type: str | None = None
    image_url: str | None = None
    image_attribution: str | None = None
    image_linkback: str | None = None
    passengers: int | None = None
    cargo: int | None = None
    is_hidden: bool = False
    tags: list[str] = Field(default_factory=list)


class AircraftCatalogResponse(BaseModel):
    items: list[AircraftRecord]
    total: int
    available_sources: list[str]


class AircraftCatalogSyncResponse(BaseModel):
    source: str
    imported: int
    total: int
    available_sources: list[str]


class AircraftPhotoRecord(BaseModel):
    provider: str
    image_url: str
    thumbnail_url: str | None = None
    attribution: str | None = None
    linkback: str | None = None


class AircraftPhotoSearchResponse(BaseModel):
    registration: str
    items: list[AircraftPhotoRecord]