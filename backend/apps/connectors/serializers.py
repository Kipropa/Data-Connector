from rest_framework import serializers
from .models import Connection, BatchJob


class ConnectionSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    db_type_display = serializers.CharField(source="get_db_type_display", read_only=True)

    class Meta:
        model = Connection
        fields = [
            "id", "name", "db_type", "db_type_display",
            "host", "port", "database", "username", "password",
            "extra_options", "is_active",
            "last_tested_at", "last_test_ok",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "last_tested_at", "last_test_ok", "created_at", "updated_at"]

    def create(self, validated_data):
        from django.db import IntegrityError
        validated_data["owner"] = self.context["request"].user
        try:
            return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError(
                {"name": "A connection with this name already exists. Please choose a different name."}
            )


class BatchJobSerializer(serializers.ModelSerializer):
    connection_name = serializers.CharField(source="connection.name", read_only=True)
    db_type = serializers.CharField(source="connection.db_type", read_only=True)

    class Meta:
        model = BatchJob
        fields = [
            "id", "connection", "connection_name", "db_type",
            "query", "batch_size", "status",
            "rows_extracted", "error_message",
            "celery_task_id", "started_at", "finished_at", "created_at",
        ]
        read_only_fields = [
            "id", "status", "rows_extracted", "error_message",
            "celery_task_id", "started_at", "finished_at", "created_at",
        ]
