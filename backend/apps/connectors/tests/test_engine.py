"""
Unit tests for the connector abstraction layer.
Run with: pytest apps/connectors/tests/ -v --cov=apps/connectors
"""
from unittest.mock import MagicMock, patch, PropertyMock
import pytest

from apps.connectors.engine import (
    PostgreSQLConnector,
    MySQLConnector,
    MongoDBConnector,
    ClickHouseConnector,
    ConnectorError,
    get_connector,
    REGISTRY,
)


# ── Fixtures ───────────────────────────────────────────────────────────────
def make_config(**overrides):
    base = {
        "host": "localhost",
        "port": 5432,
        "database": "testdb",
        "username": "user",
        "password": "pass",
    }
    base.update(overrides)
    return base


def make_connection_model(db_type="postgresql", **kwargs):
    m = MagicMock()
    m.db_type = db_type
    m.host = kwargs.get("host", "localhost")
    m.port = kwargs.get("port", 5432)
    m.database = kwargs.get("database", "testdb")
    m.username = kwargs.get("username", "user")
    m.password = kwargs.get("password", "pass")
    m.extra_options = kwargs.get("extra_options", {})
    return m


# ── Registry tests ─────────────────────────────────────────────────────────
class TestRegistry:
    def test_all_db_types_registered(self):
        for db_type in ("postgresql", "mysql", "mongodb", "clickhouse"):
            assert db_type in REGISTRY

    def test_get_connector_returns_correct_class(self):
        for db_type, cls in REGISTRY.items():
            model = make_connection_model(db_type=db_type)
            connector = get_connector(model)
            assert isinstance(connector, cls)

    def test_get_connector_unknown_type_raises(self):
        model = make_connection_model(db_type="oracle")
        with pytest.raises(ConnectorError, match="Unsupported db_type"):
            get_connector(model)


# ── PostgreSQL ─────────────────────────────────────────────────────────────
class TestPostgreSQLConnector:
    @patch("apps.connectors.engine.psycopg2", create=True)
    def test_test_connection_success(self, mock_pg):
        import sys
        sys.modules.setdefault("psycopg2", mock_pg)
        mock_pg.connect.return_value = MagicMock()
        c = PostgreSQLConnector(make_config())
        with patch.object(c, "_conn", return_value=MagicMock()) as mock_conn:
            assert c.test_connection() is True

    def test_test_connection_failure_returns_false(self):
        c = PostgreSQLConnector(make_config(host="unreachable_host_xyz", port=9999))
        result = c.test_connection()
        assert result is False

    @patch("apps.connectors.engine.psycopg2", create=True)
    def test_extract_batch_returns_rows_and_total(self, _):
        c = PostgreSQLConnector(make_config())
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.__enter__ = lambda s: mock_cur
        mock_cur.__exit__ = MagicMock(return_value=False)
        mock_cur.fetchone.return_value = {"count": 42}
        mock_cur.fetchall.return_value = [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]
        mock_conn.cursor.return_value = mock_cur
        with patch.object(c, "_conn", return_value=mock_conn):
            rows, total = c.extract_batch("SELECT * FROM users", batch_size=10, offset=0)
        assert total == 42
        assert len(rows) == 2
        assert rows[0]["name"] == "Alice"

    def test_extract_batch_raises_connector_error_on_failure(self):
        c = PostgreSQLConnector(make_config())
        with patch.object(c, "_conn", side_effect=Exception("connection refused")):
            with pytest.raises(ConnectorError):
                c.extract_batch("SELECT 1")


# ── MySQL ──────────────────────────────────────────────────────────────────
class TestMySQLConnector:
    def test_test_connection_failure_returns_false(self):
        c = MySQLConnector(make_config(port=3306))
        result = c.test_connection()
        assert result is False

    def test_extract_batch_raises_connector_error(self):
        c = MySQLConnector(make_config())
        with patch.object(c, "_conn", side_effect=Exception("access denied")):
            with pytest.raises(ConnectorError):
                c.extract_batch("SELECT * FROM products")


# ── MongoDB ────────────────────────────────────────────────────────────────
class TestMongoDBConnector:
    def test_test_connection_failure_returns_false(self):
        c = MongoDBConnector(make_config(port=27017))
        result = c.test_connection()
        assert result is False

    def test_extract_batch_parses_json_query(self):
        c = MongoDBConnector(make_config())
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_col = MagicMock()
        mock_col.count_documents.return_value = 5
        mock_col.find.return_value.skip.return_value.limit.return_value = [
            {"event": "click"}, {"event": "view"}
        ]
        mock_db.__getitem__ = MagicMock(return_value=mock_col)
        mock_client.__getitem__ = MagicMock(return_value=mock_db)

        with patch.object(c, "_client", return_value=mock_client):
            rows, total = c.extract_batch(
                '{"collection": "events", "filter": {}}', batch_size=10
            )
        assert total == 5
        assert len(rows) == 2

    def test_extract_batch_plain_collection_name(self):
        c = MongoDBConnector(make_config())
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_col = MagicMock()
        mock_col.count_documents.return_value = 3
        mock_col.find.return_value.skip.return_value.limit.return_value = [{"x": 1}]
        mock_db.__getitem__ = MagicMock(return_value=mock_col)
        mock_client.__getitem__ = MagicMock(return_value=mock_db)

        with patch.object(c, "_client", return_value=mock_client):
            rows, total = c.extract_batch("events", batch_size=5)
        assert total == 3


# ── ClickHouse ─────────────────────────────────────────────────────────────
class TestClickHouseConnector:
    def test_test_connection_failure_returns_false(self):
        c = ClickHouseConnector(make_config(port=9000))
        result = c.test_connection()
        assert result is False

    def test_extract_batch_maps_columns(self):
        c = ClickHouseConnector(make_config())
        mock_client = MagicMock()
        mock_client.execute.side_effect = [
            ([[10]], [("count()", "UInt64")]),   # count query
            ([[1, "api_latency", 42.5]], [("id", "UInt64"), ("name", "String"), ("val", "Float64")]),
        ]
        with patch.object(c, "_client", return_value=mock_client):
            rows, total = c.extract_batch("SELECT * FROM metrics", batch_size=5)
        assert total == 10
        assert rows[0] == {"id": 1, "name": "api_latency", "val": 42.5}
