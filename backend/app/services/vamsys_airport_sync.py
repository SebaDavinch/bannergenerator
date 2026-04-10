from __future__ import annotations

from typing import Any

from app.core.config import get_settings
from app.schemas.airports import AirportCatalogSyncResponse, AirportRecord
from app.services.airport_catalog import airport_catalog_service
from app.services.vamsys_client import vamsys_client


class VamsysAirportSyncService:
    def __init__(self) -> None:
        self._settings = get_settings()

    async def sync_source(self, source: str, limit: int = 500, base_only: bool = False) -> AirportCatalogSyncResponse:
        normalized_source = source.lower()

        if normalized_source not in self._settings.vamsys_sources:
            supported_sources = ", ".join(sorted(self._settings.vamsys_sources))
            raise ValueError(f"Unsupported airport source '{source}'. Supported sources: {supported_sources}")

        if limit < 1:
            raise ValueError("Airport sync limit must be greater than zero")

        imported_airports: list[AirportRecord] = []
        next_cursor: str | None = None

        while len(imported_airports) < limit:
            page_size = min(100, limit - len(imported_airports))
            query_params: dict[str, Any] = {
                "sort": "icao",
                "page[size]": page_size,
            }

            if next_cursor:
                query_params["page[cursor]"] = next_cursor

            if base_only:
                query_params["filter[base]"] = "1"

            response = await vamsys_client.request(normalized_source, "GET", "/airports", query_params=query_params)
            response_items = response.get("data")

            if not isinstance(response_items, list) or len(response_items) == 0:
                break

            for item in response_items:
                airport_record = self._map_airport(normalized_source, item)

                if airport_record is not None:
                    imported_airports.append(airport_record)

                if len(imported_airports) >= limit:
                    break

            meta = response.get("meta")
            next_cursor = meta.get("next_cursor") if isinstance(meta, dict) else None

            if not next_cursor:
                break

        normalized_airports = self._deduplicate_airports(imported_airports)
        airport_catalog_service.replace_source(normalized_source, normalized_airports)

        return AirportCatalogSyncResponse(
            source=normalized_source,
            imported=len(normalized_airports),
            total=len(normalized_airports),
            available_sources=airport_catalog_service.available_sources(),
        )

    def _map_airport(self, source: str, item: Any) -> AirportRecord | None:
        if not isinstance(item, dict):
            return None

        icao = item.get("icao")

        if not isinstance(icao, str) or not icao.strip():
            return None

        name = item.get("name")

        if not isinstance(name, str) or not name.strip():
            return None

        iata = item.get("iata") if isinstance(item.get("iata"), str) else None
        city = item.get("city") if isinstance(item.get("city"), str) else None
        latitude = self._coerce_float(item.get("latitude"))
        longitude = self._coerce_float(item.get("longitude"))
        country_code = self._extract_country_code(item.get("country"))
        category = item.get("category") if isinstance(item.get("category"), str) else None
        is_hub = bool(item.get("base"))

        tags: list[str] = []

        if category:
            tags.append(f"category:{category.strip()}")

        if item.get("base"):
            tags.append("base")

        if item.get("suitable_alternate"):
            tags.append("suitable-alternate")

        return AirportRecord(
            source=source,
            airport_id=item.get("id") if isinstance(item.get("id"), int) else None,
            icao=icao.strip().upper(),
            iata=iata.strip().upper() if iata else None,
            name=name.strip(),
            city=city.strip() if city else None,
            country_code=country_code,
            latitude=latitude,
            longitude=longitude,
            is_hub=is_hub,
            tags=tags,
        )

    def _extract_country_code(self, value: Any) -> str | None:
        if not isinstance(value, dict):
            return None

        for key in ("code", "alpha2", "iso_code", "iso2"):
            candidate = value.get(key)

            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip().upper()[:2]

        return None

    def _coerce_float(self, value: Any) -> float | None:
        if isinstance(value, (int, float)):
            return float(value)

        return None

    def _deduplicate_airports(self, airports: list[AirportRecord]) -> list[AirportRecord]:
        deduplicated_airports: dict[str, AirportRecord] = {}

        for airport in airports:
            deduplicated_airports[airport.icao] = airport

        return sorted(deduplicated_airports.values(), key=lambda airport: airport.icao)


vamsys_airport_sync_service = VamsysAirportSyncService()