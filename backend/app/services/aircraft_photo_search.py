from __future__ import annotations

import httpx

from app.schemas.aircraft import AircraftPhotoRecord, AircraftPhotoSearchResponse
from app.services.aircraft_catalog import aircraft_catalog_service


class AircraftPhotoSearchService:
    async def search(
        self,
        registration: str,
        source: str | None = None,
        aircraft_id: int | None = None,
        limit: int = 6,
    ) -> AircraftPhotoSearchResponse:
        normalized_registration = registration.strip().upper()

        if not normalized_registration:
            raise ValueError("Aircraft registration is required for photo search")

        items: list[AircraftPhotoRecord] = []

        if source:
            local_aircraft = aircraft_catalog_service.find_aircraft(source=source, aircraft_id=aircraft_id, registration=normalized_registration)

            if local_aircraft and local_aircraft.image_url:
                items.append(
                    AircraftPhotoRecord(
                        provider="vamsys",
                        image_url=local_aircraft.image_url,
                        thumbnail_url=local_aircraft.image_url,
                        attribution=local_aircraft.image_attribution,
                        linkback=local_aircraft.image_linkback,
                    )
                )

        planespotters_items = await self._search_planespotters(normalized_registration, max(1, limit - len(items)))

        for item in planespotters_items:
            if any(existing.image_url == item.image_url for existing in items):
                continue

            items.append(item)

            if len(items) >= limit:
                break

        return AircraftPhotoSearchResponse(registration=normalized_registration, items=items)

    async def _search_planespotters(self, registration: str, limit: int) -> list[AircraftPhotoRecord]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://api.planespotters.net/pub/photos/reg/{registration}",
                headers={"Accept": "application/json"},
            )

            if response.status_code == 404:
                return []

            response.raise_for_status()
            payload = response.json()

        photos = payload.get("photos")

        if not isinstance(photos, list):
            return []

        items: list[AircraftPhotoRecord] = []

        for photo in photos[:limit]:
            if not isinstance(photo, dict):
                continue

            large_thumbnail = photo.get("thumbnail_large") if isinstance(photo.get("thumbnail_large"), dict) else None
            thumbnail = photo.get("thumbnail") if isinstance(photo.get("thumbnail"), dict) else None
            image_url = large_thumbnail.get("src") if large_thumbnail and isinstance(large_thumbnail.get("src"), str) else None
            thumbnail_url = thumbnail.get("src") if thumbnail and isinstance(thumbnail.get("src"), str) else image_url

            if not image_url:
                continue

            items.append(
                AircraftPhotoRecord(
                    provider="planespotters",
                    image_url=image_url,
                    thumbnail_url=thumbnail_url,
                    attribution=photo.get("photographer") if isinstance(photo.get("photographer"), str) else None,
                    linkback=photo.get("link") if isinstance(photo.get("link"), str) else None,
                )
            )

        return items


aircraft_photo_search_service = AircraftPhotoSearchService()