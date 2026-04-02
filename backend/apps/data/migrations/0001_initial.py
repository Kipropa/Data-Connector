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
            name="DataRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("row_index", models.PositiveIntegerField()),
                ("data", models.JSONField()),
                ("edited_data", models.JSONField(null=True, blank=True)),
                ("is_edited", models.BooleanField(default=False)),
                ("submitted", models.BooleanField(default=False)),
                ("submitted_at", models.DateTimeField(null=True, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("batch_job", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="records", to="connectors.batchjob")),
                ("submitted_by", models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name="submitted_records", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "data_records", "ordering": ["row_index"]},
        ),
        migrations.AlterUniqueTogether(name="datarecord", unique_together={("batch_job", "row_index")}),
    ]
