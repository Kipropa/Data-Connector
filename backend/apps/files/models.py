from django.db import models
from django.conf import settings


class StoredFile(models.Model):
    """A file produced by the dual-storage service."""

    JSON = "json"
    CSV = "csv"
    FORMAT_CHOICES = [(JSON, "JSON"), (CSV, "CSV")]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_files",
    )
    job = models.ForeignKey(
        "connectors.BatchJob",
        on_delete=models.SET_NULL,
        null=True,
        related_name="stored_files",
    )
    filename = models.CharField(max_length=512)
    file_path = models.CharField(max_length=1024)  # relative to MEDIA_ROOT
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default=JSON)
    row_count = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stored_files"
        ordering = ["-created_at"]

    def __str__(self):
        return self.filename


class FileShare(models.Model):
    """Grants a user read access to a file they don't own."""

    file = models.ForeignKey(
        StoredFile, on_delete=models.CASCADE, related_name="shares"
    )
    shared_with = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shared_files",
    )
    shared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="files_shared_by_me",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "file_shares"
        unique_together = [("file", "shared_with")]
