from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.schemas.vamsys import (
    SubmitActivityRequest,
    SubmitActivityResponse,
    VamsysConnectivityStatus,
    VamsysSourceConnectivityStatus,
)
from app.services.vamsys_client import vamsys_client


CREATE_ACTIVITY_PATHS = {
    "events": "/activities/events",
    "focus-airports": "/activities/focus-airports",
    "tours": "/activities/tours",
    "rosters": "/activities/rosters",
    "community-goals": "/activities/community-goals",
    "community-challenges": "/activities/community-challenges",
}


class VamsysOperationsService:
    def __init__(self) -> None:
        self._settings = get_settings()

    async def get_status(self, source: str | None = None) -> VamsysConnectivityStatus:
        sources = [source.lower()] if source else sorted(self._settings.vamsys_sources)
        unsupported_sources = [item for item in sources if item not in self._settings.vamsys_sources]

        if unsupported_sources:
            supported_sources = ", ".join(sorted(self._settings.vamsys_sources))
            raise ValueError(f"Unsupported vAMSYS source '{unsupported_sources[0]}'. Supported sources: {supported_sources}")

        source_statuses: list[VamsysSourceConnectivityStatus] = []

        for item in sources:
            if not vamsys_client.configured(item):
                source_statuses.append(
                    VamsysSourceConnectivityStatus(
                        source=item,
                        configured=False,
                        can_authenticate=False,
                    )
                )
                continue

            try:
                await vamsys_client.get_access_token(item)
            except httpx.HTTPError:
                source_statuses.append(
                    VamsysSourceConnectivityStatus(
                        source=item,
                        configured=True,
                        can_authenticate=False,
                    )
                )
                continue

            source_statuses.append(
                VamsysSourceConnectivityStatus(
                    source=item,
                    configured=True,
                    can_authenticate=True,
                )
            )

        return VamsysConnectivityStatus(
            base_url=self._settings.vamsys_base_url,
            token_url=self._settings.vamsys_token_url,
            sources=source_statuses,
        )

    async def submit_activity(self, source: str, activity_type: str, payload: SubmitActivityRequest) -> SubmitActivityResponse:
        operation_path = CREATE_ACTIVITY_PATHS.get(activity_type)

        if not operation_path:
            supported = ", ".join(sorted(CREATE_ACTIVITY_PATHS))
            raise ValueError(f"Unsupported activity type '{activity_type}'. Supported types: {supported}")

        response = await vamsys_client.request(source, "POST", operation_path, json_payload=payload.payload)

        remote_id = self._extract_remote_id(response)

        return SubmitActivityResponse(
            source=source,
            operation_path=operation_path,
            remote_id=remote_id,
            response=response,
        )

    def _extract_remote_id(self, response: dict[str, Any]) -> int | str | None:
        for key in ("id", "activity_id", "event_id", "focus_airport_id", "tour_id", "roster_id", "community_goal_id", "community_challenge_id"):
            if key in response:
                return response[key]

        data = response.get("data")
        if isinstance(data, dict):
            for key in ("id", "activity_id", "event_id"):
                if key in data:
                    return data[key]

        return None


vamsys_operations_service = VamsysOperationsService()
