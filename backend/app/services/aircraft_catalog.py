from __future__ import annotations

from pathlib import Path

from app.core.config import get_settings
from app.core.files import ensure_directory, read_json, write_json
from app.schemas.aircraft import AircraftRecord


class AircraftCatalogService:
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

    def read_source(self, source: str) -> list[AircraftRecord]:
        normalized_source = source.lower()
        payload = read_json(self._path_for(normalized_source), default=[])
        return [AircraftRecord.model_validate(item) for item in payload]

    def replace_source(self, source: str, aircraft: list[AircraftRecord]) -> None:
        normalized_source = source.lower()
        if normalized_source not in self._sources:
            self._sources.append(normalized_source)

        write_json(self._path_for(normalized_source), [record.model_dump() for record in aircraft])

    def list_aircraft(
        self,
        query: str | None = None,
        sources: list[str] | None = None,
        limit: int = 100,
    ) -> list[AircraftRecord]:
        selected_sources = [source.lower() for source in (sources or self._sources)]
        query_normalized = (query or "").strip().lower()
        aircraft: list[AircraftRecord] = []

        for source in selected_sources:
            aircraft.extend(self.read_source(source))

        if query_normalized:
            aircraft = [
                record
                for record in aircraft
                if query_normalized in record.registration.lower()
                or query_normalized in record.name.lower()
                or (record.fleet_name and query_normalized in record.fleet_name.lower())
                or (record.fleet_code and query_normalized in record.fleet_code.lower())
                or (record.fleet_type and query_normalized in record.fleet_type.lower())
                or any(query_normalized in tag.lower() for tag in record.tags)
            ]

        aircraft.sort(
            key=lambda record: (
                record.registration.lower(),
                record.name.lower(),
                record.source.lower(),
            )
        )

        return aircraft[:limit]

    def find_aircraft(self, source: str, aircraft_id: int | None = None, registration: str | None = None) -> AircraftRecord | None:
        normalized_registration = registration.strip().upper() if registration else None

        for record in self.read_source(source):
            if aircraft_id is not None and record.aircraft_id == aircraft_id:
                return record

            if normalized_registration and record.registration.upper() == normalized_registration:
                return record

        return None

    def _path_for(self, source: str) -> Path:
        return self._directory / f"{source.lower()}.json"


settings = get_settings()
aircraft_catalog_service = AircraftCatalogService(settings.aircraft_dir, settings.airport_sources)