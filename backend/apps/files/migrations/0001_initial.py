from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("connectors", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="StoredFile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("filename", models.CharField(max_length=512)),
                ("file_path", models.CharField(max_length=1024)),
                ("format", models.CharField(max_length=10, choices=[("json", "JSON"), ("csv", "CSV")], default="json")),
                ("row_count", models.PositiveIntegerField(default=0)),
                ("metadata", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="owned_files", to=settings.AUTH_USER_MODEL)),
                ("job", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="stored_files", to="connectors.batchjob")),
            ],
            options={"db_table": "stored_files", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="FileShare",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("file", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shares", to="files.storedfile")),
                ("shared_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="files_shared_by_me", to=settings.AUTH_USER_MODEL)),
                ("shared_with", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_files", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "file_shares"},
        ),
        migrations.AlterUniqueTogether(name="fileshare", unique_together={("file", "shared_with")}),
    ]
