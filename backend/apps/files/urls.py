from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoredFileViewSet, FileShareViewSet

router = DefaultRouter()
router.register("files", StoredFileViewSet, basename="files")
router.register("file-shares", FileShareViewSet, basename="file-shares")

urlpatterns = [path("", include(router.urls))]
