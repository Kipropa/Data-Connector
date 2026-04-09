"""
DataConnect Connector Engine
============================

Architecture
------------
Every database connector is a subclass of BaseConnector implementing three
abstract methods:

    test_connection() -> bool
    list_tables()     -> list[str]
    extract_batch(query, batch_size, offset) -> (rows, total)

Connectors are registered in the REGISTRY dict:

    REGISTRY["my_db"] = MyDBConnector

That is the ONLY change needed to add a new database type. The rest of the
platform (API, batch jobs, UI dropdowns) picks it up automatically.

Built-in connectors
-------------------
  postgresql  →  PostgreSQLConnector
  mysql       →  MySQLConnector
  mongodb     →  MongoDBConnector
  clickhouse  →  ClickHouseConnector

Adding a new connector (example: SQLite)
-----------------------------------------
  1. Create  apps/connectors/contrib/sqlite_connector.py
  2. Subclass BaseConnector and implement the 3 abstract methods
  3. In that file's bottom:  from apps.connectors.engine import REGISTRY
                              REGISTRY["sqlite"] = SQLiteConnector
  4. Import the module in apps/connectors/apps.py  ready() method so it
     auto-registers on startup — or just import it here directly.

That's it. No migrations, no settings changes needed.
"""
from __future__ import annotations

import abc
import importlib
import logging
import os
import pkgutil
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# ── Exceptions ─────────────────────────────────────────────────────────────
class ConnectorError(Exception):
    """Raised when a connector operation fails."""


class ConnectorNotFound(ConnectorError):
    """Raised when no connector is registered for a db_type."""


# ── Base class ─────────────────────────────────────────────────────────────
class BaseConnector(abc.ABC):
    """
    Abstract base for all database connectors.

    Subclass this, implement the three abstract methods, then register:
        REGISTRY["your_db_type"] = YourConnector
    """

    #: Human-readable display name shown in the UI
    display_name: str = ""

    #: Default port for this database type
    default_port: int = 0

    def __init__(self, config: dict):
        self.config = config

    # ── Required interface ─────────────────────────────────────────────────

    @abc.abstractmethod
    def test_connection(self) -> bool:
        """Return True if the connection is reachable, False otherwise."""
        ...

    @abc.abstractmethod
    def list_tables(self) -> list[str]:
        """Return a list of table/collection names in the database."""
        ...

    @abc.abstractmethod
    def extract_batch(
        self, query: str, batch_size: int = 100, offset: int = 0
    ) -> tuple[list[dict], int]:
        """
        Execute query and return (rows, total_count).

        rows        — list of dicts, one per row
        total_count — total rows in the full result set (for pagination)
        """
        ...

    # ── Optional hooks ─────────────────────────────────────────────────────

    def close(self) -> None:
        """Called after extraction is complete. Override to release resources."""

    @classmethod
    def get_meta(cls) -> dict:
        """Return metadata about this connector (used by the API/UI)."""
        return {
            "display_name": cls.display_name or cls.__name__.replace("Connector", ""),
            "default_port": cls.default_port,
        }


# ── Registry ───────────────────────────────────────────────────────────────
REGISTRY: dict[str, type[BaseConnector]] = {}


def register(db_type: str, connector_cls: type[BaseConnector]) -> None:
    """
    Register a connector class for a db_type key.

    Can be used as a decorator or called directly:

        @register("sqlite")
        class SQLiteConnector(BaseConnector): ...

        # or
        register("sqlite", SQLiteConnector)
    """
    if not issubclass(connector_cls, BaseConnector):
        raise TypeError(f"{connector_cls} must subclass BaseConnector")
    REGISTRY[db_type] = connector_cls
    logger.debug("Registered connector: %s → %s", db_type, connector_cls.__name__)
    return connector_cls


