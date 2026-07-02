"""Tests for auth.py — get_current_user with mocked jose.jwt."""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials


def _make_credentials(token="fake.token.here"):
    creds = MagicMock(spec=HTTPAuthorizationCredentials)
    creds.credentials = token
    return creds


class TestGetCurrentUser:
    def test_valid_token_returns_user(self):
        from auth import get_current_user

        with patch("auth.jwk.construct") as mock_construct, patch("auth.jwt.decode") as mock_decode:
            mock_construct.return_value = MagicMock()
            mock_decode.return_value = {"sub": "auth-uuid-123", "email": "user@neu.edu"}

            result = get_current_user(credentials=_make_credentials())
            assert result == {"auth_id": "auth-uuid-123", "email": "user@neu.edu"}

    def test_missing_sub_raises_401(self):
        from auth import get_current_user

        with patch("auth.jwk.construct") as mock_construct, patch("auth.jwt.decode") as mock_decode:
            mock_construct.return_value = MagicMock()
            mock_decode.return_value = {"email": "user@neu.edu"}  # no 'sub'

            with pytest.raises(HTTPException) as exc_info:
                get_current_user(credentials=_make_credentials())
            assert exc_info.value.status_code == 401

    def test_jwt_error_raises_401(self):
        from auth import get_current_user
        from jose import JWTError

        with patch("auth.jwk.construct") as mock_construct, patch("auth.jwt.decode") as mock_decode:
            mock_construct.return_value = MagicMock()
            mock_decode.side_effect = JWTError("bad token")

            with pytest.raises(HTTPException) as exc_info:
                get_current_user(credentials=_make_credentials())
            assert exc_info.value.status_code == 401

    def test_generic_exception_raises_401(self):
        from auth import get_current_user

        with patch("auth.jwk.construct") as mock_construct:
            mock_construct.side_effect = Exception("unexpected error")

            with pytest.raises(HTTPException) as exc_info:
                get_current_user(credentials=_make_credentials())
            assert exc_info.value.status_code == 401

    def test_returns_auth_id_from_sub(self):
        from auth import get_current_user

        with patch("auth.jwk.construct") as mock_construct, patch("auth.jwt.decode") as mock_decode:
            mock_construct.return_value = MagicMock()
            mock_decode.return_value = {"sub": "specific-sub-value", "email": "x@y.com"}

            result = get_current_user(credentials=_make_credentials())
            assert result["auth_id"] == "specific-sub-value"
