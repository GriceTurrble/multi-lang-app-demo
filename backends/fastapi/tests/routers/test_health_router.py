from __future__ import annotations

import typing

from fastapi import status

if typing.TYPE_CHECKING:
    from fastapi.testclient import TestClient


def test_get_health_check(test_client: TestClient):
    resp = test_client.get("/health")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"message": "ok"}
