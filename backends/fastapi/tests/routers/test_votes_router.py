from __future__ import annotations

import typing
from unittest.mock import AsyncMock, MagicMock

import pytest
import uuid7
from fastapi import status

if typing.TYPE_CHECKING:
    from fastapi.testclient import TestClient

    from app.models import UserResponse


@pytest.fixture
def voted_object_exists(mock_pool: MagicMock) -> AsyncMock:
    """Make the service's existence check pass.

    `VoteService` calls `pool.fetchval` directly rather than through
    `pool.acquire()`, so it needs its own async mock.
    """
    mock_pool.fetchval = AsyncMock(return_value=1)
    return mock_pool.fetchval


# === POST /posts/{post_id}/vote ===


def test_vote_on_post(
    authed_client: TestClient,
    mock_conn: AsyncMock,
    voted_object_exists: AsyncMock,
):
    """An upvote on a Post returns the updated score."""
    post_id = uuid7.create()
    mock_conn.fetchval.return_value = 5

    resp = authed_client.post(f"/posts/{post_id}/vote", json={"value": 1})

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["object_id"] == str(post_id)
    assert data["object_type"] == "Post"
    assert data["vote_score"] == 5


def test_vote_on_post_upserts(
    authed_client: TestClient,
    mock_conn: AsyncMock,
    voted_object_exists: AsyncMock,
    mock_user: UserResponse,
):
    """A non-zero vote INSERTs with an ON CONFLICT upsert, attributed to the caller."""
    post_id = uuid7.create()
    mock_conn.fetchval.return_value = 1

    authed_client.post(f"/posts/{post_id}/vote", json={"value": -1})

    sql, *params = mock_conn.execute.await_args.args
    assert "INSERT INTO votes" in sql
    assert "ON CONFLICT" in sql
    assert mock_user.id in params
    assert post_id in params
    assert "Post" in params
    assert -1 in params


def test_vote_of_zero_deletes_the_vote(
    authed_client: TestClient,
    mock_conn: AsyncMock,
    voted_object_exists: AsyncMock,
    mock_user: UserResponse,
):
    """A value of 0 removes the caller's existing vote row."""
    post_id = uuid7.create()
    mock_conn.fetchval.return_value = 0

    resp = authed_client.post(f"/posts/{post_id}/vote", json={"value": 0})

    assert resp.status_code == status.HTTP_200_OK
    sql, *params = mock_conn.execute.await_args.args
    assert "DELETE FROM votes" in sql
    assert mock_user.id in params
    assert post_id in params


def test_vote_on_missing_post(
    authed_client: TestClient,
    mock_pool: MagicMock,
):
    """Voting on a Post that does not exist returns 404."""
    mock_pool.fetchval = AsyncMock(return_value=None)

    resp = authed_client.post(f"/posts/{uuid7.create()}/vote", json={"value": 1})

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["detail"] == "Post not found"


def test_vote_on_post_requires_auth(test_client: TestClient):
    """Voting without credentials is rejected."""
    resp = test_client.post(f"/posts/{uuid7.create()}/vote", json={"value": 1})

    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize("value", [2, -2, 100])
def test_vote_value_must_be_valid(
    authed_client: TestClient,
    voted_object_exists: AsyncMock,
    value: int,
):
    """Only -1, 0, and 1 are accepted vote values."""
    resp = authed_client.post(f"/posts/{uuid7.create()}/vote", json={"value": value})

    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_vote_body_ignores_username(
    authed_client: TestClient,
    mock_conn: AsyncMock,
    voted_object_exists: AsyncMock,
    mock_user: UserResponse,
):
    """A `username` in the body cannot redirect attribution away from the session."""
    post_id = uuid7.create()
    mock_conn.fetchval.return_value = 1

    resp = authed_client.post(
        f"/posts/{post_id}/vote",
        json={"value": 1, "username": "somebody_else"},
    )

    assert resp.status_code == status.HTTP_200_OK
    _, *params = mock_conn.execute.await_args.args
    assert mock_user.id in params
    assert "somebody_else" not in params


def test_vote_on_post_missing_score_is_404(
    authed_client: TestClient,
    mock_conn: AsyncMock,
    voted_object_exists: AsyncMock,
):
    """A post deleted between the existence check and the score read is a 404."""
    mock_conn.fetchval.return_value = None

    resp = authed_client.post(f"/posts/{uuid7.create()}/vote", json={"value": 1})

    assert resp.status_code == status.HTTP_404_NOT_FOUND


# === POST /posts/{post_id}/comments/{comment_id}/vote ===


def test_vote_on_comment(
    authed_client: TestClient,
    mock_conn: AsyncMock,
    voted_object_exists: AsyncMock,
):
    """An upvote on a Comment returns the updated score for that comment."""
    post_id = uuid7.create()
    comment_id = uuid7.create()
    mock_conn.fetchval.return_value = 3

    resp = authed_client.post(
        f"/posts/{post_id}/comments/{comment_id}/vote",
        json={"value": 1},
    )

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["object_id"] == str(comment_id)
    assert data["object_type"] == "Comment"
    assert data["vote_score"] == 3


def test_vote_on_comment_checks_it_belongs_to_the_post(
    authed_client: TestClient,
    mock_conn: AsyncMock,
    voted_object_exists: AsyncMock,
):
    """The existence check scopes the comment to the post in the path."""
    post_id = uuid7.create()
    comment_id = uuid7.create()
    mock_conn.fetchval.return_value = 1

    authed_client.post(
        f"/posts/{post_id}/comments/{comment_id}/vote",
        json={"value": 1},
    )

    assert voted_object_exists.await_args is not None
    sql, *params = voted_object_exists.await_args.args
    assert "FROM comments" in sql
    assert post_id in params
    assert comment_id in params


def test_vote_on_missing_comment(
    authed_client: TestClient,
    mock_pool: MagicMock,
):
    """Voting on a Comment that does not exist under this Post returns 404."""
    mock_pool.fetchval = AsyncMock(return_value=None)

    resp = authed_client.post(
        f"/posts/{uuid7.create()}/comments/{uuid7.create()}/vote",
        json={"value": 1},
    )

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["detail"] == "Comment not found"


def test_vote_on_comment_requires_auth(test_client: TestClient):
    """Voting on a comment without credentials is rejected."""
    resp = test_client.post(
        f"/posts/{uuid7.create()}/comments/{uuid7.create()}/vote",
        json={"value": 1},
    )

    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
