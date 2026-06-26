"""Tests for cache/redis_client.py — no-op behaviour and live client behaviour."""
import pytest
from unittest.mock import MagicMock, patch
import cache.redis_client as redis_module


class TestRedisNoOp:
    """When _client is None, all ops are silent no-ops."""

    def setup_method(self):
        self._original = redis_module._client
        redis_module._client = None

    def teardown_method(self):
        redis_module._client = self._original

    def test_cache_get_returns_none(self):
        assert redis_module.cache_get("some_key") is None

    def test_cache_set_does_not_raise(self):
        redis_module.cache_set("k", {"data": 1})  # should not raise

    def test_cache_delete_does_not_raise(self):
        redis_module.cache_delete("k1", "k2")  # should not raise


class TestRedisWithMockedClient:
    """When _client is set, real redis methods are called."""

    def setup_method(self):
        self._original = redis_module._client
        self.mock_client = MagicMock()
        redis_module._client = self.mock_client

    def teardown_method(self):
        redis_module._client = self._original

    def test_cache_get_returns_parsed_json(self):
        self.mock_client.get.return_value = '{"key": "value"}'
        result = redis_module.cache_get("mykey")
        assert result == {"key": "value"}
        self.mock_client.get.assert_called_once_with("mykey")

    def test_cache_get_returns_none_when_missing(self):
        self.mock_client.get.return_value = None
        result = redis_module.cache_get("missing")
        assert result is None

    def test_cache_set_calls_setex(self):
        redis_module.cache_set("k", {"a": 1}, ttl=120)
        self.mock_client.setex.assert_called_once()
        args = self.mock_client.setex.call_args[0]
        assert args[0] == "k"
        assert args[1] == 120

    def test_cache_set_default_ttl(self):
        redis_module.cache_set("k", {"a": 1})
        args = self.mock_client.setex.call_args[0]
        assert args[1] == 60  # default TTL

    def test_cache_delete_calls_delete(self):
        redis_module.cache_delete("k1", "k2")
        self.mock_client.delete.assert_called_once_with("k1", "k2")

    def test_cache_get_handles_exception_gracefully(self):
        self.mock_client.get.side_effect = Exception("Redis error")
        result = redis_module.cache_get("key")
        assert result is None  # should not raise

    def test_cache_set_handles_exception_gracefully(self):
        self.mock_client.setex.side_effect = Exception("Redis error")
        redis_module.cache_set("k", {"a": 1})  # should not raise

    def test_cache_delete_handles_exception_gracefully(self):
        self.mock_client.delete.side_effect = Exception("Redis error")
        redis_module.cache_delete("k1")  # should not raise
