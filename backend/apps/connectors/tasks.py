from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def run_batch_extraction(self, job_id: int):
    """Async Celery task: run a batch extraction job."""
    from .models import BatchJob
    from .engine import get_connector, ConnectorError

    try:
        job = BatchJob.objects.select_related("connection").get(pk=job_id)
    except BatchJob.DoesNotExist:
        logger.error("BatchJob %s not found", job_id)
        return

    job.status = BatchJob.RUNNING
    job.started_at = timezone.now()
    job.save(update_fields=["status", "started_at"])

    try:
        connector = get_connector(job.connection)
        rows, total = connector.extract_batch(
            query=job.query,
            batch_size=job.batch_size,
            offset=0,
        )
        job.rows_extracted = len(rows)
        job.status = BatchJob.DONE

        # Persist extracted data records
        from apps.data.models import DataRecord
        from apps.data.services import store_batch_records

        store_batch_records(
            job=job,
            rows=rows,
            total=total,
        )

    except ConnectorError as exc:
        job.status = BatchJob.FAILED
        job.error_message = str(exc)
        logger.error("Batch job %s failed: %s", job_id, exc)
    except Exception as exc:
        job.status = BatchJob.FAILED
        job.error_message = f"Unexpected error: {exc}"
        logger.exception("Batch job %s unexpected failure", job_id)
        raise self.retry(exc=exc, countdown=30)
    finally:
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "rows_extracted", "error_message", "finished_at"])
