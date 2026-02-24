from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import get_app


@pytest.fixture
def settings() -> Settings:
    # Apply any test overrides here
    overrides = {
        "db_connection_url": "postgresql://postgres:postgres@localhost:5432/testdb",
        "db_min_connections": 2,
        "db_max_connections": 10,
    }
    # reload forces the singleton to be updated
    # subsequent calls to `get_settings` should return the new object with our test settings
    settings = get_settings(reload=True, **overrides)
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
def test_client(settings, mock_pool: MagicMock) -> TestClient:
    from app.db import get_pool

    app = get_app()
    app.dependency_overrides[get_pool] = lambda: mock_pool
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
