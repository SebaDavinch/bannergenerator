from __future__ import annotations

from typing import Any

from app.core.config import get_settings
from app.schemas.aircraft import AircraftCatalogSyncResponse, AircraftRecord
from app.services.aircraft_catalog import aircraft_catalog_service
from app.services.vamsys_client import vamsys_client


class VamsysAircraftSyncService:
    def __init__(self) -> None:
        self._settings = get_settings()

    async def sync_source(self, source: str, limit: int = 500) -> AircraftCatalogSyncResponse:
        normalized_source = source.lower()

        if normalized_source not in self._settings.vamsys_sources:
            supported_sources = ", ".join(sorted(self._settings.vamsys_sources))
            raise ValueError(f"Unsupported aircraft source '{source}'. Supported sources: {supported_sources}")

        if limit < 1:
            raise ValueError("Aircraft sync limit must be greater than zero")

        imported_aircraft: list[AircraftRecord] = []
        fleet_entries = await self._read_fleet_entries(normalized_source)

        for fleet_entry in fleet_entries:
            if len(imported_aircraft) >= limit:
                break

            fleet_id = fleet_entry.get("id")

            if not isinstance(fleet_id, int):
                continue

            fleet_name = fleet_entry.get("name") if isinstance(fleet_entry.get("name"), str) else None
            fleet_code = fleet_entry.get("code") if isinstance(fleet_entry.get("code"), str) else None
            fleet_type = fleet_entry.get("type") if isinstance(fleet_entry.get("type"), str) else None

            next_cursor: str | None = None

            while len(imported_aircraft) < limit:
                page_size = min(100, limit - len(imported_aircraft))
                query_params: dict[str, Any] = {
                    "sort": "registration",
                    "page[size]": page_size,
                }

                if next_cursor:
                    query_params["page[cursor]"] = next_cursor

                response = await vamsys_client.request(
                    normalized_source,
                    "GET",
                    f"/fleet/{fleet_id}/aircraft",
                    query_params=query_params,
                )

                response_items = response.get("data")

                if not isinstance(response_items, list) or len(response_items) == 0:
                    break

                for item in response_items:
                    record = self._map_aircraft(normalized_source, item, fleet_name, fleet_code, fleet_type)

                    if record is not None:
                        imported_aircraft.append(record)

                    if len(imported_aircraft) >= limit:
                        break

                meta = response.get("meta")
                next_cursor = meta.get("next_cursor") if isinstance(meta, dict) else None

                if not next_cursor:
                    break

        normalized_aircraft = self._deduplicate_aircraft(imported_aircraft)
        aircraft_catalog_service.replace_source(normalized_source, normalized_aircraft)

        return AircraftCatalogSyncResponse(
            source=normalized_source,
            imported=len(normalized_aircraft),
            total=len(normalized_aircraft),
            available_sources=aircraft_catalog_service.available_sources(),
        )

    async def _read_fleet_entries(self, source: str) -> list[dict[str, Any]]:
        fleet_entries: list[dict[str, Any]] = []
        next_cursor: str | None = None

        while True:
            query_params: dict[str, Any] = {
                "sort": "code",
                "page[size]": 100,
            }

            if next_cursor:
                query_params["page[cursor]"] = next_cursor

            response = await vamsys_client.request(source, "GET", "/fleet", query_params=query_params)
            response_items = response.get("data")

            if not isinstance(response_items, list) or len(response_items) == 0:
                break

            fleet_entries.extend(item for item in response_items if isinstance(item, dict))

            meta = response.get("meta")
            next_cursor = meta.get("next_cursor") if isinstance(meta, dict) else None

            if not next_cursor:
                break

        return fleet_entries

    def _map_aircraft(
        self,
        source: str,
        item: Any,
        fleet_name: str | None,
        fleet_code: str | None,
        fleet_type: str | None,
    ) -> AircraftRecord | None:
        if not isinstance(item, dict):
            return None

        registration = item.get("registration")
        name = item.get("name")

        if not isinstance(registration, str) or not registration.strip():
            return None

        if not isinstance(name, str) or not name.strip():
            return None

        tags: list[str] = []

        if fleet_name:
            tags.append(f"fleet:{fleet_name.strip()}")

        if fleet_code:
            tags.append(f"fleet-code:{fleet_code.strip()}")

        if fleet_type:
            tags.append(f"fleet-type:{fleet_type.strip()}")

        if item.get("hide_in_phoenix"):
            tags.append("hidden")

        return AircraftRecord(
            source=source,
            aircraft_id=item.get("id") if isinstance(item.get("id"), int) else None,
            fleet_id=item.get("fleet_id") if isinstance(item.get("fleet_id"), int) else None,
            registration=registration.strip().upper(),
            name=name.strip(),
            fleet_name=fleet_name.strip() if fleet_name else None,
            fleet_code=fleet_code.strip().upper() if fleet_code else None,
            fleet_type=fleet_type.strip().lower() if fleet_type else None,
            image_url=item.get("image_url") if isinstance(item.get("image_url"), str) else None,
            image_attribution=item.get("image_attribution") if isinstance(item.get("image_attribution"), str) else None,
            image_linkback=item.get("image_linkback") if isinstance(item.get("image_linkback"), str) else None,
            passengers=item.get("passengers") if isinstance(item.get("passengers"), int) else None,
            cargo=item.get("cargo") if isinstance(item.get("cargo"), int) else None,
            is_hidden=bool(item.get("hide_in_phoenix")),
            tags=tags,
        )

    def _deduplicate_aircraft(self, aircraft: list[AircraftRecord]) -> list[AircraftRecord]:
        deduplicated_aircraft: dict[str, AircraftRecord] = {}

        for record in aircraft:
            deduplicated_aircraft[record.registration] = record

        return sorted(deduplicated_aircraft.values(), key=lambda record: record.registration)


vamsys_aircraft_sync_service = VamsysAircraftSyncService()