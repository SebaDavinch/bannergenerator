from typing import Any, Literal

from pydantic import BaseModel, Field, ConfigDict


ActivityType = Literal[
    "events",
    "focus-airports",
    "tours",
    "rosters",
    "community-goals",
    "community-challenges",
]

VamsysSource = Literal["rag", "vnws"]


class BaseActivityPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str = Field(min_length=1)
    description: str | None = None
    sidebar_title: str | None = None
    sidebar_content: str | None = None
    show_from: str | None = None
    start: str
    end: str
    image: str | None = None
    image_dark: str | None = None
    tags: list[str] | None = None


class EventActivityPayload(BaseActivityPayload):
    subtype: str
    points: int
    time_award_scale: int
    points_as_percentage: bool | None = None
    time_leeway: int | None = None
    allow_repeat_participation: bool | None = None
    registration_required: bool | None = None
    registration_start: str | None = None
    registration_end: str | None = None
    replicates: bool | None = None
    replicate_interval: str | None = None
    operator: str | None = None
    restrictions: dict[str, Any] | None = None
    departure_airport_ids: list[int] | None = None
    arrival_airport_ids: list[int] | None = None
    routes: list[dict[str, Any]] | None = None


class FocusAirportPayload(BaseActivityPayload):
    points: int
    time_award_scale: int
    airport_id: int
    points_as_percentage: bool | None = None
    time_leeway: int | None = None
    allow_repeat_participation: bool | None = None
    replicates: bool | None = None
    replicate_interval: str | None = None
    restrictions: dict[str, Any] | None = None


class TourPayload(BaseActivityPayload):
    subtype: str
    points: int
    time_award_scale: int
    registration_start: str
    registration_end: str
    points_as_percentage: bool | None = None
    time_leeway: int | None = None
    allow_repeat_participation: bool | None = None
    restrictions: dict[str, Any] | None = None
    legs: list[dict[str, Any]] | None = None


class RosterPayload(BaseActivityPayload):
    type: str
    time_leeway: int | None = None
    allow_repeat_participation: bool | None = None
    restrictions: dict[str, Any] | None = None
    legs: list[dict[str, Any]]


class CommunityGoalPayload(BaseActivityPayload):
    count_type: str
    count_target: int | float
    participation_points_per_pirep: int | None = None
    completion_points: int | None = None
    tiers_enabled: bool | None = None
    tier_top_10_multiplier: float | None = None
    tier_top_25_multiplier: float | None = None
    tier_top_50_multiplier: float | None = None
    tier_top_75_multiplier: float | None = None
    filters: list[dict[str, Any]] | None = None


class CommunityChallengePayload(BaseActivityPayload):
    participation_points_per_pirep: int | None = None
    winner_points: int | None = None
    tiers_enabled: bool | None = None
    tier_top_10_multiplier: float | None = None
    tier_top_25_multiplier: float | None = None
    tier_top_50_multiplier: float | None = None
    tier_top_75_multiplier: float | None = None
    teams: list[dict[str, Any]]


class SubmitActivityRequest(BaseModel):
    actor: str | None = None
    title: str = Field(min_length=1)
    payload: dict[str, Any]


class SubmitActivityResponse(BaseModel):
    source: str
    operation_path: str
    remote_id: int | str | None = None
    response: dict[str, Any]


class VamsysSourceConnectivityStatus(BaseModel):
    source: str
    configured: bool
    can_authenticate: bool
    scope: str | None = None


class VamsysConnectivityStatus(BaseModel):
    base_url: str
    token_url: str
    sources: list[VamsysSourceConnectivityStatus]
