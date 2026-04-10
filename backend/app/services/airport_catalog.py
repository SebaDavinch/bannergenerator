from __future__ import annotations

from pathlib import Path

from app.core.config import get_settings
from app.core.files import ensure_directory, read_json, write_json
from app.schemas.airports import AirportRecord


class AirportCatalogService:
    def __init__(self, directory: Path, sources: list[str]) -> None:
        self._directory = directory
        self._sources = sources
        ensure_directory(self._directory)

        for source in self._sources:
            path = self._path_for(source)
            if not path.exists():
                write_json(path, [])

    def available_sources(self) -> list[str]:
        return list(self._sources)

    def read_source(self, source: str) -> list[AirportRecord]:
        normalized_source = source.lower()
        payload = read_json(self._path_for(normalized_source), default=[])
        return [AirportRecord.model_validate(item) for item in payload]

    def replace_source(self, source: str, airports: list[AirportRecord]) -> None:
        normalized_source = source.lower()
        if normalized_source not in self._sources:
            self._sources.append(normalized_source)

        write_json(self._path_for(normalized_source), [airport.model_dump() for airport in airports])

    def list_airports(
        self,
        query: str | None = None,
        sources: list[str] | None = None,
        limit: int = 100,
    ) -> list[AirportRecord]:
        selected_sources = [source.lower() for source in (sources or self._sources)]
        query_normalized = (query or "").strip().lower()
        airports: list[AirportRecord] = []

        for source in selected_sources:
            airports.extend(self.read_source(source))

        if query_normalized:
            airports = [
                airport
                for airport in airports
                if query_normalized in airport.icao.lower()
                or query_normalized in (airport.iata or "").lower()
                or query_normalized in airport.name.lower()
                or query_normalized in (airport.city or "").lower()
            ]

        return airports[:limit]

    def _path_for(self, source: str) -> Path:
        return self._directory / f"{source.lower()}.json"


settings = get_settings()
airport_catalog_service = AirportCatalogService(settings.airports_dir, settings.airport_sources)
