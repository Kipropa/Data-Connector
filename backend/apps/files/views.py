from django.db.models import Q
from django.http import FileResponse
from pathlib import Path
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response

from django.conf import settings
from .models import StoredFile, FileShare


# ── Permissions ────────────────────────────────────────────────────────────
class FileAccessPermission(BasePermission):
    """
    Admin: full access to all files.
    User: access only to own files + files shared with them.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_admin:
            return True
        if obj.owner == user:
            return True
        # Shared?
        return FileShare.objects.filter(file=obj, shared_with=user).exists()


# ── Serializers ────────────────────────────────────────────────────────────
class StoredFileSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source="owner.email", read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = StoredFile
        fields = [
            "id", "filename", "format", "row_count",
            "metadata", "owner_email", "download_url", "created_at",
        ]

    def get_download_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f"/api/files/{obj.pk}/download/")
        return f"/api/files/{obj.pk}/download/"


class FileShareSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileShare
        fields = ["id", "file", "shared_with", "shared_by", "created_at"]
        read_only_fields = ["id", "shared_by", "created_at"]

    def create(self, validated_data):
        validated_data["shared_by"] = self.context["request"].user
        return super().create(validated_data)


# ── Views ──────────────────────────────────────────────────────────────────
class StoredFileViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StoredFileSerializer
    permission_classes = [IsAuthenticated, FileAccessPermission]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return StoredFile.objects.select_related("owner", "job").all()
        return StoredFile.objects.select_related("owner", "job").filter(
            Q(owner=user) | Q(shares__shared_with=user)
        ).distinct()

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        file_obj = self.get_object()
        abs_path = Path(settings.MEDIA_ROOT) / file_obj.file_path
        if not abs_path.exists():
            return Response({"error": "File not found on disk"}, status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(
            open(abs_path, "rb"),
            as_attachment=True,
            filename=file_obj.filename,
        )
        return response


class FileShareViewSet(viewsets.ModelViewSet):
    serializer_class = FileShareSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return FileShare.objects.select_related("file", "shared_with", "shared_by").all()
        return FileShare.objects.filter(
            Q(file__owner=user) | Q(shared_with=user)
        ).select_related("file", "shared_with", "shared_by")

    def perform_create(self, serializer):
        # Only admin or file owner can share
        file_obj = serializer.validated_data["file"]
        user = self.request.user
        if not user.is_admin and file_obj.owner != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only share files you own.")
        serializer.save(shared_by=user)
