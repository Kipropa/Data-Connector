"""
Tests for the dual-storage service.
"""
import json
import csv
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from apps.data.services import _write_json, _write_csv, store_batch_records


SAMPLE_ROWS = [
    {"id": 1, "email": "a@test.com", "name": "Alice"},
    {"id": 2, "email": "b@test.com", "name": "Bob"},
]

SAMPLE_META = {
    "source_connection": "Analytics DB",
    "db_type": "postgresql",
    "job_id": 1,
    "query": "SELECT * FROM users",
    "exported_by": "admin@test.com",
    "exported_at": "2024-01-14T10:00:00+00:00",
    "row_count": 2,
}


class TestWriteJSON:
    def test_creates_valid_json(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
            path = Path(f.name)
        _write_json(path, SAMPLE_ROWS, SAMPLE_META)
        with open(path) as f:
            payload = json.load(f)
        assert "metadata" in payload
        assert "data" in payload
        assert payload["data"][0]["name"] == "Alice"
        assert payload["metadata"]["source_connection"] == "Analytics DB"

    def test_metadata_fields_present(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
            path = Path(f.name)
        _write_json(path, SAMPLE_ROWS, SAMPLE_META)
        with open(path) as f:
            payload = json.load(f)
        for key in ("source_connection", "db_type", "exported_at", "row_count"):
            assert key in payload["metadata"]

    def test_empty_rows_writes_valid_json(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
            path = Path(f.name)
        _write_json(path, [], SAMPLE_META)
        with open(path) as f:
            payload = json.load(f)
        assert payload["data"] == []


class TestWriteCSV:
    def test_creates_valid_csv(self):
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as f:
            path = Path(f.name)
        _write_csv(path, SAMPLE_ROWS, SAMPLE_META)
        with open(path) as f:
            content = f.read()
        assert "id" in content
        assert "Alice" in content
        assert "Bob" in content

    def test_csv_has_metadata_comments(self):
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as f:
            path = Path(f.name)
        _write_csv(path, SAMPLE_ROWS, SAMPLE_META)
        with open(path) as f:
            lines = f.readlines()
        comment_lines = [l for l in lines if l.startswith("#")]
        assert len(comment_lines) == 3  # source, exported_at, rows

    def test_csv_empty_rows(self):
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as f:
            path = Path(f.name)
        _write_csv(path, [], SAMPLE_META)
        assert path.exists()

    def test_csv_row_count(self):
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as f:
            path = Path(f.name)
        _write_csv(path, SAMPLE_ROWS, SAMPLE_META)
        with open(path) as f:
            reader = csv.DictReader(
                [l for l in f if not l.startswith("#")]
            )
            rows = list(reader)
        assert len(rows) == 2


class TestStoreBatchRecords:
    @pytest.mark.django_db
    def test_store_creates_records(self, db):
        from apps.users.models import User
        from apps.connectors.models import Connection, BatchJob

        user = User.objects.create_user(email="t@t.com", name="T", password="pass")
        conn = Connection.objects.create(
            owner=user, name="Test PG", db_type="postgresql",
            host="localhost", port=5432, database="db", username="u",
        )
        job = BatchJob.objects.create(
            connection=conn, created_by=user,
            query="SELECT * FROM users", batch_size=10,
        )
        store_batch_records(job, SAMPLE_ROWS, total=2)
        from apps.data.models import DataRecord
        assert DataRecord.objects.filter(batch_job=job).count() == 2
