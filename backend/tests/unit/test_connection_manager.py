"""Tests for api/websocket_manager/connection_manager.py."""

import pytest
from unittest.mock import AsyncMock, MagicMock

pytest_plugins = ("pytest_asyncio",)


@pytest.mark.asyncio
async def test_connect_stores_connection():
    from api.websocket_manager.connection_manager import ConnectionManager

    manager = ConnectionManager()
    ws = AsyncMock()
    await manager.connect(ws, user_id=1)
    assert 1 in manager.active_connections
    ws.accept.assert_called_once()


@pytest.mark.asyncio
async def test_disconnect_removes_connection():
    from api.websocket_manager.connection_manager import ConnectionManager

    manager = ConnectionManager()
    ws = AsyncMock()
    await manager.connect(ws, user_id=2)
    await manager.disconnect(2)
    assert 2 not in manager.active_connections


@pytest.mark.asyncio
async def test_disconnect_missing_user_does_not_raise():
    from api.websocket_manager.connection_manager import ConnectionManager

    manager = ConnectionManager()
    await manager.disconnect(999)  # Should not raise


@pytest.mark.asyncio
async def test_send_message_calls_send_text():
    from api.websocket_manager.connection_manager import ConnectionManager

    manager = ConnectionManager()
    ws = AsyncMock()
    await manager.connect(ws, user_id=3)
    await manager.send_message(3, "hello")
    ws.send_text.assert_called_once_with("hello")


@pytest.mark.asyncio
async def test_send_message_to_missing_user_does_not_raise():
    from api.websocket_manager.connection_manager import ConnectionManager

    manager = ConnectionManager()
    await manager.send_message(999, "hello")  # Should silently do nothing


@pytest.mark.asyncio
async def test_multiple_connections():
    from api.websocket_manager.connection_manager import ConnectionManager

    manager = ConnectionManager()
    ws1, ws2 = AsyncMock(), AsyncMock()
    await manager.connect(ws1, user_id=10)
    await manager.connect(ws2, user_id=11)
    assert len(manager.active_connections) == 2
    await manager.disconnect(10)
    assert 10 not in manager.active_connections
    assert 11 in manager.active_connections
