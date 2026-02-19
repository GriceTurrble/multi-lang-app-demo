from __future__ import annotations

import pytest

from fastapi.testclient import TestClient
from app.main import get_app
from app.config import Settings, get_settings


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
def test_client(settings) -> TestClient:
    app = get_app()
    client = TestClient(app)
    yield client
