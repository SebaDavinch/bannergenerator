import httpx
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response

from app.schemas.aircraft import (
    AircraftCatalogResponse,
    AircraftCatalogSyncResponse,
    AircraftPhotoSearchResponse,
    AircraftPhotoTypeSearchResponse,
)
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
    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"vAMSYS aircraft sync failed with HTTP {error.response.status_code}",
        ) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"vAMSYS aircraft sync request failed: {error.__class__.__name__}",
        ) from error


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


@router.get("/photos-by-type", response_model=AircraftPhotoTypeSearchResponse)
async def search_aircraft_photos_by_type(
    query: str = Query(min_length=1),
    source: str | None = Query(default=None),
    aircraft_id: int | None = Query(default=None),
    limit: int = Query(default=6, ge=1, le=12),
) -> AircraftPhotoTypeSearchResponse:
    try:
        return await aircraft_photo_search_service.search_by_type(
            query=query,
            source=source,
            aircraft_id=aircraft_id,
            limit=limit,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.get("/photo-proxy")
async def proxy_aircraft_photo(url: str = Query(min_length=1)) -> Response:
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only HTTP(S) image URLs are supported")

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as client:
            upstream = await client.get(url)
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Aircraft photo proxy request failed: {error.__class__.__name__}",
        ) from error

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Aircraft photo proxy failed with HTTP {upstream.status_code}",
        )

    content_type = upstream.headers.get("content-type", "application/octet-stream")

    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Requested URL did not return an image")

    return Response(
        content=upstream.content,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
        },
    )
