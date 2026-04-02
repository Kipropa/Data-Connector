"""
Dual-storage service: writes data to DB *and* file (JSON/CSV).
Called after a batch extraction and after user submits edits.
"""
from __future__ import annotations

import csv
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)


def store_batch_records(job, rows: list[dict], total: int):
    """Persist extracted rows as DataRecord objects."""
    from .models import DataRecord
    from django.core.serializers.json import DjangoJSONEncoder

    # Ensure all extracted objects (datetime, UUID, etc) are basic JSON types
    safe_rows = json.loads(json.dumps(rows, cls=DjangoJSONEncoder))

    objs = [
        DataRecord(
            batch_job=job,
            row_index=i,
            data=row,
        )
        for i, row in enumerate(safe_rows)
    ]
    DataRecord.objects.bulk_create(objs, ignore_conflicts=True)
    logger.info("Stored %d records for job %s", len(objs), job.pk)


def submit_edited_records(records, user, output_format: str = "json") -> "StoredFile":
    """
    Process edited records:
    1. Update DataRecord.edited_data / submitted flags in DB
    2. Write a snapshot file (JSON or CSV) to media
    3. Create a StoredFile entry
    Returns the StoredFile instance.
    """
    from .models import DataRecord
    from apps.files.models import StoredFile
    from django.utils import timezone as dj_tz

    now = dj_tz.now()
    rows_out = []

    for rec in records:
        effective = rec.edited_data if rec.is_edited else rec.data
        rows_out.append(effective)
        rec.submitted = True
        rec.submitted_by = user
        rec.submitted_at = now

    DataRecord.objects.bulk_update(
        records, ["submitted", "submitted_by", "submitted_at"]
    )

    # Build file
    job = records[0].batch_job
    ts = now.strftime("%Y%m%d_%H%M%S")
    filename = f"export_{job.pk}_{ts}.{output_format}"
    rel_path = f"exports/{user.pk}/{filename}"
    abs_path = Path(settings.MEDIA_ROOT) / rel_path
    abs_path.parent.mkdir(parents=True, exist_ok=True)

    metadata = {
        "source_connection": job.connection.name,
        "db_type": job.connection.db_type,
        "job_id": job.pk,
        "query": job.query,
        "exported_by": user.email,
        "exported_at": now.isoformat(),
        "row_count": len(rows_out),
    }

    if output_format == "csv":
        _write_csv(abs_path, rows_out, metadata)
    else:
        _write_json(abs_path, rows_out, metadata)

    stored = StoredFile.objects.create(
        owner=user,
        job=job,
        filename=filename,
        file_path=rel_path,
        format=output_format,
        row_count=len(rows_out),
        metadata=metadata,
    )
    return stored


def _write_json(path: Path, rows: list[dict], metadata: dict):
    payload = {"metadata": metadata, "data": rows}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, default=str)


def _write_csv(path: Path, rows: list[dict], metadata: dict):
    if not rows:
        with open(path, "w") as f:
            f.write("")
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        # Write metadata as comments
        f.write(f"# source: {metadata['source_connection']}\n")
        f.write(f"# exported_at: {metadata['exported_at']}\n")
        f.write(f"# rows: {metadata['row_count']}\n")
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
