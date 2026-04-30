from __future__ import annotations

import httpx

from app.schemas.aircraft import AircraftPhotoRecord, AircraftPhotoSearchResponse, AircraftPhotoTypeSearchResponse, AircraftRecord
from app.services.aircraft_catalog import aircraft_catalog_service


class AircraftPhotoSearchService:
    TYPE_CODE_ALIASES: dict[str, tuple[str, ...]] = {
        "B738": ("Boeing 737-800", "Boeing 737 800", "737-800", "737 800"),
        "B737": ("Boeing 737", "Boeing 737 Classic", "737"),
        "A20N": ("Airbus A320neo", "Airbus A320 neo", "A320neo", "A320 neo"),
        "A21N": ("Airbus A321neo", "Airbus A321 neo", "A321neo", "A321 neo"),
        "A321": ("Airbus A321-200", "Airbus A321", "A321-200"),
        "A320": ("Airbus A320-200", "Airbus A320", "A320-200"),
        "A319": ("Airbus A319-100", "Airbus A319", "A319-100"),
        "A332": ("Airbus A330-200", "Airbus A330 200", "A330-200"),
        "A333": ("Airbus A330-300", "Airbus A330 300", "A330-300"),
        "A359": ("Airbus A350-900", "Airbus A350 900", "A350-900"),
        "B772": ("Boeing 777-200ER", "Boeing 777 200ER", "777-200ER"),
        "B773": ("Boeing 777-300ER", "Boeing 777 300ER", "777-300ER"),
        "B77W": ("Boeing 777-300ER", "Boeing 777 300ER", "777-300ER"),
        "B788": ("Boeing 787-8", "Boeing 787 8", "787-8"),
        "B789": ("Boeing 787-9", "Boeing 787 9", "787-9"),
        "E170": ("Embraer 170", "Embraer ERJ-170", "ERJ-170"),
        "E175": ("Embraer 175", "Embraer ERJ-175", "ERJ-175"),
        "E190": ("Embraer 190", "Embraer ERJ-190", "ERJ-190"),
        "E195": ("Embraer 195", "Embraer ERJ-195", "ERJ-195"),
        "SU95": ("Sukhoi Superjet 100", "Superjet 100", "SSJ100"),
    }

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
        candidate_items: list[AircraftPhotoRecord] = []
        local_aircraft: AircraftRecord | None = None

        if source:
            local_aircraft = aircraft_catalog_service.find_aircraft(source=source, aircraft_id=aircraft_id, registration=normalized_registration)

        jetphotos_items = await self._safe_search_jetphotos(normalized_registration, limit)
        candidate_items.extend(jetphotos_items)

        if local_aircraft and local_aircraft.image_url and not any(existing.image_url == local_aircraft.image_url for existing in items):
            candidate_items.append(
                AircraftPhotoRecord(
                    provider="vamsys",
                    image_url=local_aircraft.image_url,
                    thumbnail_url=local_aircraft.image_url,
                    attribution=local_aircraft.image_attribution,
                    linkback=local_aircraft.image_linkback,
                )
            )

        planespotters_items = await self._safe_search_planespotters(normalized_registration, max(1, limit - len(items)))
        candidate_items.extend(planespotters_items)

        # Wikimedia is intentionally a last-resort fallback because its search is broad
        # and can surface loosely related aircraft images for registrations/types.
        if len(candidate_items) < min(limit, 3):
            wikimedia_items = await self._safe_search_wikimedia(
                normalized_registration,
                local_aircraft,
                max(1, limit - len(candidate_items)),
            )
            candidate_items.extend(wikimedia_items)

        items = self._rank_aircraft_photo_items(candidate_items, limit)

        if len(items) < limit and local_aircraft is not None:
            supplemental_type_items = await self.search_by_type(
                query=local_aircraft.fleet_code or local_aircraft.fleet_name or local_aircraft.name,
                source=source,
                aircraft_id=aircraft_id,
                limit=max(1, limit - len(items)),
            )

            for item in supplemental_type_items.items:
                if any(existing.image_url == item.image_url for existing in items):
                    continue

                items.append(item)

                if len(items) >= limit:
                    break

        return AircraftPhotoSearchResponse(registration=normalized_registration, items=items)

    async def search_by_type(
        self,
        query: str,
        source: str | None = None,
        aircraft_id: int | None = None,
        limit: int = 6,
    ) -> AircraftPhotoTypeSearchResponse:
        normalized_query = query.strip()

        if not normalized_query:
            raise ValueError("Aircraft type query is required for photo search")

        items: list[AircraftPhotoRecord] = []
        local_aircraft: AircraftRecord | None = None

        if source:
            local_aircraft = aircraft_catalog_service.find_aircraft(source=source, aircraft_id=aircraft_id, registration=None)
        elif aircraft_id is not None:
            local_aircraft = next(
                (
                    record
                    for current_source in aircraft_catalog_service.available_sources()
                    for record in [aircraft_catalog_service.find_aircraft(source=current_source, aircraft_id=aircraft_id, registration=None)]
                    if record is not None
                ),
                None,
            )

        for item in self._collect_local_type_matches(normalized_query, source, local_aircraft, limit):
            if any(existing.image_url == item.image_url for existing in items):
                continue

            items.append(item)

            if len(items) >= limit:
                return AircraftPhotoTypeSearchResponse(query=normalized_query, items=items)

        # Keep Wikimedia as the final fallback for type search too.
        if len(items) < min(limit, 2):
            wikimedia_items = await self._safe_search_wikimedia_by_type(
                normalized_query,
                local_aircraft,
                max(1, limit - len(items)),
            )

            for item in wikimedia_items:
                if any(existing.image_url == item.image_url for existing in items):
                    continue

                items.append(item)

                if len(items) >= limit:
                    break

        return AircraftPhotoTypeSearchResponse(query=normalized_query, items=items)

    def _rank_aircraft_photo_items(self, items: list[AircraftPhotoRecord], limit: int) -> list[AircraftPhotoRecord]:
        deduplicated: list[AircraftPhotoRecord] = []

        for item in sorted(items, key=self._score_aircraft_photo_item, reverse=True):
            if any(existing.image_url == item.image_url for existing in deduplicated):
                continue
            deduplicated.append(item)

        high_quality_count = sum(1 for item in deduplicated if item.provider != "planespotters")
        if high_quality_count >= min(limit, 3):
            deduplicated = [item for item in deduplicated if item.provider != "planespotters"]

        return deduplicated[:limit]

    def _score_aircraft_photo_item(self, item: AircraftPhotoRecord) -> int:
        score = {
            "jetphotos": 120,
            "vamsys": 96,
            "wikimedia": 70,
            "planespotters": 35,
        }.get(item.provider.lower(), 0)

        image_url = item.image_url.lower()
        thumbnail_url = (item.thumbnail_url or "").lower()
        attribution = (item.attribution or "").lower()
        linkback = (item.linkback or "").lower()

        if item.provider.lower() == "jetphotos" and "cdn.jetphotos.com/full/" in image_url:
            score += 24

        if item.provider.lower() == "vamsys":
            score += 8

        if item.provider.lower() == "wikimedia":
            if "commons.wikimedia.org" in linkback:
                score += 6
            if any(token in attribution for token in ("cropped", "crop", "thumbnail")):
                score -= 10

        if item.provider.lower() == "planespotters":
            if "_280." in image_url or "_400." in image_url or "_280." in thumbnail_url or "_400." in thumbnail_url:
                score -= 12

        if any(token in image_url or token in linkback for token in ("logo", "diagram", "seat-map", "route-map")):
            score -= 60

        return score

    async def _safe_search_planespotters(self, registration: str, limit: int) -> list[AircraftPhotoRecord]:
        try:
            return await self._search_planespotters(registration, limit)
        except httpx.HTTPError:
            return []

    async def _safe_search_jetphotos(self, registration: str, limit: int) -> list[AircraftPhotoRecord]:
        try:
            return await self._search_jetphotos(registration, limit)
        except httpx.HTTPError:
            return []

    async def _safe_search_wikimedia(
        self,
        registration: str,
        aircraft: AircraftRecord | None,
        limit: int,
    ) -> list[AircraftPhotoRecord]:
        try:
            return await self._search_wikimedia(registration, aircraft, limit)
        except httpx.HTTPError:
            return []

    async def _safe_search_wikimedia_by_type(
        self,
        query: str,
        aircraft: AircraftRecord | None,
        limit: int,
    ) -> list[AircraftPhotoRecord]:
        try:
            return await self._search_wikimedia_by_type(query, aircraft, limit)
        except httpx.HTTPError:
            return []

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

    async def _search_jetphotos(self, registration: str, limit: int) -> list[AircraftPhotoRecord]:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(
                "https://www.jetapi.dev/api",
                params={
                    "reg": registration,
                    "photos": str(limit),
                    "only_jp": "true",
                },
                headers={
                    "Accept": "application/json",
                    "User-Agent": "VACBannerGenerator/1.0 (aircraft photo lookup)",
                },
            )

            if response.status_code == 404:
                return []

            response.raise_for_status()
            payload = response.json()

        images = payload.get("Images")

        if not isinstance(images, list):
            return []

        items: list[AircraftPhotoRecord] = []

        for image in images:
            if not isinstance(image, dict):
                continue

            image_url = image.get("Image")

            if not isinstance(image_url, str) or not image_url:
                continue

            thumbnail_url = image.get("Thumbnail")
            photographer = image.get("Photographer")
            aircraft = image.get("Aircraft")
            linkback = image.get("Link")

            attribution = " / ".join(
                value
                for value in (
                    photographer if isinstance(photographer, str) else None,
                    aircraft if isinstance(aircraft, str) else None,
                )
                if value
            )

            items.append(
                AircraftPhotoRecord(
                    provider="jetphotos",
                    image_url=image_url,
                    thumbnail_url=thumbnail_url if isinstance(thumbnail_url, str) else image_url,
                    attribution=attribution or "JetPhotos",
                    linkback=linkback if isinstance(linkback, str) else None,
                )
            )

            if len(items) >= limit:
                break

        return items

    async def _search_wikimedia(
        self,
        registration: str,
        aircraft: AircraftRecord | None,
        limit: int,
    ) -> list[AircraftPhotoRecord]:
        queries = self._build_wikimedia_queries(registration, aircraft)

        if not queries:
            return []

        items: list[AircraftPhotoRecord] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in queries:
                response = await client.get(
                    "https://commons.wikimedia.org/w/api.php",
                    params={
                        "origin": "*",
                        "action": "query",
                        "format": "json",
                        "generator": "search",
                        "gsrnamespace": "6",
                        "gsrlimit": "8",
                        "gsrsearch": query,
                        "prop": "imageinfo",
                        "iiprop": "url|size|mime|extmetadata",
                        "iiurlwidth": "1600",
                    },
                    headers={
                        "Accept": "application/json",
                        "User-Agent": "VACBannerGenerator/1.0 (aircraft photo lookup)",
                    },
                )
                response.raise_for_status()
                payload = response.json()

                for item in self._map_wikimedia_items(payload):
                    if any(existing.image_url == item.image_url for existing in items):
                        continue

                    items.append(item)

                    if len(items) >= limit:
                        return items

        return items

    async def _search_wikimedia_by_type(
        self,
        query: str,
        aircraft: AircraftRecord | None,
        limit: int,
    ) -> list[AircraftPhotoRecord]:
        queries = self._build_wikimedia_type_queries(query, aircraft)

        if not queries:
            return []

        items: list[AircraftPhotoRecord] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for search_query in queries:
                response = await client.get(
                    "https://commons.wikimedia.org/w/api.php",
                    params={
                        "origin": "*",
                        "action": "query",
                        "format": "json",
                        "generator": "search",
                        "gsrnamespace": "6",
                        "gsrlimit": "8",
                        "gsrsearch": search_query,
                        "prop": "imageinfo",
                        "iiprop": "url|size|mime|extmetadata",
                        "iiurlwidth": "1600",
                    },
                    headers={
                        "Accept": "application/json",
                        "User-Agent": "VACBannerGenerator/1.0 (aircraft photo lookup)",
                    },
                )
                response.raise_for_status()
                payload = response.json()

                for item in self._map_wikimedia_items(payload):
                    if any(existing.image_url == item.image_url for existing in items):
                        continue

                    items.append(item)

                    if len(items) >= limit:
                        return items

        return items

    def _build_wikimedia_queries(self, registration: str, aircraft: AircraftRecord | None) -> list[str]:
        queries = [
            f'"{registration}" aircraft',
            f'"{registration}" airplane',
        ]

        if aircraft:
            for value in (aircraft.name, aircraft.fleet_name, aircraft.fleet_code, aircraft.fleet_type):
                if value and value.strip() and value.strip().upper() != registration:
                    queries.append(f'"{registration}" "{value.strip()}"')
                    queries.append(f'"{value.strip()}" aircraft')

        return list(dict.fromkeys(queries))

    def _build_wikimedia_type_queries(self, query: str, aircraft: AircraftRecord | None) -> list[str]:
        queries: list[str] = []

        for candidate in self._build_type_search_terms(query, aircraft):
            queries.append(f'"{candidate}" aircraft')
            queries.append(f'"{candidate}" airplane')
            queries.append(f'"{candidate}" airliner')

        if aircraft:
            for value in (aircraft.name, aircraft.fleet_name, aircraft.fleet_code):
                if value and value.strip() and value.strip().lower() != query.lower():
                    queries.append(f'"{value.strip()}" aircraft')

        return list(dict.fromkeys(queries))

    def _map_wikimedia_items(self, payload: dict) -> list[AircraftPhotoRecord]:
        query = payload.get("query")
        pages = query.get("pages") if isinstance(query, dict) else None

        if not isinstance(pages, dict):
            return []

        items: list[AircraftPhotoRecord] = []

        for page in pages.values():
            if not isinstance(page, dict):
                continue

            image_info_items = page.get("imageinfo")

            if not isinstance(image_info_items, list) or not image_info_items:
                continue

            image_info = image_info_items[0]

            if not isinstance(image_info, dict):
                continue

            mime = image_info.get("mime")
            image_url = image_info.get("url")
            thumbnail_url = image_info.get("thumburl")
            width = image_info.get("width")
            height = image_info.get("height")

            if not isinstance(image_url, str) or not image_url:
                continue

            if isinstance(mime, str) and not mime.startswith("image/"):
                continue

            if isinstance(width, int) and isinstance(height, int):
                if width < 1280 or height < 720:
                    continue

            if self._looks_like_non_aircraft_image(page.get("title")):
                continue

            attribution, linkback = self._extract_wikimedia_attribution(page, image_info)

            items.append(
                AircraftPhotoRecord(
                    provider="wikimedia",
                    image_url=image_url,
                    thumbnail_url=thumbnail_url if isinstance(thumbnail_url, str) else image_url,
                    attribution=attribution,
                    linkback=linkback,
                )
            )

        return items

    def _looks_like_non_aircraft_image(self, title: object) -> bool:
        if not isinstance(title, str):
            return False

        normalized_title = title.lower()
        return any(
            token in normalized_title
            for token in (
                "logo",
                "map",
                "diagram",
                "airport terminal",
                "terminal",
                "seat map",
                "route map",
            )
        )

    def _extract_wikimedia_attribution(self, page: dict, image_info: dict) -> tuple[str | None, str | None]:
        metadata = image_info.get("extmetadata")
        artist: str | None = None
        license_short_name: str | None = None

        if isinstance(metadata, dict):
            artist = self._metadata_value(metadata.get("Artist"))
            license_short_name = self._metadata_value(metadata.get("LicenseShortName"))

        title = page.get("title") if isinstance(page.get("title"), str) else None
        attribution = " / ".join(item for item in (artist, license_short_name) if item) or "Wikimedia Commons"
        page_id = page.get("pageid")
        linkback = f"https://commons.wikimedia.org/?curid={page_id}" if isinstance(page_id, int) else None

        if title and attribution == "Wikimedia Commons":
            attribution = title.replace("File:", "")

        return attribution, linkback

    def _metadata_value(self, value: object) -> str | None:
        if not isinstance(value, dict):
            return None

        raw_value = value.get("value")

        if not isinstance(raw_value, str) or not raw_value.strip():
            return None

        return raw_value.replace("<span class=\"int-own-work\" lang=\"en\">Own work</span>", "Own work").strip()

    def _collect_local_type_matches(
        self,
        query: str,
        source: str | None,
        aircraft: AircraftRecord | None,
        limit: int,
    ) -> list[AircraftPhotoRecord]:
        selected_sources = [source] if source else aircraft_catalog_service.available_sources()
        search_terms = self._build_type_search_terms(query, aircraft)
        if not search_terms:
            return []

        matches: list[tuple[int, AircraftRecord]] = []

        for current_source in selected_sources:
            for record in aircraft_catalog_service.read_source(current_source):
                if not record.image_url:
                    continue

                score = self._score_local_type_match(record, search_terms, aircraft)
                if score <= 0:
                    continue

                matches.append((score, record))

        matches.sort(
            key=lambda item: (
                -item[0],
                item[1].fleet_name or "",
                item[1].registration,
            )
        )

        items: list[AircraftPhotoRecord] = []

        for _, record in matches:
            if any(existing.image_url == record.image_url for existing in items):
                continue

            items.append(
                AircraftPhotoRecord(
                    provider="vamsys",
                    image_url=record.image_url,
                    thumbnail_url=record.image_url,
                    attribution=record.image_attribution,
                    linkback=record.image_linkback,
                )
            )

            if len(items) >= limit:
                break

        return items

    def _build_type_search_terms(self, query: str, aircraft: AircraftRecord | None) -> list[str]:
        candidates = [query]

        if aircraft:
            candidates.extend(value for value in (aircraft.name, aircraft.fleet_name, aircraft.fleet_code, aircraft.fleet_type) if value)

        normalized_candidates: list[str] = []

        for candidate in candidates:
            if not isinstance(candidate, str):
                continue

            cleaned = candidate.strip()
            if not cleaned:
                continue

            variants = {
                cleaned,
                self._normalize_type_term(cleaned),
            }

            compact_code = cleaned.upper().replace(" ", "").replace("-", "")
            for alias in self.TYPE_CODE_ALIASES.get(compact_code, ()):
                variants.add(alias)
                variants.add(self._normalize_type_term(alias))

            without_suffix = self._strip_airline_suffix(cleaned)
            if without_suffix:
                variants.add(without_suffix)
                variants.add(self._normalize_type_term(without_suffix))

                compact_suffixless_code = without_suffix.upper().replace(" ", "").replace("-", "")
                for alias in self.TYPE_CODE_ALIASES.get(compact_suffixless_code, ()):
                    variants.add(alias)
                    variants.add(self._normalize_type_term(alias))

            for variant in variants:
                normalized_variant = " ".join(variant.split()).strip()
                if normalized_variant and normalized_variant.lower() not in {item.lower() for item in normalized_candidates}:
                    normalized_candidates.append(normalized_variant)

        return normalized_candidates

    def _score_local_type_match(
        self,
        record: AircraftRecord,
        search_terms: list[str],
        aircraft: AircraftRecord | None,
    ) -> int:
        haystacks = [
            value.strip().lower()
            for value in (record.name, record.fleet_name, record.fleet_code, record.fleet_type)
            if isinstance(value, str) and value.strip()
        ]
        if not haystacks:
            return 0

        score = 0

        if aircraft and aircraft.aircraft_id is not None and record.aircraft_id == aircraft.aircraft_id:
            score += 120

        if aircraft and aircraft.fleet_id is not None and record.fleet_id == aircraft.fleet_id:
            score += 90

        for term in search_terms:
            normalized_term = term.strip().lower()
            if not normalized_term:
                continue

            compact_term = normalized_term.replace(" ", "")

            for haystack in haystacks:
                compact_haystack = haystack.replace(" ", "")

                if haystack == normalized_term or compact_haystack == compact_term:
                    score = max(score, 100)
                    continue

                if normalized_term in haystack or compact_term in compact_haystack:
                    score = max(score, 70)
                    continue

                if self._normalize_type_term(haystack) == self._normalize_type_term(normalized_term):
                    score = max(score, 85)

        return score

    def _strip_airline_suffix(self, value: str) -> str:
        return value.rsplit("(", 1)[0].strip() if "(" in value and ")" in value else value.strip()

    def _normalize_type_term(self, value: str) -> str:
        normalized = value.lower().strip()
        normalized = self._strip_airline_suffix(normalized)
        normalized = normalized.replace("_", " ").replace("-", " ")
        normalized = " ".join(normalized.split())
        return normalized


aircraft_photo_search_service = AircraftPhotoSearchService()
