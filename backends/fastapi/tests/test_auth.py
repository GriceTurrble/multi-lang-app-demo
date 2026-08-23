from __future__ import annotations

import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
import uuid7
from fastapi import HTTPException

from app.auth import (
    get_current_session,
    get_optional_current_user,
    hash_password,
    lookup_session,
    verify_password,
)

pytestmark = pytest.mark.anyio


def _make_user_row(**kwargs) -> dict:
    row = {
        "id": uuid7.create(),
        "email": "test@example.com",
        "username": "testuser",
        "password_hash": "hashed_password",
        "created_at": datetime.datetime(2025, 1, 1, tzinfo=datetime.UTC),
    }
    row.update(kwargs)
    return row


def _credentials(token: str) -> MagicMock:
    creds = MagicMock()
    creds.credentials = token
    return creds


# === password hashing ===


def test_password_round_trip():
    """A hashed password verifies against its plaintext and nothing else."""
    hashed = hash_password("testpassword123")

    assert hashed != "testpassword123"
    assert verify_password("testpassword123", hashed)
    assert not verify_password("wrong", hashed)


# === lookup_session ===


async def test_lookup_session_returns_session_and_user(
    mock_pool: MagicMock, mock_conn: AsyncMock
):
    """A token matching an active session resolves to that session's user."""
    session_id = uuid7.create()
    mock_conn.fetchrow.return_value = _make_user_row()

    session = await lookup_session(mock_pool, str(session_id))

    assert session is not None
    assert session.id == session_id
    assert session.user.username == "testuser"


async def test_lookup_session_rejects_malformed_token(
    mock_pool: MagicMock, mock_conn: AsyncMock
):
    """A token that is not a UUID is rejected without touching the database."""
    session = await lookup_session(mock_pool, "not-a-uuid")

    assert session is None
    mock_conn.fetchrow.assert_not_awaited()


async def test_lookup_session_returns_none_when_no_row(
    mock_pool: MagicMock, mock_conn: AsyncMock
):
    """A well-formed token with no matching row resolves to None."""
    mock_conn.fetchrow.return_value = None

    assert await lookup_session(mock_pool, str(uuid7.create())) is None


# === get_current_session ===


async def test_get_current_session_raises_401_on_malformed_token(
    mock_pool: MagicMock,
):
    """A malformed Bearer token is a 401, not a 500 from the UUID cast."""
    with pytest.raises(HTTPException) as excinfo:
        await get_current_session(_credentials("not-a-uuid"), mock_pool)

    assert excinfo.value.status_code == 401
    assert excinfo.value.headers == {"WWW-Authenticate": "Bearer"}


async def test_get_current_session_raises_401_on_expired_session(
    mock_pool: MagicMock, mock_conn: AsyncMock
):
    """An expired or deactivated session returns no row, so 401."""
    mock_conn.fetchrow.return_value = None

    with pytest.raises(HTTPException) as excinfo:
        await get_current_session(_credentials(str(uuid7.create())), mock_pool)

    assert excinfo.value.status_code == 401


# === get_optional_current_user ===


async def test_optional_user_is_none_without_credentials(mock_pool: MagicMock):
    """No Authorization header means an anonymous request."""
    assert await get_optional_current_user(None, mock_pool) is None


async def test_optional_user_is_none_for_malformed_token(
    mock_pool: MagicMock, mock_conn: AsyncMock
):
    """A malformed token degrades to anonymous rather than erroring."""
    result = await get_optional_current_user(_credentials("not-a-uuid"), mock_pool)

    assert result is None
    mock_conn.fetchrow.assert_not_awaited()


async def test_optional_user_resolves_valid_token(
    mock_pool: MagicMock, mock_conn: AsyncMock
):
    """A valid token resolves to the session's user."""
    mock_conn.fetchrow.return_value = _make_user_row()

    result = await get_optional_current_user(
        _credentials(str(uuid7.create())), mock_pool
    )

    assert result is not None
    assert result.username == "testuser"
