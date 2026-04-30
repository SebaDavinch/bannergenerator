# VA Assistant

Frontend + Python backend foundation for a VA assistant for Nordwind Virtual and Russian Airways Group. The current workspace includes a React banner/event editor and a FastAPI backend scaffold prepared for vAMSYS Operations API integration.

## What It Includes

- Frontend event and banner editor with live preview and PNG export.
- Supports switching between Focus Airport, Tour, Roster, Curated Roster, Community Challenge, and Community Goal event modes.
- Adds a Community Challenge mode with editable team cards, goal types, and target amounts.
- Adds a Community Goal mode with one shared community-wide target and metric selection.
- Edits the main banner fields for each mode, including per-event bonus points and an optional Registration Required banner badge.
- Adds route-driven Tour, Roster, and Curated Roster modes with editable legs, editable descriptions, and a vector world route map positioned by airport coordinates.
- Supports switching between built-in Nordwind Virtual and Russian Airways Group brand presets.
- Renders the airport block as a flag + airport name + ICAO chip using a two-letter country code.
- Supports switching the interface between Russian and English.
- Offers 3-4 automatic city-photo suggestions from Wikimedia Commons for Focus Airport banners, with local upload as a manual override.
- Supports randomizing and regenerating Focus Airport system picks, plus saving selected Wikimedia backgrounds to Favorites for later reuse.
- Uses the selected built-in project logo in preview and export.
- Shows a live 16:9 preview in Nordwind-style colors.
- Exports the banner as a PNG in 1920x1080.
- Python FastAPI backend scaffold in `backend/`.
- File-backed audit logs and event drafts with no database dependency.
- File-backed airport catalogs for `rag` and `vnws`.
- vAMSYS OAuth client credentials foundation for both `vnws` and `rag`, plus activity create endpoints for events, focus airports, tours, rosters, community goals, and community challenges.
- Airport catalog sync from the real vAMSYS `/airports` endpoint into the local file-backed source catalogs.
- Aircraft catalog sync from the real vAMSYS `/fleet` and `/fleet/{fleet_id}/aircraft` endpoints into source-specific local catalogs.

## Frontend Scripts

- `npm run dev` starts the local Vite development server.
- `npm run build` builds the production bundle.
- `npm run preview` previews the production build locally.
- `npm run lint` runs ESLint.

## Backend

- Backend source: `backend/`
- Backend setup instructions: `backend/README.md`
- Main API entrypoint: `backend/app/main.py`

Core backend endpoints:

- `GET /api/health`
- `GET /api/airports`
- `POST /api/airports/import`
- `POST /api/airports/sync/{source}`
- `GET /api/aircraft`
- `POST /api/aircraft/sync/{source}`
- `GET /api/drafts`
- `POST /api/drafts`
- `GET /api/logs`
- `GET /api/vamsys/status`
- `POST /api/vamsys/activities/{activity_type}`

## Hosting

- Static hosting: after `npm run build`, deploy the contents of `dist/` to any static host.
- Local production preview: run `npm run preview -- --host 0.0.0.0 --port 4173`.
- Manual Linux + Nginx deploy for `banner.vnws.ru`: see `deploy/linux/README.md`.
- Frontend Docker hosting:

```bash
docker build -t vac-banner-generator .
docker run --rm -p 8080:80 vac-banner-generator
```

## Notes

- The app is intentionally separate from FlightManagerBot.
- The backend currently uses file storage instead of a database by design.
- For real production use, upload only licensed or owned city photography.
- The preview layout is optimized around these VA event formats for both projects.
