# DataConnect Platform

A full-stack multi-database connector platform for batch data extraction, inline editing, and secure dual-storage — built with **Next.js 14**, **Django REST Framework**, and containerised with **Docker Compose**.

---

## Quick Start

```bash
git clone <your-repo-url>
cd dataconnect

# Start everything (first run pulls/builds images — ~3 min)
docker compose up --build

# In another terminal: create the first admin user
docker compose exec backend python manage.py createsuperuser \
  --email admin@dataconnect.io --username admin

# Open the app
open http://localhost:3000
```

Default login seeded by createsuperuser. The four sample databases (PostgreSQL, MySQL, MongoDB, ClickHouse) start automatically with demo data pre-loaded.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js 14 · React 18 · Tailwind CSS)          │
│  Zustand (auth, theme) · TanStack Query · Axios           │
└────────────────────┬────────────────────────────────────┘
                     │ REST / JWT
┌────────────────────▼────────────────────────────────────┐
│  Django REST Framework (Python 3.12)                      │
│  Apps: users · connectors · data · files                  │
│  JWT auth (simplejwt) · RBAC · OpenAPI (drf-spectacular)  │
└───┬──────────────┬──────────────────┬───────────────────┘
    │              │                  │
  Celery        App DB            Media/Files
  (Redis)      (Postgres)        (Docker volume)
    │
┌───▼──────────────────────────────────────────────────────┐
│  Connector Engine (abstraction layer)                      │
│  PostgreSQL · MySQL · MongoDB · ClickHouse                 │
└──────────────────────────────────────────────────────────┘
```

### Service ports

| Service     | Port  | Purpose                          |
|-------------|-------|----------------------------------|
| frontend    | 3000  | Next.js dev server               |
| backend     | 8000  | Django REST API + Swagger UI     |
| postgres    | 5432  | App DB + sample PG connector     |
| mysql       | 3306  | Sample MySQL connector           |
| mongo       | 27017 | Sample MongoDB connector         |
| clickhouse  | 9000  | Sample ClickHouse connector      |
| redis       | 6379  | Celery broker + result backend   |

---

## Project Structure

```
dataconnect/
├── docker-compose.yml
├── docker/                  # DB init SQL/JS scripts
├── backend/
│   ├── core/                # Django settings, URLs, Celery
│   ├── apps/
│   │   ├── users/           # Custom User model, JWT auth
│   │   ├── connectors/      # Connection model, engine, batch jobs, tasks
│   │   ├── data/            # DataRecord model, dual-storage service
│   │   └── files/           # StoredFile, FileShare, RBAC
│   └── requirements.txt
└── frontend/
    ├── app/                 # Next.js App Router pages
    │   ├── login/
    │   └── dashboard/
    │       ├── connections/
    │       ├── batch-jobs/
    │       ├── data-grid/
    │       ├── files/
    │       └── users/
    ├── components/
    │   ├── layout/Sidebar.tsx
    │   └── ui/index.tsx     # Design system components
    ├── lib/api.ts           # Axios client + all API helpers
    └── store/               # Zustand auth + theme stores
```

---

## Core Features

### 1. Multi-Database Connector Engine (`backend/apps/connectors/engine.py`)

The connector layer uses an abstract base class (`BaseConnector`) with three required methods:
- `test_connection()` → bool
- `list_tables()` → list[str]
- `extract_batch(query, batch_size, offset)` → (rows, total)

**Adding a new connector** is as simple as:
```python
class OracleConnector(BaseConnector):
    def test_connection(self): ...
    def list_tables(self): ...
    def extract_batch(self, query, batch_size=100, offset=0): ...

# Register it:
REGISTRY["oracle"] = OracleConnector
```

### 2. Batch Data Extraction

- Batch size is configurable per job (default 100, any positive integer)
- Extraction runs asynchronously via Celery tasks (non-blocking API)
- Jobs are polled every 5s in the frontend until complete
- Supports SQL for PG/MySQL/ClickHouse, and collection name or JSON filter for MongoDB

### 3. Editable Data Grid

- Double-click any cell to edit inline
- Enter commits, Escape cancels
- Edits are stored as `edited_data` on `DataRecord`, keeping original data intact
- `effective_data` property returns edited version when available
- Multi-select rows with checkboxes

### 4. Dual Storage

When records are submitted (`POST /api/records/submit/`):
1. **Database**: `DataRecord.submitted = True`, `submitted_by` and `submitted_at` are set
2. **File**: A JSON or CSV file is written to `MEDIA_ROOT/exports/<user_id>/export_<job_id>_<timestamp>.<ext>`
   - Every file includes source metadata (connection name, db type, query, timestamp, exporter email)
3. A `StoredFile` database entry links the file back to the job and owner

### 5. Role-Based Access Control

| Resource      | Admin                | User (regular)              |
|---------------|----------------------|-----------------------------|
| Connections   | All                  | Own only                    |
| Batch Jobs    | All                  | Own only                    |
| Data Records  | All                  | Own jobs only               |
| Files         | All                  | Own + explicitly shared     |
| Users list    | Yes                  | No                          |

File sharing is implemented via `FileShare` model — admins or file owners can share to any user.

---

## API Reference

Swagger UI: `http://localhost:8000/api/docs/`

