from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.aircraft import AircraftCatalogResponse, AircraftCatalogSyncResponse, AircraftPhotoSearchResponse
from app.services.aircraft_catalog import aircraft_catalog_service
from app.services.aircraft_photo_search import aircraft_photo_search_service
from app.services.vamsys_aircraft_sync import vamsys_aircraft_sync_service


router = APIRouter()


@router.get("", response_model=AircraftCatalogResponse)
def list_aircraft(
    query: str | None = Query(default=None),
    sources: list[str] | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> AircraftCatalogResponse:
    aircraft = aircraft_catalog_service.list_aircraft(query=query, sources=sources, limit=limit)
    available_sources = aircraft_catalog_service.available_sources()

    return AircraftCatalogResponse(items=aircraft, total=len(aircraft), available_sources=available_sources)


@router.post("/sync/{source}", response_model=AircraftCatalogSyncResponse)
async def sync_aircraft(source: str, limit: int = Query(default=500, ge=1, le=5000)) -> AircraftCatalogSyncResponse:
    try:
        return await vamsys_aircraft_sync_service.sync_source(source=source, limit=limit)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.get("/photos/{registration}", response_model=AircraftPhotoSearchResponse)
async def search_aircraft_photos(
    registration: str,
    source: str | None = Query(default=None),
    aircraft_id: int | None = Query(default=None),
    limit: int = Query(default=6, ge=1, le=12),
) -> AircraftPhotoSearchResponse:
    try:
        return await aircraft_photo_search_service.search(
            registration=registration,
            source=source,
            aircraft_id=aircraft_id,
            limit=limit,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error