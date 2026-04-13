# Architecture & Design Decisions

I made these choices with a clear goal in mind: build a **reliable, maintainable, and user-friendly** data management platform that works smoothly across different database types while keeping development fast and the user experience smooth.

## 1. Why Django REST Framework (DRF) for the Backend?

DRF was the best choice because it gives us the **fastest and cleanest path** from Python data models to a production-ready, well-documented API.

Its `ModelSerializer` + `ViewSet` pattern removes a lot of repetitive code while still keeping everything explicit and clear about what data is exposed to the frontend.

### Key Benefits:
- **Excellent Documentation**: With `drf-spectacular`, I get a clean OpenAPI 3.0 schema automatically. This is essential when working with multiple database types and maintaining a strict contract with the frontend team.
- **Built-in Admin Panel**: I instantly get the powerful Django Admin interface to view and manage Connections, Files, Users, and other models — saving us tons of time during development and support.

**Alternative considered**: FastAPI  
While FastAPI is faster and more modern, it doesn’t offer a native ORM, built-in admin UI, or out-of-the-box authentication like DRF does. These features are critical for a data platform that needs strong administrative oversight.

## 2. Why the Connector Abstraction Layer?

Instead of filling the code with messy conditionals like `if db_type == "postgresql": ...`, I created a clean **abstraction layer**.

Every database driver implements a `BaseConnector` abstract class. A simple `REGISTRY` dictionary is the only place that knows about the actual implementations.

### Advantages:
- Adding support for a new database only requires one new file and one line in the registry.
- Batch extraction and test endpoints stay completely database-agnostic.
- Each connector can be tested in isolation by simply mocking its connection method.

**Alternative considered**: SQLAlchemy  
I rejected it because it doesn’t handle NoSQL (MongoDB) or OLAP databases (ClickHouse) cleanly out of the box. Our custom abstraction layer (`engine.py`) gives us equal flexibility across SQL, NoSQL, and columnar databases.

## 3. Why Celery for Batch Jobs?

Extracting data from large tables can take seconds or even minutes. I couldn’t afford to block the user’s browser while waiting.

### Why Celery?
- **Asynchronous Processing**: Keeps HTTP requests fast and prevents Gunicorn/Nginx timeouts.
- **Better User Experience**: Users can see progress updates and the UI remains responsive.
- **Resiliency**: Easy to retry failed jobs (e.g., temporary database issues) without affecting the frontend.

**Alternative considered**: Django async views with `asyncio`  
I rejected this because most of our database drivers (`psycopg2`, `MySQLdb`, `clickhouse-driver`) are synchronous. Mixing them with async code would add unnecessary complexity with very little gain.

## 4. Why Dual Storage (Database + Local File System)?

When data is extracted, I store it in **two complementary formats**:

- **Database Record (`DataRecord`)**: Keeps everything queryable, linked to users and connections. Perfect for auditing, job history, and future re-processing.
- **File Dump (JSON/CSV)**: Provides a portable, human-readable snapshot that users or external tools can download and use without needing access to the database.

Both are saved together inside a single database transaction (`submit_edited_records()`) to guarantee they always stay perfectly in sync.

## 5. Why Next.js (App Router) for the Frontend?

Next.js with the App Router strikes the perfect balance between performance and developer experience.

### Main Reasons:
- **Hybrid Rendering**: Heavy interactive pages (Data Grid, Jobs table) use client-side fetching and polling, while static parts are server-rendered for speed.
- **Nested Layouts**: The file-based routing system makes it very intuitive to separate public pages from authenticated dashboard sections.

**Alternative considered**: Vite + React SPA  
I chose Next.js because it offers better production deployment options, built-in API proxying (no more annoying CORS issues in development), and overall simpler configuration.

## 6. Why Zustand over Redux for State Management?

Our global state needs are quite simple — I mainly manage Auth Tokens, the current User object, and Light/Dark theme preference.

### Why Zustand?
- **Minimal Boilerplate**: Redux would have added roughly 400 extra lines of actions, reducers, and thunks.
- **Simplicity & Speed**: I can create a fully typed global store in about 20 lines of code.
- **Persistence**: Works beautifully with the `persist` middleware for automatic `localStorage` sync.

## 7. Why TanStack Query (React Query) over SWR?

I needed robust, production-grade data fetching for our Data Grid, Analytics, and general API calls.

### Why TanStack Query?
- **Better Mutation Handling**: `useMutation()` + automatic cache invalidation makes CRUD operations much smoother than SWR.
- **Superior TypeScript Support**: Excellent generics inference and very powerful DevTools that speed up development and debugging.

## 8. File Storage Security and Access Protocol

I follow a clear **ownership + role-based access control (RBAC)** model:

- **Superusers**: Have full visibility across the entire system to prevent orphaned jobs, files, or queries.
- **Regular Users**: Are sandboxed — they can only access connections and files they created themselves.
- **Sharing**: A dedicated `FileShare` model enables safe and controlled collaboration between users.

This design ensures both security and usability across the platform.