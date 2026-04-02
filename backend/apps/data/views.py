from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import DataRecord
from .services import submit_edited_records
from apps.connectors.models import BatchJob


class DataRecordSerializer(serializers.ModelSerializer):
    effective_data = serializers.SerializerMethodField()

    class Meta:
        model = DataRecord
        fields = [
            "id", "batch_job", "row_index",
            "data", "edited_data", "effective_data",
            "is_edited", "submitted", "submitted_at", "created_at",
        ]
        read_only_fields = ["id", "batch_job", "row_index", "data", "submitted", "submitted_at", "created_at"]

    def get_effective_data(self, obj):
        return obj.effective_data()


class DataRecordUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataRecord
        fields = ["edited_data", "is_edited"]


class DataRecordViewSet(viewsets.ModelViewSet):
    serializer_class = DataRecordSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = DataRecord.objects.select_related("batch_job__connection", "submitted_by")
        # Filter by job if provided
        job_id = self.request.query_params.get("job")
        if job_id:
            qs = qs.filter(batch_job_id=job_id)
        if not user.is_admin:
            qs = qs.filter(batch_job__created_by=user)
        return qs

    def partial_update(self, request, *args, **kwargs):
        record = self.get_object()
        ser = DataRecordUpdateSerializer(record, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(DataRecordSerializer(record).data)

    @action(detail=False, methods=["post"], url_path="submit")
    def submit(self, request):
        """Submit a set of records (by IDs) and trigger dual-storage."""
        record_ids = request.data.get("record_ids", [])
        output_format = request.data.get("format", "json")

        if not record_ids:
            return Response({"error": "record_ids required"}, status=status.HTTP_400_BAD_REQUEST)
        if output_format not in ("json", "csv"):
            return Response({"error": "format must be json or csv"}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset().filter(id__in=record_ids)
        records = list(qs)
        if not records:
            return Response({"error": "No matching records found"}, status=status.HTTP_404_NOT_FOUND)

        stored_file = submit_edited_records(records, request.user, output_format)

        from apps.files.serializers import StoredFileSerializer
        return Response({
            "submitted": len(records),
            "file": StoredFileSerializer(stored_file).data,
        }, status=status.HTTP_200_OK)
