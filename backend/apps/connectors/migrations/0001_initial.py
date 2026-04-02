from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Connection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("db_type", models.CharField(max_length=50, choices=[
                    ("postgresql", "PostgreSQL"), ("mysql", "MySQL"),
                    ("mongodb", "MongoDB"), ("clickhouse", "ClickHouse"),
                ])),
                ("host", models.CharField(max_length=255)),
                ("port", models.PositiveIntegerField()),
                ("database", models.CharField(max_length=255)),
                ("username", models.CharField(max_length=255)),
                ("password", models.CharField(max_length=255, blank=True)),
                ("extra_options", models.JSONField(default=dict, blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("last_tested_at", models.DateTimeField(null=True, blank=True)),
                ("last_test_ok", models.BooleanField(null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="connections", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "connections", "ordering": ["-created_at"]},
        ),
        migrations.AlterUniqueTogether(name="connection", unique_together={("owner", "name")}),
        migrations.CreateModel(
            name="BatchJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("query", models.TextField()),
                ("batch_size", models.PositiveIntegerField(default=100)),
                ("status", models.CharField(max_length=20, choices=[
                    ("pending", "Pending"), ("running", "Running"),
                    ("done", "Done"), ("failed", "Failed"),
                ], default="pending")),
                ("rows_extracted", models.PositiveIntegerField(default=0)),
                ("error_message", models.TextField(blank=True)),
                ("celery_task_id", models.CharField(max_length=255, blank=True)),
                ("started_at", models.DateTimeField(null=True, blank=True)),
                ("finished_at", models.DateTimeField(null=True, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("connection", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="batch_jobs", to="connectors.connection")),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="batch_jobs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "batch_jobs", "ordering": ["-created_at"]},
        ),
    ]
