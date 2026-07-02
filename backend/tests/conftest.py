"""
conftest.py — must set env vars BEFORE any backend imports.
"""

import os
import sys
from pathlib import Path

# ── 1. Stub environment before any backend module is imported ──────────────────
os.environ.setdefault("SUPABASE_URL", "http://fake.supabase.test")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "fake-key")
os.environ.setdefault("DATABASE_URL", "postgresql://fake")
os.environ.setdefault("GEMINI_API_KEY", "fake-gemini")
os.environ.setdefault("SUPABASE_JWT_X", "fake-x")
os.environ.setdefault("SUPABASE_JWT_Y", "fake-y")
os.environ.setdefault("SUPABASE_JWT_KID", "fake-kid")

# ── 2. Make sure backend/ is importable ───────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

# ── 3. Now safe to import backend modules ─────────────────────────────────────
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helper: build a cursor mock that handles cursor_factory= keyword arg
# ---------------------------------------------------------------------------
def _make_cursor_mock():
    cursor = MagicMock()
    cursor.rowcount = 0
    cursor.fetchone.return_value = None
    cursor.fetchall.return_value = []
    cursor.__enter__ = lambda s: s
    cursor.__exit__ = MagicMock(return_value=False)
    return cursor


def make_db_mock(fetchone=None, fetchall=None, rowcount=0):
    """Return a db MagicMock wired with cursor behaviour."""
    db = MagicMock()
    cursor = _make_cursor_mock()
    cursor.fetchone.return_value = fetchone
    cursor.fetchall.return_value = fetchall if fetchall is not None else []
    cursor.rowcount = rowcount

    # cursor() and cursor(cursor_factory=...) both return the same mock
    db.cursor.return_value = cursor
    return db, cursor


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_db():
    """Return (db_mock, cursor_mock) with defaults."""
    return make_db_mock()


@pytest.fixture()
def fake_user():
    return {"auth_id": "test-auth-id", "email": "test@northeastern.edu"}


@pytest.fixture()
def client(monkeypatch, fake_user):
    """
    Build the TestClient with get_db and get_current_user overridden.

    The returned db mock is stored on client.mock_db for per-test access.
    """
    # Patch supabase client creation to avoid real network calls
    with patch("supabase.create_client", return_value=MagicMock()):
        from main import app
        from db import connection as db_conn
        from auth import get_current_user

        db_mock, cursor_mock = make_db_mock()

        def override_get_db():
            yield db_mock

        def override_get_current_user():
            return fake_user

        app.dependency_overrides[db_conn.get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user

        test_client = TestClient(app, raise_server_exceptions=False)
        test_client.mock_db = db_mock
        test_client.mock_cursor = cursor_mock

        yield test_client

        app.dependency_overrides.clear()
