from __future__ import annotations

import datetime
import typing
from unittest.mock import AsyncMock, patch

import asyncpg
import uuid7
from fastapi import status

if typing.TYPE_CHECKING:
    from fastapi.testclient import TestClient

    from app.models import UserResponse


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


# === POST /auth/register ===


def test_register(test_client: TestClient, mock_conn: AsyncMock):
    """Registering with valid data creates a user and returns UserResponse."""
    user_row = _make_user_row()
    mock_conn.fetchrow.return_value = user_row

    resp = test_client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "pass123",
        },
    )

    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_conflict(test_client: TestClient, mock_conn: AsyncMock):
    """Registering with a duplicate email or username returns 409."""
    mock_conn.fetchrow.side_effect = asyncpg.UniqueViolationError()

    resp = test_client.post(
        "/auth/register",
        json={
            "email": "existing@example.com",
            "username": "existing",
            "password": "pass123",
        },
    )

    assert resp.status_code == status.HTTP_409_CONFLICT


# === POST /auth/login ===


def test_login_success(test_client: TestClient, mock_conn: AsyncMock):
    """Valid credentials return a token and user details."""
    user_row = _make_user_row()
    session_row = {
        "id": uuid7.create(),
        "user_id": user_row["id"],
        "created_at": datetime.datetime(2025, 1, 1, tzinfo=datetime.UTC),
        "expires_at": datetime.datetime(2055, 1, 1, tzinfo=datetime.UTC),
        "is_active": True,
    }
    mock_conn.fetchrow.side_effect = [user_row, session_row]

    with patch("app.routers.auth.verify_password", return_value=True):
        resp = test_client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"},
        )

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["access_token"] == str(session_row["id"])
    assert data["token_type"] == "bearer"  # noqa: S105 (this is a test only)
    assert data["user"]["username"] == "testuser"


def test_login_user_not_found(test_client: TestClient, mock_conn: AsyncMock):
    """Login with an unknown email returns 401."""
    mock_conn.fetchrow.return_value = None

    resp = test_client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
    )

    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_wrong_password(test_client: TestClient, mock_conn: AsyncMock):
    """Login with a wrong password returns 401."""
    mock_conn.fetchrow.return_value = _make_user_row()

    with patch("app.routers.auth.verify_password", return_value=False):
        resp = test_client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "wrong"},
        )

    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# === POST /auth/logout ===


def test_logout(test_client: TestClient, mock_conn: AsyncMock):
    """A valid Bearer token can be logged out."""
    resp = test_client.post(
        "/auth/logout",
        headers={"Authorization": "Bearer some-fake-token"},
    )

    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_logout_requires_auth(test_client: TestClient):
    """Logout without a Bearer token returns 403."""
    resp = test_client.post("/auth/logout")

    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# === GET /auth/me ===


def test_me(authed_client: TestClient, mock_user: UserResponse):
    """Authenticated user gets their own details back."""
    resp = authed_client.get("/auth/me")

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["username"] == mock_user.username
    assert data["email"] == mock_user.email


def test_me_requires_auth(test_client: TestClient):
    """GET /auth/me without credentials returns 403."""
    resp = test_client.get("/auth/me")

    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
