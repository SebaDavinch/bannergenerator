from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"

load_dotenv(BASE_DIR / ".env", override=False)


@dataclass(frozen=True)
class VamsysSourceSettings:
    source: str
    client_id: str
    client_secret: str
    scope: str


@dataclass(frozen=True)
class Settings:
    app_name: str
    cors_origins: list[str]
    vamsys_client_id: str
    vamsys_client_secret: str
    vamsys_scope: str
    vamsys_base_url: str
    vamsys_token_url: str
    vamsys_sources: dict[str, VamsysSourceSettings]
    airport_sources: list[str]
    data_dir: Path
    airports_dir: Path
    aircraft_dir: Path
    logs_dir: Path
    drafts_dir: Path
    creations_dir: Path
    creation_records_dir: Path
    creation_images_dir: Path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    cors_origins = [
        item.strip()
        for item in os.getenv(
            "BACKEND_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
        ).split(",")
        if item.strip()
    ]
    airport_sources = [
        item.strip().lower()
        for item in os.getenv("AIRPORT_CATALOG_SOURCES", "rag,vnws").split(",")
        if item.strip()
    ]
    default_client_id = os.getenv("VAMSYS_CLIENT_ID", "")
    default_client_secret = os.getenv("VAMSYS_CLIENT_SECRET", "")
    default_scope = os.getenv("VAMSYS_SCOPE", "")

    vamsys_sources = {
        "vnws": VamsysSourceSettings(
            source="vnws",
            client_id=os.getenv("VAMSYS_VNWS_CLIENT_ID", default_client_id),
            client_secret=os.getenv("VAMSYS_VNWS_CLIENT_SECRET", default_client_secret),
            scope=os.getenv("VAMSYS_VNWS_SCOPE", default_scope),
        ),
        "rag": VamsysSourceSettings(
            source="rag",
            client_id=os.getenv("VAMSYS_RAG_CLIENT_ID", ""),
            client_secret=os.getenv("VAMSYS_RAG_CLIENT_SECRET", ""),
            scope=os.getenv("VAMSYS_RAG_SCOPE", default_scope),
        ),
    }

    return Settings(
        app_name="VA Assistant Backend",
        cors_origins=cors_origins,
        vamsys_client_id=default_client_id,
        vamsys_client_secret=default_client_secret,
        vamsys_scope=default_scope,
        vamsys_base_url=os.getenv("VAMSYS_BASE_URL", "https://vamsys.io/api/v3/operations"),
        vamsys_token_url=os.getenv("VAMSYS_TOKEN_URL", "https://vamsys.io/oauth/token"),
        vamsys_sources=vamsys_sources,
        airport_sources=airport_sources,
        data_dir=DATA_DIR,
        airports_dir=DATA_DIR / "airports",
        aircraft_dir=DATA_DIR / "aircraft",
        logs_dir=DATA_DIR / "logs",
        drafts_dir=DATA_DIR / "drafts",
        creations_dir=DATA_DIR / "creations",
        creation_records_dir=DATA_DIR / "creations" / "records",
        creation_images_dir=DATA_DIR / "creations" / "images",
    )
