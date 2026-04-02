"""
Connector abstraction layer.

Each DB type implements BaseConnector with:
  - test_connection()  → bool
  - list_tables()      → list[str]
  - extract_batch()    → list[dict], total_count

Adding a new connector: subclass BaseConnector, register in REGISTRY.
"""
from __future__ import annotations

import abc
import logging
from typing import Any

logger = logging.getLogger(__name__)


class ConnectorError(Exception):
    """Raised when a connector operation fails."""


class BaseConnector(abc.ABC):
    """Abstract base for all database connectors."""

    def __init__(self, config: dict):
        self.config = config

    @abc.abstractmethod
    def test_connection(self) -> bool: ...

    @abc.abstractmethod
    def list_tables(self) -> list[str]: ...

    @abc.abstractmethod
    def extract_batch(
        self, query: str, batch_size: int = 100, offset: int = 0
    ) -> tuple[list[dict], int]:
        """Return (rows, total_count)."""
        ...

    def close(self):
        pass


# ── PostgreSQL ─────────────────────────────────────────────────────────────
class PostgreSQLConnector(BaseConnector):
    def _conn(self):
        import psycopg2
        import psycopg2.extras

        cfg = self.config
        return psycopg2.connect(
            host=cfg["host"],
            port=cfg.get("port", 5432),
            dbname=cfg["database"],
            user=cfg["username"],
            password=cfg.get("password", ""),
            connect_timeout=10,
        )

    def test_connection(self) -> bool:
        try:
            conn = self._conn()
            conn.close()
            return True
        except Exception as e:
            logger.warning("PG test failed: %s", e)
            return False

    def list_tables(self) -> list[str]:
        import psycopg2.extras

        conn = self._conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT table_schema || '.' || table_name
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('pg_catalog','information_schema')
                    ORDER BY 1
                    """
                )
                return [row[0] for row in cur.fetchall()]
        finally:
            conn.close()

    def extract_batch(
        self, query: str, batch_size: int = 100, offset: int = 0
    ) -> tuple[list[dict], int]:
        import psycopg2.extras

        conn = None
        try:
            conn = self._conn()
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Count total
                count_sql = f"SELECT COUNT(*) FROM ({query}) AS _q"
                cur.execute(count_sql)
                total = cur.fetchone()["count"]
                # Paginated extract
                cur.execute(f"{query} LIMIT %s OFFSET %s", (batch_size, offset))
                rows = [dict(r) for r in cur.fetchall()]
                return rows, total
        except Exception as e:
            raise ConnectorError(f"PostgreSQL extract failed: {e}") from e
        finally:
            if conn:
                conn.close()


# ── MySQL ─────────────────────────────────────────────────────────────────
class MySQLConnector(BaseConnector):
    def _conn(self):
        import MySQLdb

        cfg = self.config
        return MySQLdb.connect(
            host=cfg["host"],
            port=cfg.get("port", 3306),
            db=cfg["database"],
            user=cfg["username"],
            passwd=cfg.get("password", ""),
            connect_timeout=10,
            charset="utf8mb4",
        )

    def test_connection(self) -> bool:
        try:
            conn = self._conn()
            conn.close()
            return True
        except Exception as e:
            logger.warning("MySQL test failed: %s", e)
            return False

    def list_tables(self) -> list[str]:
        conn = self._conn()
        try:
            cur = conn.cursor()
            cur.execute("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
            return [row[0] for row in cur.fetchall()]
        finally:
            conn.close()

    def extract_batch(
        self, query: str, batch_size: int = 100, offset: int = 0
    ) -> tuple[list[dict], int]:
        import MySQLdb.cursors

        conn = None
        try:
            conn = self._conn()
            cur = conn.cursor(MySQLdb.cursors.DictCursor)
            cur.execute(f"SELECT COUNT(*) AS cnt FROM ({query}) AS _q")
            total = cur.fetchone()["cnt"]
            cur.execute(f"{query} LIMIT %s OFFSET %s", (batch_size, offset))
            rows = list(cur.fetchall())
            return rows, total
        except Exception as e:
            raise ConnectorError(f"MySQL extract failed: {e}") from e
        finally:
            if conn:
                conn.close()


# ── MongoDB ───────────────────────────────────────────────────────────────
class MongoDBConnector(BaseConnector):
    def _client(self):
        from pymongo import MongoClient

        cfg = self.config
        uri = f"mongodb://{cfg['username']}:{cfg['password']}@{cfg['host']}:{cfg.get('port',27017)}/{cfg['database']}?authSource=admin"
        return MongoClient(uri, serverSelectionTimeoutMS=5000)

    def test_connection(self) -> bool:
        try:
            client = self._client()
            client.server_info()
            client.close()
            return True
        except Exception as e:
            logger.warning("Mongo test failed: %s", e)
            return False

    def list_tables(self) -> list[str]:
        client = self._client()
        try:
            db = client[self.config["database"]]
            return db.list_collection_names()
        finally:
            client.close()

    def extract_batch(
        self, query: str, batch_size: int = 100, offset: int = 0
    ) -> tuple[list[dict], int]:
        """query is expected to be a collection name for MongoDB."""
        import json

        client = None
        try:
            client = self._client()
            db = client[self.config["database"]]
            # query can be "collection_name" or JSON {"collection":"..","filter":{}}
            try:
                params = json.loads(query)
                collection_name = params.get("collection", query)
                filter_doc = params.get("filter", {})
            except (json.JSONDecodeError, TypeError):
                collection_name = query.strip()
                filter_doc = {}

            col = db[collection_name]
            total = col.count_documents(filter_doc)
            cursor = col.find(filter_doc, {"_id": 0}).skip(offset).limit(batch_size)
            rows = list(cursor)
            return rows, total
        except Exception as e:
            raise ConnectorError(f"MongoDB extract failed: {e}") from e
        finally:
            if client:
                client.close()


# ── ClickHouse ────────────────────────────────────────────────────────────
class ClickHouseConnector(BaseConnector):
    def _client(self):
        from clickhouse_driver import Client

        cfg = self.config
        return Client(
            host=cfg["host"],
            port=cfg.get("port", 9000),
            database=cfg["database"],
            user=cfg["username"],
            password=cfg.get("password", ""),
            connect_timeout=10,
        )

    def test_connection(self) -> bool:
        try:
            client = self._client()
            client.execute("SELECT 1")
            return True
        except Exception as e:
            logger.warning("ClickHouse test failed: %s", e)
            return False

    def list_tables(self) -> list[str]:
        client = self._client()
        rows, _ = client.execute("SHOW TABLES", with_column_types=True)
        return [row[0] for row in rows]

    def extract_batch(
        self, query: str, batch_size: int = 100, offset: int = 0
    ) -> tuple[list[dict], int]:
        try:
            client = self._client()
            count_rows, _ = client.execute(
                f"SELECT COUNT(*) FROM ({query}) AS _q", with_column_types=True
            )
            total = count_rows[0][0]
            paginated = f"{query} LIMIT {batch_size} OFFSET {offset}"
            rows_raw, col_types = client.execute(paginated, with_column_types=True)
            col_names = [c[0] for c in col_types]
            rows = [dict(zip(col_names, row)) for row in rows_raw]
            return rows, total
        except Exception as e:
            raise ConnectorError(f"ClickHouse extract failed: {e}") from e


# ── Registry ──────────────────────────────────────────────────────────────
REGISTRY: dict[str, type[BaseConnector]] = {
    "postgresql": PostgreSQLConnector,
    "mysql": MySQLConnector,
    "mongodb": MongoDBConnector,
    "clickhouse": ClickHouseConnector,
}


def get_connector(connection_model) -> BaseConnector:
    """Factory: get a live connector from a Connection model instance."""
    cls = REGISTRY.get(connection_model.db_type)
    if cls is None:
        raise ConnectorError(f"Unsupported db_type: {connection_model.db_type}")
    config = {
        "host": connection_model.host,
        "port": connection_model.port,
        "database": connection_model.database,
        "username": connection_model.username,
        "password": connection_model.password,
        **connection_model.extra_options,
    }
    return cls(config)
