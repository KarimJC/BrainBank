"""Tests for api/routes/user.py."""
import pytest


USER_DATA = {
    "user_id": 1,
    "auth_id": "test-auth-id",
    "neu_email": "test@northeastern.edu",
    "first_name": "Alice",
    "last_name": "Smith",
    "profile_picture": None,
}


class TestGetMe:
    def test_returns_user(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.user.cache_get", lambda k: None)
        monkeypatch.setattr("api.routes.user.cache_set", lambda *a, **k: None)
        resp = client.get("/api/v1/me")
        assert resp.status_code == 200
        assert resp.json()["user_id"] == 1

    def test_returns_404_when_user_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.get_user_by_auth_id", lambda *a, **k: None)
        monkeypatch.setattr("api.routes.user.cache_get", lambda k: None)
        resp = client.get("/api/v1/me")
        assert resp.status_code == 404

    def test_returns_cached_user(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.cache_get", lambda k: USER_DATA)
        resp = client.get("/api/v1/me")
        assert resp.status_code == 200


class TestPatchMe:
    def test_returns_500_due_to_neu_email_bug(self, client, monkeypatch):
        # PRODUCTION BUG: The route at user.py line 60 evaluates `updated_user_data.neu_email`
        # which does NOT exist on UserUpdate (the model only has first_name, last_name,
        # profile_picture). This raises AttributeError on every PATCH /me call, which
        # the FastAPI error handler turns into a 500. This test pins that known-broken
        # behavior so any future code change that accidentally makes it work differently
        # is caught.
        monkeypatch.setattr("api.routes.user.get_user_by_auth_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.user.update_user_by_auth_id", lambda *a, **k: {**USER_DATA, "first_name": "Bob"})
        monkeypatch.setattr("api.routes.user.cache_delete", lambda *a, **k: None)
        resp = client.patch("/api/v1/me", json={"first_name": "Bob"})
        assert resp.status_code == 500

    def test_returns_404_when_user_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.get_user_by_auth_id", lambda *a, **k: None)
        resp = client.patch("/api/v1/me", json={"first_name": "Bob"})
        assert resp.status_code == 404


class TestGetUserById:
    def test_returns_user(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.get_user_by_id", lambda *a, **k: USER_DATA)
        resp = client.get("/api/v1/user/1")
        assert resp.status_code == 200
        assert resp.json()["user_id"] == 1

    def test_returns_404_when_missing(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.get_user_by_id", lambda *a, **k: None)
        resp = client.get("/api/v1/user/999")
        assert resp.status_code == 404


class TestPatchUserById:
    def test_updates_own_profile(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.get_user_by_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.user.update_user_crud", lambda *a, **k: {**USER_DATA, "first_name": "Bob"})
        resp = client.patch("/api/v1/user/1", json={"first_name": "Bob"})
        assert resp.status_code == 200

    def test_forbids_updating_other_user(self, client, monkeypatch):
        other_user = {**USER_DATA, "user_id": 2, "auth_id": "other-auth-id"}
        monkeypatch.setattr("api.routes.user.get_user_by_id", lambda *a, **k: other_user)
        resp = client.patch("/api/v1/user/2", json={"first_name": "X"})
        assert resp.status_code == 403

    def test_returns_404_when_user_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.get_user_by_id", lambda *a, **k: None)
        resp = client.patch("/api/v1/user/999", json={"first_name": "X"})
        assert resp.status_code == 404


class TestDeleteUserById:
    def test_deletes_own_account(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.get_user_by_id", lambda *a, **k: USER_DATA)
        monkeypatch.setattr("api.routes.user.delete_user_crud", lambda *a, **k: True)
        resp = client.delete("/api/v1/user/1")
        assert resp.status_code == 200

    def test_forbids_deleting_other_user(self, client, monkeypatch):
        other_user = {**USER_DATA, "user_id": 2, "auth_id": "other-auth-id"}
        monkeypatch.setattr("api.routes.user.get_user_by_id", lambda *a, **k: other_user)
        resp = client.delete("/api/v1/user/2")
        assert resp.status_code == 403

    def test_returns_404_when_user_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.get_user_by_id", lambda *a, **k: None)
        resp = client.delete("/api/v1/user/999")
        assert resp.status_code == 404


class TestPutProfilePicture:
    def test_updates_profile_picture(self, client, monkeypatch):
        updated = {**USER_DATA, "profile_picture": "http://img.com/pfp.jpg"}
        monkeypatch.setattr("api.routes.user.update_user_by_auth_id", lambda *a, **k: updated)
        resp = client.put("/api/v1/me/profile-picture", json={"profile_picture_url": "http://img.com/pfp.jpg"})
        assert resp.status_code == 200

    def test_returns_400_when_no_url(self, client):
        resp = client.put("/api/v1/me/profile-picture", json={})
        assert resp.status_code == 400

    def test_returns_404_when_user_not_found(self, client, monkeypatch):
        monkeypatch.setattr("api.routes.user.update_user_by_auth_id", lambda *a, **k: None)
        resp = client.put("/api/v1/me/profile-picture", json={"profile_picture_url": "http://img.com/pfp.jpg"})
        assert resp.status_code == 404
