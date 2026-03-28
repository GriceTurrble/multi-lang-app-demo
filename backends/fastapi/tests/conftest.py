from __future__ import annotations

import datetime
from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
import uuid7
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import get_app
from app.models import UserResponse


@pytest.fixture
def settings() -> Generator[Settings]:
    # Apply any test overrides here
    settings = Settings(
        database_url="postgresql://postgres:postgres@localhost:5432/testdb",
        db_min_connections=2,
        db_max_connections=10,
    )
    yield settings


@pytest.fixture
def mock_conn() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_pool(mock_conn: AsyncMock) -> MagicMock:
    pool = MagicMock()
    ctx = AsyncMock()
    ctx.__aenter__.return_value = mock_conn
    ctx.__aexit__.return_value = None
    pool.acquire.return_value = ctx
    return pool


@pytest.fixture
def mock_user() -> UserResponse:
    return UserResponse(
        id=uuid7.create(),
        email="test@example.com",
        username="testuser",
        created_at=datetime.datetime(2025, 1, 1, tzinfo=datetime.UTC),
    )


@pytest.fixture
def test_client(settings, mock_pool: MagicMock) -> Generator[TestClient]:
    from app.config import get_settings
    from app.db import get_pool

    app = get_app()
    app.dependency_overrides[get_pool] = lambda: mock_pool
    app.dependency_overrides[get_settings] = lambda: settings
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def authed_client(
    settings, mock_pool: MagicMock, mock_user: UserResponse
) -> Generator[TestClient]:
    from app.auth import get_current_user, get_optional_current_user
    from app.config import get_settings
    from app.db import get_pool

    app = get_app()
    app.dependency_overrides[get_pool] = lambda: mock_pool
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_optional_current_user] = lambda: mock_user
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
