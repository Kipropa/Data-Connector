# Design Decisions

## 1. Why Django REST Framework?
DRF offers the fastest path from a Python data model to a robust, documented API. Its `ModelSerializer` + `ViewSet` pattern eliminates boilerplate while staying explicit about what's exposed. `drf-spectacular` gives us OpenAPI 3.0 for free, which is critical when multiple DB drivers are involved and the frontend team needs a contract.
**Alternatives considered:** FastAPI is faster and more modern but lacks the admin UI, ORM, and batteries-included auth that DRF provides — important for a data-management tool that might need manual admin interventions.

## 2. Why the Connector Abstraction Layer?
Rather than littering the codebase with `if db_type == "postgresql": ...` branches, every database implements `BaseConnector`. The `REGISTRY` dict is the only place that knows about concrete types. This means:
- Adding a new database = one new file + one REGISTRY entry
- Testing a connector = mock its `_conn()` method, no framework required
- The batch extraction and test endpoints are database-agnostic
**Alternative considered:** SQLAlchemy as a unified connector. Rejected because it doesn't support MongoDB or ClickHouse natively, and the abstraction layer approach is simpler and more transparent.

## 3. Why Celery for Batch Jobs?
Batch extraction over large tables can take seconds to minutes. Running it inside a Django view would block the request thread, hit Gunicorn timeouts, and give the user no feedback. Celery decouples extraction from the HTTP layer, lets us report progress, and lets us retry on transient failures.
**Alternative considered:** Django async views with asyncio. Rejected because the DB drivers (psycopg2, MySQLdb, clickhouse-driver) are all synchronous, and mixing sync drivers with async Django creates complexity without benefit.

## 4. Why Dual Storage (DB + File)?
The DB record (`DataRecord`) provides queryable, relational storage — useful for audits, re-processing, and incremental updates. The file (JSON/CSV) provides a portable, human-readable snapshot at a point in time that external tools can consume without database access. Both are created in a single transaction in `submit_edited_records()` so they're always consistent.

## 5. Why Next.js App Router?
The App Router's server components coexist with client-side interactivity. The data-heavy pages (grid, jobs table) benefit from client-side fetching (TanStack Query with polling), while simpler pages could be server-rendered. The layout nesting (`dashboard/layout.tsx`) cleanly separates auth-guarded content from public routes.
**Alternatives considered:** Vite + React SPA. Rejected because Next.js gives us file-based routing, built-in rewrites for the API proxy, and better production deployment options — for no extra complexity in development.

## 6. Why Zustand over Redux?
The application state is simple: auth token + user object + theme preference. Redux adds ~400 lines of boilerplate for this. Zustand gives us typed stores in 20 lines with the `persist` middleware handling localStorage serialization.

## 7. Why TanStack Query over SWR?
TanStack Query's `useMutation` with `onSuccess` cache invalidation makes the CRUD flows clean. SWR requires manual cache writes for mutations. Query also has better TypeScript generics and devtools.

## 8. File Storage Security and Access Protocol
Admins are given sweeping access across files and connections, whereas users maintain ownership-based privileges (e.g. view only files they created or that have been directly shared with them). This ensures data exports remain segmented per the requirements. A bespoke `FileShare` model enforces sharing workflows.
