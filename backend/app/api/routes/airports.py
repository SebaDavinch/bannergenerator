from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.airports import AirportCatalogImportRequest, AirportCatalogResponse, AirportCatalogSyncResponse, AirportRecord
from app.services.airport_catalog import airport_catalog_service
from app.services.vamsys_airport_sync import vamsys_airport_sync_service


router = APIRouter()


@router.get("", response_model=AirportCatalogResponse)
def list_airports(
    query: str | None = Query(default=None),
    sources: list[str] | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> AirportCatalogResponse:
    airports = airport_catalog_service.list_airports(query=query, sources=sources, limit=limit)
    available_sources = airport_catalog_service.available_sources()

    return AirportCatalogResponse(items=airports, total=len(airports), available_sources=available_sources)


@router.post("/import", response_model=AirportCatalogResponse)
def import_airports(payload: AirportCatalogImportRequest) -> AirportCatalogResponse:
    airport_catalog_service.replace_source(payload.source, payload.airports)
    airports = airport_catalog_service.list_airports(sources=[payload.source], limit=500)
    return AirportCatalogResponse(items=airports, total=len(airports), available_sources=airport_catalog_service.available_sources())


@router.post("/sync/{source}", response_model=AirportCatalogSyncResponse)
async def sync_airports(
    source: str,
    limit: int = Query(default=500, ge=1, le=5000),
    base_only: bool = Query(default=False),
) -> AirportCatalogSyncResponse:
    try:
        return await vamsys_airport_sync_service.sync_source(source=source, limit=limit, base_only=base_only)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.get("/sources/{source}", response_model=list[AirportRecord])
def get_airport_source(source: str) -> list[AirportRecord]:
    return airport_catalog_service.read_source(source)
