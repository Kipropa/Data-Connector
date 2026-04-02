from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConnectionViewSet, BatchJobViewSet

router = DefaultRouter()
router.register("connections", ConnectionViewSet, basename="connections")
router.register("batch-jobs", BatchJobViewSet, basename="batch-jobs")

urlpatterns = [path("", include(router.urls))]
