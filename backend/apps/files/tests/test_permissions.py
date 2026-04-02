"""
Tests for file RBAC: admin full access, users own + shared files only.
"""
from unittest.mock import MagicMock
import pytest
from apps.files.views import FileAccessPermission


def make_user(is_admin=False, uid=1):
    u = MagicMock()
    u.id = uid
    u.is_admin = is_admin
    return u


def make_file(owner_id=1):
    f = MagicMock()
    f.owner = MagicMock()
    f.owner.id = owner_id
    return f


class TestFileAccessPermission:
    def setup_method(self):
        self.perm = FileAccessPermission()
        self.request = MagicMock()
        self.view = MagicMock()

    def test_admin_can_access_any_file(self):
        self.request.user = make_user(is_admin=True, uid=99)
        file_obj = make_file(owner_id=1)
        assert self.perm.has_object_permission(self.request, self.view, file_obj)

    def test_owner_can_access_own_file(self):
        user = make_user(is_admin=False, uid=5)
        self.request.user = user
        file_obj = make_file(owner_id=5)
        file_obj.owner = user
        assert self.perm.has_object_permission(self.request, self.view, file_obj)

    def test_non_owner_without_share_denied(self):
        from unittest.mock import patch
        user = make_user(is_admin=False, uid=7)
        other_user = make_user(is_admin=False, uid=3)
        self.request.user = user
        file_obj = make_file(owner_id=3)
        file_obj.owner = other_user

        with patch("apps.files.views.FileShare") as MockShare:
            MockShare.objects.filter.return_value.exists.return_value = False
            result = self.perm.has_object_permission(self.request, self.view, file_obj)
        assert result is False

    def test_non_owner_with_share_allowed(self):
        from unittest.mock import patch
        user = make_user(is_admin=False, uid=7)
        other_user = make_user(is_admin=False, uid=3)
        self.request.user = user
        file_obj = make_file(owner_id=3)
        file_obj.owner = other_user

        with patch("apps.files.views.FileShare") as MockShare:
            MockShare.objects.filter.return_value.exists.return_value = True
            result = self.perm.has_object_permission(self.request, self.view, file_obj)
        assert result is True
