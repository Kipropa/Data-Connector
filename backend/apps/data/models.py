from django.db import models
from django.conf import settings


class DataRecord(models.Model):
    """A single extracted + (optionally edited) data row."""

    batch_job = models.ForeignKey(
        "connectors.BatchJob",
        on_delete=models.CASCADE,
        related_name="records",
    )
    row_index = models.PositiveIntegerField()
    data = models.JSONField()
    edited_data = models.JSONField(null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    submitted = models.BooleanField(default=False)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_records",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "data_records"
        ordering = ["row_index"]
        unique_together = [("batch_job", "row_index")]

    def effective_data(self):
        return self.edited_data if self.is_edited else self.data
