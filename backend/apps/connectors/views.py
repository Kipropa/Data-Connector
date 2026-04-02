from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Connection, BatchJob
from .serializers import ConnectionSerializer, BatchJobSerializer
from .engine import get_connector, ConnectorError
from .tasks import run_batch_extraction


class ConnectionViewSet(viewsets.ModelViewSet):
    serializer_class = ConnectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Connection.objects.all()
        return Connection.objects.filter(owner=user)

    @action(detail=True, methods=["post"], url_path="test")
    def test_connection(self, request, pk=None):
        """Test connectivity for a saved connection."""
        conn = self.get_object()
        try:
            connector = get_connector(conn)
            ok = connector.test_connection()
        except ConnectorError as e:
            ok = False
            conn.last_test_ok = False
            conn.last_tested_at = timezone.now()
            conn.save(update_fields=["last_test_ok", "last_tested_at"])
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_200_OK)

        conn.last_test_ok = ok
        conn.last_tested_at = timezone.now()
        conn.save(update_fields=["last_test_ok", "last_tested_at"])
        return Response({"ok": ok})

    @action(detail=True, methods=["get"], url_path="tables")
    def list_tables(self, request, pk=None):
        """List tables/collections in the connected database."""
        conn = self.get_object()
        try:
            connector = get_connector(conn)
            tables = connector.list_tables()
            return Response({"tables": tables})
        except ConnectorError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="preview")
    def preview(self, request, pk=None):
        """Return up to 20 rows for a quick query preview."""
        conn = self.get_object()
        query = request.data.get("query", "")
        if not query:
            return Response({"error": "query is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            connector = get_connector(conn)
            rows, total = connector.extract_batch(query=query, batch_size=20, offset=0)
            return Response({"rows": rows, "total": total})
        except ConnectorError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BatchJobViewSet(viewsets.ModelViewSet):
    serializer_class = BatchJobSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return BatchJob.objects.select_related("connection", "created_by")
        return BatchJob.objects.filter(created_by=user).select_related("connection")

    def perform_create(self, serializer):
        job = serializer.save(created_by=self.request.user)
        # Kick off async extraction
        result = run_batch_extraction.delay(job.pk)
        job.celery_task_id = result.id
        job.save(update_fields=["celery_task_id"])

    @action(detail=True, methods=["get"], url_path="status")
    def job_status(self, request, pk=None):
        job = self.get_object()
        return Response(BatchJobSerializer(job).data)
