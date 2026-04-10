from pydantic import BaseModel, Field


class AirportRecord(BaseModel):
    source: str = Field(min_length=1)
    airport_id: int | None = None
    icao: str = Field(min_length=3, max_length=4)
    iata: str | None = Field(default=None, max_length=3)
    name: str = Field(min_length=1)
    city: str | None = None
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    latitude: float | None = None
    longitude: float | None = None
    is_hub: bool = False
    tags: list[str] = Field(default_factory=list)


class AirportCatalogImportRequest(BaseModel):
    source: str = Field(min_length=1)
    airports: list[AirportRecord]


class AirportCatalogResponse(BaseModel):
    items: list[AirportRecord]
    total: int
    available_sources: list[str]


class AirportCatalogSyncResponse(BaseModel):
    source: str
    imported: int
    total: int
    available_sources: list[str]