def get_connector(connection_model) -> BaseConnector:
    """
    Factory: instantiate the right connector from a Connection model.

    Raises ConnectorNotFound if no connector is registered for the db_type.
    """
    cls = REGISTRY.get(connection_model.db_type)
    if cls is None:
        available = ", ".join(sorted(REGISTRY.keys()))
        raise ConnectorNotFound(
            f"No connector registered for db_type '{connection_model.db_type}'. "
            f"Available: {available}"
        )
    config = {
        "host":     connection_model.host,
        "port":     connection_model.port,
        "database": connection_model.database,
        "username": connection_model.username,
        "password": connection_model.password,
        **connection_model.extra_options,
    }
    return cls(config)


def list_registered() -> list[dict]:
    """Return metadata for all registered connectors (for the API/UI)."""
    return [
        {"db_type": key, **cls.get_meta()}
        for key, cls in sorted(REGISTRY.items())
    ]


def _auto_discover_contrib() -> None:
    """
    Auto-import every module inside apps/connectors/contrib/ so that
    contrib connectors self-register via register() at import time.
    """
    contrib_dir = Path(__file__).parent / "contrib"
    if not contrib_dir.exists():
        return
    for finder, name, _ in pkgutil.iter_modules([str(contrib_dir)]):
        module_path = f"apps.connectors.contrib.{name}"
        try:
            importlib.import_module(module_path)
            logger.debug("Auto-discovered contrib connector: %s", module_path)
        except Exception as exc:
            logger.warning("Failed to load contrib connector %s: %s", module_path, exc)


