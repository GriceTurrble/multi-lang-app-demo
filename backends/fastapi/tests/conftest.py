from __future__ import annotations

import pytest

from fastapi.testclient import TestClient
from app.main import get_app


@pytest.fixture
def test_client():
    app = get_app()
    client = TestClient(app)
    yield client
