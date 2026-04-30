# VA Assistant Backend

FastAPI backend scaffold for the VA assistant project.

## What It Includes

- vAMSYS OAuth 2.0 client credentials integration foundation.
- Multi-source vAMSYS credentials for `vnws` and `rag`.
- Real operations create paths for:
  - `/activities/events`
  - `/activities/focus-airports`
  - `/activities/tours`
  - `/activities/rosters`
  - `/activities/community-goals`
  - `/activities/community-challenges`
- File-backed draft storage instead of a database.
- File-backed audit log instead of a database.
- File-backed airport catalogs for `rag` and `vnws`.
- Airport catalog sync from the real vAMSYS `/airports` endpoint.
- Aircraft catalog sync from the real vAMSYS `/fleet` and `/fleet/{fleet_id}/aircraft` endpoints.
- Aircraft photo lookup by registration through vAMSYS catalog images, Planespotters, JetPhotos via JetAPI, and Wikimedia Commons fallback.

## Environment

Copy `.env.example` to `.env` and fill in your vAMSYS credentials.
The backend now auto-loads `backend/.env` on startup, so `uvicorn` and local scripts use the same credentials without extra shell exports.

Required values:

- `VAMSYS_VNWS_CLIENT_ID`
- `VAMSYS_VNWS_CLIENT_SECRET`
- `VAMSYS_RAG_CLIENT_ID`
- `VAMSYS_RAG_CLIENT_SECRET`

Optional but supported:

- `VAMSYS_VNWS_SCOPE`
- `VAMSYS_RAG_SCOPE`
- `VAMSYS_CLIENT_ID` and `VAMSYS_CLIENT_SECRET` as legacy fallback for `vnws`

For vAMSYS 5.4 Operations OAuth clients, leave `VAMSYS_*_SCOPE` blank when the client scopes are unrestricted in the vAMSYS UI. If you tick specific Operations API scopes, set the matching space-separated scope string here, for example `ops:read ops:activities:write`.

## vAMSYS OAuth Flow

According to the official Operations API docs, authentication is machine-to-machine OAuth 2.0 Client Credentials.

- Token URL: `https://vamsys.io/oauth/token`
- API base URL: `https://vamsys.io/api/v3/operations`
- Content type for token exchange: `application/x-www-form-urlencoded`
- Required token form fields:
  - `grant_type=client_credentials`
  - `client_id=<numeric client id>`
  - `client_secret=<secret>`
  - `scope=<space separated scopes>` only when the OAuth client is restricted to explicit scopes
- Token lifetime: `604800` seconds, or 7 days
- Rate limit: 100 requests per minute per airline, shared across all OAuth clients for that airline
- Response headers: inspect `X-RateLimit-*` headers when you need live limit visibility

The backend already follows this pattern in `app/services/vamsys_client.py` and caches bearer tokens per configured source.

## Request Conventions

The OpenAPI document shows a few patterns that repeat across the Operations API:

- Send `Authorization: Bearer <token>` on every API request
- Send `Accept: application/json`
- Cursor pagination uses `page[size]` and `page[cursor]`
- Filtering commonly uses `filter[...]` query parameters such as `filter[icao]`, `filter[base]`, or `filter[registration]`
- Sorting uses `sort=<field>` and descending sort uses `-field`

The existing airport and aircraft sync services already use cursor pagination against `/airports`, `/fleet`, and `/fleet/{fleet_id}/aircraft`.

## Raw API Examples

Get a bearer token:

```bash
curl -X POST "https://vamsys.io/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=${VAMSYS_VNWS_CLIENT_ID}" \
  -d "client_secret=${VAMSYS_VNWS_CLIENT_SECRET}"
```

Read the first page of airports:

```bash
curl "https://vamsys.io/api/v3/operations/airports?page[size]=15&sort=icao" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Accept: application/json"
```

Minimal Python example with `httpx`:

```python
import httpx

token_response = httpx.post(
    "https://vamsys.io/oauth/token",
    data={
        "grant_type": "client_credentials",
        "client_id": "YOUR_CLIENT_ID",
        "client_secret": "YOUR_CLIENT_SECRET",
    },
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    timeout=30.0,
)
token_response.raise_for_status()
access_token = token_response.json()["access_token"]

api_response = httpx.get(
    "https://vamsys.io/api/v3/operations/airports",
    params={"page[size]": 15, "sort": "icao"},
    headers={
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    },
    timeout=30.0,
)
api_response.raise_for_status()
print(api_response.json())
```

## Install

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Linux/macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --app-dir backend
```

If you run the command from inside `backend/`, use:

```bash
uvicorn app.main:app --reload
```

## API Surface

- `GET /api/health`
- `GET /api/airports`
- `POST /api/airports/import`
- `POST /api/airports/sync/{source}`
- `GET /api/aircraft`
- `POST /api/aircraft/sync/{source}`
- `GET /api/aircraft/photos/{registration}`
- `GET /api/drafts`
- `POST /api/drafts`
- `GET /api/logs`
- `GET /api/vamsys/status`
- `POST /api/vamsys/activities/{activity_type}`

Supported `activity_type` values:

- `events`
- `focus-airports`
- `tours`
- `rosters`
- `community-goals`
- `community-challenges`

Examples:

- `POST /api/airports/sync/vnws?limit=500`
- `POST /api/airports/sync/rag?limit=500&base_only=true`
- `POST /api/aircraft/sync/vnws?limit=5000`
- `GET /api/aircraft?sources=rag&query=B738`
- `GET /api/aircraft/photos/PH-BQA?source=vnws&limit=6`
- `GET /api/vamsys/status?source=vnws`
- `POST /api/vamsys/activities/rosters?source=rag`

## Notes

- No database is used here by design.
- Drafts are stored as JSON files in `backend/data/drafts/`.
- Audit logs are stored as JSONL in `backend/data/logs/audit.jsonl`.
- Airport catalogs are stored as JSON files in `backend/data/airports/`.
- Airport sync uses the authenticated vAMSYS Operations `/airports` endpoint and stores the normalized result locally.
- Aircraft catalogs are stored as JSON files in `backend/data/aircraft/`.
