from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Connection(models.Model):
    """Stores configuration for a database connection."""

    POSTGRES = "postgresql"
    MYSQL = "mysql"
    MONGODB = "mongodb"
    CLICKHOUSE = "clickhouse"

    DB_TYPE_CHOICES = [
        (POSTGRES, "PostgreSQL"),
        (MYSQL, "MySQL"),
        (MONGODB, "MongoDB"),
        (CLICKHOUSE, "ClickHouse"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="connections",
    )
    name = models.CharField(max_length=255)
    db_type = models.CharField(max_length=50, choices=DB_TYPE_CHOICES)
    host = models.CharField(max_length=255)
    port = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(65535)]
    )
    database = models.CharField(max_length=255)
    username = models.CharField(max_length=255)
    # In production store encrypted; here stored as plain for dev simplicity
    password = models.CharField(max_length=255, blank=True)
    # Optional: extra driver kwargs as JSON
    extra_options = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_test_ok = models.BooleanField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "connections"
        ordering = ["-created_at"]
        unique_together = [("owner", "name")]

    def __str__(self):
        return f"{self.name} ({self.db_type})"


class BatchJob(models.Model):
    """Tracks a batch extraction job against a connection."""

    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (RUNNING, "Running"),
        (DONE, "Done"),
        (FAILED, "Failed"),
    ]

    connection = models.ForeignKey(
        Connection, on_delete=models.CASCADE, related_name="batch_jobs"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="batch_jobs",
    )
    query = models.TextField()
    batch_size = models.PositiveIntegerField(default=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    rows_extracted = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "batch_jobs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"BatchJob#{self.pk} [{self.status}]"
