"""Tests for root endpoints in main.py."""

import pytest


class TestRootEndpoint:
    def test_get_root(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert "message" in resp.json()

    def test_get_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
