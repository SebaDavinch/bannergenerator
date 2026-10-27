from fastapi import APIRouter

from app.api.routes import aircraft, airports, creations, drafts, health, logs, projects, vamsys


api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(aircraft.router, prefix="/aircraft", tags=["Aircraft Catalog"])
api_router.include_router(airports.router, prefix="/airports", tags=["Airport Catalog"])
api_router.include_router(creations.router, prefix="/creations", tags=["Creations"])
api_router.include_router(drafts.router, prefix="/drafts", tags=["Drafts"])
api_router.include_router(logs.router, prefix="/logs", tags=["Audit Logs"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(vamsys.router, prefix="/vamsys", tags=["vAMSYS"])