# ── PostgreSQL ─────────────────────────────────────────────────────────────
class PostgreSQLConnector(BaseConnector):
    display_name = "PostgreSQL"
    default_port = 5432

    def _conn(self):
        import psycopg2
        cfg = self.config
        return psycopg2.connect(
            host=cfg["host"], port=cfg.get("port", 5432),
            dbname=cfg["database"], user=cfg["username"],
            password=cfg.get("password", ""), connect_timeout=10,
        )

    def test_connection(self) -> bool:
        try:
            conn = self._conn(); conn.close(); return True
        except Exception as e:
            logger.warning("PG test failed: %s", e); return False

    def list_tables(self) -> list[str]:
        conn = self._conn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT table_schema || '.' || table_name
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('pg_catalog','information_schema')
                    ORDER BY 1
                """)
                return [r[0] for r in cur.fetchall()]
        finally:
            conn.close()

    def extract_batch(self, query, batch_size=100, offset=0):
        import psycopg2.extras
        conn = None
        try:
            conn = self._conn()
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                q = query.strip().rstrip(";")
                cur.execute(f"SELECT COUNT(*) FROM ({q}) AS _q")
                total = cur.fetchone()["count"]
                cur.execute(f"{q} LIMIT %s OFFSET %s", (batch_size, offset))
                return [dict(r) for r in cur.fetchall()], total
        except Exception as e:
            raise ConnectorError(f"PostgreSQL extract failed: {e}") from e
        finally:
            if conn: conn.close()


# ── MySQL ──────────────────────────────────────────────────────────────────
class MySQLConnector(BaseConnector):
    display_name = "MySQL"
    default_port = 3306

    def _conn(self):
        import MySQLdb
        cfg = self.config
        return MySQLdb.connect(
            host=cfg["host"], port=cfg.get("port", 3306),
            db=cfg["database"], user=cfg["username"],
            passwd=cfg.get("password", ""), connect_timeout=10, charset="utf8mb4",
        )

    def test_connection(self) -> bool:
        try:
            conn = self._conn(); conn.close(); return True
        except Exception as e:
            logger.warning("MySQL test failed: %s", e); return False

    def list_tables(self) -> list[str]:
        conn = self._conn()
        try:
            cur = conn.cursor()
            cur.execute("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
            return [r[0] for r in cur.fetchall()]
        finally:
            conn.close()

    def extract_batch(self, query, batch_size=100, offset=0):
        import MySQLdb.cursors
        conn = None
        try:
            conn = self._conn()
            cur = conn.cursor(MySQLdb.cursors.DictCursor)
            q = query.strip().rstrip(";")
            cur.execute(f"SELECT COUNT(*) AS cnt FROM ({q}) AS _q")
            total = cur.fetchone()["cnt"]
            cur.execute(f"{q} LIMIT %s OFFSET %s", (batch_size, offset))
            return list(cur.fetchall()), total
        except Exception as e:
            raise ConnectorError(f"MySQL extract failed: {e}") from e
        finally:
            if conn: conn.close()


# ── MongoDB ────────────────────────────────────────────────────────────────
class MongoDBConnector(BaseConnector):
    display_name = "MongoDB"
    default_port = 27017

    def _client(self):
        from pymongo import MongoClient
        cfg = self.config
        uri = (f"mongodb://{cfg['username']}:{cfg['password']}"
               f"@{cfg['host']}:{cfg.get('port', 27017)}"
               f"/{cfg['database']}?authSource=admin")
        return MongoClient(uri, serverSelectionTimeoutMS=5000)

    def test_connection(self) -> bool:
        try:
            c = self._client(); c.server_info(); c.close(); return True
        except Exception as e:
            logger.warning("Mongo test failed: %s", e); return False

    def list_tables(self) -> list[str]:
        c = self._client()
        try:
            return c[self.config["database"]].list_collection_names()
        finally:
            c.close()

    def extract_batch(self, query, batch_size=100, offset=0):
        import json
        client = None
        try:
            client = self._client()
            db = client[self.config["database"]]
            try:
                params = json.loads(query)
                col_name = params.get("collection", query)
                filter_doc = params.get("filter", {})
            except (json.JSONDecodeError, TypeError):
                col_name, filter_doc = query.strip(), {}
            col = db[col_name]
            total = col.count_documents(filter_doc)
            rows = list(col.find(filter_doc, {"_id": 0}).skip(offset).limit(batch_size))
            return rows, total
        except Exception as e:
            raise ConnectorError(f"MongoDB extract failed: {e}") from e
        finally:
            if client: client.close()


# ── ClickHouse ─────────────────────────────────────────────────────────────
class ClickHouseConnector(BaseConnector):
    display_name = "ClickHouse"
    default_port = 9000

    def _client(self, db=None):
        from clickhouse_driver import Client
        cfg = self.config
        return Client(
            host=cfg["host"], port=cfg.get("port", 9000),
            database=db or cfg["database"],
            user=cfg["username"], password=cfg.get("password", ""),
            connect_timeout=10,
        )

    def _ensure_db(self):
        c = self._client(db="default")
        c.execute(f"CREATE DATABASE IF NOT EXISTS {self.config['database']}")

    def test_connection(self) -> bool:
        try:
            self._ensure_db()
            self._client().execute("SELECT 1")
            return True
        except Exception as e:
            logger.warning("ClickHouse test failed: %s", e); return False

    def list_tables(self) -> list[str]:
        self._ensure_db()
        rows, _ = self._client().execute("SHOW TABLES", with_column_types=True)
        return [r[0] for r in rows]

    def extract_batch(self, query, batch_size=100, offset=0):
        try:
            self._ensure_db()
            client = self._client()
            q = query.strip().rstrip(";")
            count_rows, _ = client.execute(
                f"SELECT COUNT(*) FROM ({q}) AS _q", with_column_types=True
            )
            total = count_rows[0][0]
            rows_raw, col_types = client.execute(
                f"{q} LIMIT {batch_size} OFFSET {offset}", with_column_types=True
            )
            cols = [c[0] for c in col_types]
            return [dict(zip(cols, r)) for r in rows_raw], total
        except Exception as e:
            raise ConnectorError(f"ClickHouse extract failed: {e}") from e


# ── Register built-in connectors ────────────────────────────────────────────
register("postgresql", PostgreSQLConnector)
register("mysql",      MySQLConnector)
register("mongodb",    MongoDBConnector)
register("clickhouse", ClickHouseConnector)

# ── Auto-discover contrib connectors ────────────────────────────────────────
_auto_discover_contrib()
