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

            fleet_payload = self._resource_payload(fleet_entry)
            fleet_id = self._coerce_int(fleet_payload.get("id"))

            if fleet_id is None:
                continue

            fleet_name = self._first_string(fleet_payload, "name", "title", "aircraft_name", "aircraftName")
            fleet_code = self._first_string(fleet_payload, "code", "icao", "icao_code", "icaoCode", "type_code", "typeCode")
            fleet_type = self._first_string(fleet_payload, "type", "aircraft_type", "aircraftType")

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

                next_cursor = self._extract_next_cursor(response)

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

            next_cursor = self._extract_next_cursor(response)

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

        payload = self._resource_payload(item)
        relationships = item.get("relationships") if isinstance(item.get("relationships"), dict) else {}
        registration = self._first_string(payload, "registration", "reg", "tail_number", "tailNumber", "callsign")

        if not isinstance(registration, str) or not registration.strip():
            return None

        local_fleet_code = self._first_string(payload, "fleet_code", "fleetCode", "code", "icao", "icao_code", "icaoCode", "type_code", "typeCode")
        local_fleet_type = self._first_string(payload, "fleet_type", "fleetType", "aircraft_type", "aircraftType", "type")
        local_fleet_name = self._first_string(payload, "fleet_name", "fleetName", "fleet", "model", "model_name", "modelName")
        normalized_fleet_name = (fleet_name or local_fleet_name or "").strip() or None
        normalized_fleet_code = (fleet_code or local_fleet_code or "").strip() or None
        normalized_fleet_type = (fleet_type or local_fleet_type or "").strip() or None
        name = self._first_string(payload, "name", "title", "aircraft_name", "aircraftName", "model", "model_name", "modelName")
        normalized_name = (name or normalized_fleet_name or normalized_fleet_code or registration).strip()

        tags: list[str] = []

        if normalized_fleet_name:
            tags.append(f"fleet:{normalized_fleet_name}")

        if normalized_fleet_code:
            tags.append(f"fleet-code:{normalized_fleet_code}")

        if normalized_fleet_type:
            tags.append(f"fleet-type:{normalized_fleet_type}")

        if payload.get("hide_in_phoenix") or payload.get("hideInPhoenix") or payload.get("hidden"):
            tags.append("hidden")

        aircraft_id = self._coerce_int(payload.get("id"))
        fleet_id_value = (
            self._coerce_int(payload.get("fleet_id"))
            or self._coerce_int(payload.get("fleetId"))
            or self._extract_relationship_id(relationships.get("fleet"))
            or self._extract_relationship_id(relationships.get("aircraft_type"))
        )

        return AircraftRecord(
            source=source,
            aircraft_id=aircraft_id,
            fleet_id=fleet_id_value,
            registration=registration.strip().upper(),
            name=normalized_name,
            fleet_name=normalized_fleet_name,
            fleet_code=normalized_fleet_code.upper() if normalized_fleet_code else None,
            fleet_type=normalized_fleet_type.lower() if normalized_fleet_type else None,
            image_url=self._first_string(payload, "image_url", "imageUrl", "image", "photo_url", "photoUrl"),
            image_attribution=self._first_string(payload, "image_attribution", "imageAttribution", "photo_attribution", "photoAttribution"),
            image_linkback=self._first_string(payload, "image_linkback", "imageLinkback", "photo_linkback", "photoLinkback"),
            passengers=self._coerce_int(payload.get("passengers") or payload.get("pax")),
            cargo=self._coerce_int(payload.get("cargo") or payload.get("freight")),
            is_hidden=bool(payload.get("hide_in_phoenix") or payload.get("hideInPhoenix") or payload.get("hidden")),
            tags=tags,
        )

    def _resource_payload(self, item: dict[str, Any]) -> dict[str, Any]:
        attributes = item.get("attributes") if isinstance(item.get("attributes"), dict) else {}
        payload = {**attributes, **item}
        payload.pop("attributes", None)
        return payload

    def _extract_next_cursor(self, response: dict[str, Any]) -> str | None:
        meta = response.get("meta")

        if isinstance(meta, dict):
            for key in ("next_cursor", "nextCursor", "cursor"):
                candidate = meta.get(key)

                if isinstance(candidate, str) and candidate.strip():
                    return candidate.strip()

        return None

    def _extract_relationship_id(self, relationship: Any) -> int | None:
        if not isinstance(relationship, dict):
            return None

        data = relationship.get("data")

        if isinstance(data, dict):
            return self._coerce_int(data.get("id"))

        return None

    def _first_string(self, payload: dict[str, Any], *keys: str) -> str | None:
        for key in keys:
            value = payload.get(key)

            if isinstance(value, str) and value.strip():
                return value.strip()

        return None

    def _coerce_int(self, value: Any) -> int | None:
        if isinstance(value, bool):
            return None

        if isinstance(value, int):
            return value

        if isinstance(value, str) and value.strip().isdigit():
            return int(value.strip())

        return None

    def _deduplicate_aircraft(self, aircraft: list[AircraftRecord]) -> list[AircraftRecord]:
        deduplicated_aircraft: dict[str, AircraftRecord] = {}

        for record in aircraft:
            deduplicated_aircraft[record.registration] = record

        return sorted(deduplicated_aircraft.values(), key=lambda record: record.registration)


vamsys_aircraft_sync_service = VamsysAircraftSyncService()
