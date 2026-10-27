from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.files import read_json, write_json
from app.services.audit_service import audit_service


router = APIRouter()


class ProjectRegistry(BaseModel):
    """Team-shared vAMSYS project registry used by Banner Studio.

    `custom` holds projects the team added; `overrides` holds edits to the
    built-in projects (colours, logo, slug), keyed by project id.
    """

    custom: list[dict[str, Any]] = Field(default_factory=list)
    overrides: dict[str, dict[str, Any]] = Field(default_factory=dict)


def _path():
    return get_settings().data_dir / "projects.json"


@router.get("", response_model=ProjectRegistry)
def get_projects() -> ProjectRegistry:
    return ProjectRegistry(**read_json(_path(), {}))


@router.put("", response_model=ProjectRegistry)
def put_projects(payload: ProjectRegistry) -> ProjectRegistry:
    write_json(_path(), payload.model_dump())
    audit_service.write(
        action="projects.updated",
        actor=None,
        resource_type="projects",
        resource_id="registry",
        metadata={"custom": len(payload.custom), "overrides": len(payload.overrides)},
    )
    return payload
