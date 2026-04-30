from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import VamsysSourceSettings, get_settings


@dataclass
class CachedToken:
    access_token: str
    expires_at: datetime


class VamsysClient:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._tokens: dict[str, CachedToken] = {}

    def _get_source_settings(self, source: str) -> VamsysSourceSettings:
        normalized_source = source.lower()
        source_settings = self._settings.vamsys_sources.get(normalized_source)

        if not source_settings:
            supported_sources = ", ".join(sorted(self._settings.vamsys_sources))
            raise ValueError(f"Unsupported vAMSYS source '{source}'. Supported sources: {supported_sources}")

        return source_settings

    def configured(self, source: str) -> bool:
        source_settings = self._get_source_settings(source)
        return bool(source_settings.client_id and source_settings.client_secret)

    async def get_access_token(self, source: str) -> str:
        source_settings = self._get_source_settings(source)

        if not self.configured(source):
            raise ValueError(f"vAMSYS client credentials are not configured for '{source_settings.source}'")

        cached_token = self._tokens.get(source_settings.source)

        if cached_token and cached_token.expires_at > datetime.now(timezone.utc) + timedelta(minutes=5):
            return cached_token.access_token

        token_payload = {
            "grant_type": "client_credentials",
            "client_id": source_settings.client_id,
            "client_secret": source_settings.client_secret,
        }

        if source_settings.scope.strip():
            token_payload["scope"] = source_settings.scope.strip()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self._settings.vamsys_token_url,
                data=token_payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            payload = response.json()

        expires_in = int(payload.get("expires_in", 0))
        self._tokens[source_settings.source] = CachedToken(
            access_token=payload["access_token"],
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
        )
        return self._tokens[source_settings.source].access_token

    async def request(
        self,
        source: str,
        method: str,
        path: str,
        json_payload: dict[str, Any] | None = None,
        query_params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        token = await self.get_access_token(source)

        async with httpx.AsyncClient(base_url=self._settings.vamsys_base_url, timeout=60.0) as client:
            response = await client.request(
                method=method,
                url=path,
                json=json_payload,
                params=query_params,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )
            response.raise_for_status()

            if not response.content:
                return {}

            return response.json()


vamsys_client = VamsysClient()