Key endpoints:

```
POST   /api/auth/login/              # JWT login
POST   /api/auth/register/           # Create account
GET    /api/users/me/                # Current user

GET    /api/connections/             # List connections
POST   /api/connections/             # Create connection
POST   /api/connections/{id}/test/   # Test connectivity
GET    /api/connections/{id}/tables/ # List tables/collections
POST   /api/connections/{id}/preview/ # Preview 20 rows

GET    /api/batch-jobs/              # List jobs
POST   /api/batch-jobs/              # Create & queue job

GET    /api/records/?job=<id>        # Records for a job
PATCH  /api/records/{id}/            # Edit a record
POST   /api/records/submit/          # Submit + dual-store

GET    /api/files/                   # Accessible files
GET    /api/files/{id}/download/     # Download file
POST   /api/file-shares/             # Share a file
```

---

## Running Tests

```bash
# All tests
docker compose exec backend pytest -v --cov=apps --cov-report=term-missing

# Specific suite
docker compose exec backend pytest apps/connectors/tests/ -v
docker compose exec backend pytest apps/data/tests/ -v
docker compose exec backend pytest apps/files/tests/ -v
```

---

## Design Decisions

### Why Django REST Framework?

DRF offers the fastest path from a Python data model to a robust, documented API. Its `ModelSerializer` + `ViewSet` pattern eliminates boilerplate while staying explicit about what's exposed. `drf-spectacular` gives us OpenAPI 3.0 for free, which is critical when multiple DB drivers are involved and the frontend team needs a contract.

**Alternatives considered:** FastAPI is faster and more modern but lacks the admin UI, ORM, and batteries-included auth that DRF provides — important for a data-management tool that might need manual admin interventions.

### Why the Connector Abstraction Layer?

Rather than littering the codebase with `if db_type == "postgresql": ...` branches, every database implements `BaseConnector`. The `REGISTRY` dict is the only place that knows about concrete types. This means:
- Adding a new database = one new file + one REGISTRY entry
- Testing a connector = mock its `_conn()` method, no framework required
- The batch extraction and test endpoints are database-agnostic

**Alternative considered:** SQLAlchemy as a unified connector. Rejected because it doesn't support MongoDB or ClickHouse natively, and the abstraction layer approach is simpler and more transparent.

### Why Celery for Batch Jobs?

Batch extraction over large tables can take seconds to minutes. Running it inside a Django view would block the request thread, hit Gunicorn timeouts, and give the user no feedback. Celery decouples extraction from the HTTP layer, lets us report progress, and lets us retry on transient failures.

**Alternative considered:** Django async views with asyncio. Rejected because the DB drivers (psycopg2, MySQLdb, clickhouse-driver) are all synchronous, and mixing sync drivers with async Django creates complexity without benefit.

### Why Dual Storage (DB + File)?

The DB record (`DataRecord`) provides queryable, relational storage — useful for audits, re-processing, and incremental updates. The file (JSON/CSV) provides a portable, human-readable snapshot at a point in time that external tools can consume without database access. Both are created in a single transaction in `submit_edited_records()` so they're always consistent.

### Why Next.js App Router?

The App Router's server components coexist with client-side interactivity. The data-heavy pages (grid, jobs table) benefit from client-side fetching (TanStack Query with polling), while simpler pages could be server-rendered. The layout nesting (`dashboard/layout.tsx`) cleanly separates auth-guarded content from public routes.

**Alternatives considered:** Vite + React SPA. Rejected because Next.js gives us file-based routing, built-in rewrites for the API proxy, and better production deployment options — for no extra complexity in development.

### Why Zustand over Redux?

The application state is simple: auth token + user object + theme preference. Redux adds ~400 lines of boilerplate for this. Zustand gives us typed stores in 20 lines with the `persist` middleware handling localStorage serialisation.

### Why TanStack Query over SWR?

TanStack Query's `useMutation` with `onSuccess` cache invalidation makes the CRUD flows clean — create a connection, invalidate the list query, UI updates. SWR requires manual cache writes for mutations. Query also has better TypeScript generics and devtools.

### Password Storage

In the `Connection` model, passwords are stored as plain text for development simplicity, with a code comment flagging this. In production, these should be encrypted at rest using a library like `django-fernet-fields` or stored in a secrets manager (AWS Secrets Manager, HashiCorp Vault). The architecture supports this swap without interface changes.

---

## Environment Variables

### Backend

| Variable      | Default                                         | Description          |
|---------------|-------------------------------------------------|----------------------|
| SECRET_KEY    | dev-only-secret-key                             | Django secret key    |
| DEBUG         | 1                                               | Debug mode           |
| DB_HOST       | localhost                                       | App database host    |
| DB_NAME       | dataconnect                                     | App database name    |
| DB_USER       | dc_user                                         | App database user    |
| DB_PASSWORD   | dc_pass                                         | App database pass    |
| REDIS_URL     | redis://localhost:6379/0                        | Celery broker        |
| MEDIA_ROOT    | ./media                                         | File storage path    |

### Frontend

| Variable              | Default                        | Description     |
|-----------------------|--------------------------------|-----------------|
| NEXT_PUBLIC_API_URL   | http://localhost:8000/api      | Django API base |

---
