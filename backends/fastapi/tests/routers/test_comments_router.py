from __future__ import annotations

import datetime
import typing
from unittest.mock import AsyncMock

import pytest
import uuid7
from fastapi import status

from app.routers.comments import DEFAULT_COMMENTS_PAGE_SIZE

if typing.TYPE_CHECKING:
    from fastapi.testclient import TestClient

    from app.models import UserResponse


def _make_comment_row(**kwargs) -> dict:
    row = {
        "id": uuid7.create(),
        "post_id": uuid7.create(),
        "parent_comment_id": None,
        "author": "testuser",
        "body": "A comment body",
        "created_at": datetime.datetime(2025, 1, 1, tzinfo=datetime.UTC),
        "updated_at": datetime.datetime(2025, 1, 1, tzinfo=datetime.UTC),
        "vote_score": 1,
        "user_vote": 0,
        "depth": 0,
    }
    row.update(kwargs)
    return row


# === GET /posts/{post_id}/comments ===


def test_list_comments(test_client: TestClient, mock_conn: AsyncMock):
    """Returns the flat comment tree for a post."""
    post_id = uuid7.create()
    mock_conn.fetch.return_value = [
        _make_comment_row(post_id=post_id, depth=0),
        _make_comment_row(post_id=post_id, depth=1),
    ]

    resp = test_client.get(f"/posts/{post_id}/comments")

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["next_cursor"] is None


def test_list_comments_empty(test_client: TestClient, mock_conn: AsyncMock):
    """A post with no comments returns an empty list, not a 404."""
    mock_conn.fetch.return_value = []

    resp = test_client.get(f"/posts/{uuid7.create()}/comments")

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"items": [], "next_cursor": None}


def test_list_comments_sets_next_cursor_on_full_page(
    test_client: TestClient, mock_conn: AsyncMock
):
    """A full page of top comments hands back the last one as the next cursor."""
    rows = [_make_comment_row(depth=0) for _ in range(DEFAULT_COMMENTS_PAGE_SIZE)]
    mock_conn.fetch.return_value = rows

    resp = test_client.get(f"/posts/{uuid7.create()}/comments")

    assert resp.json()["next_cursor"] == str(rows[-1]["id"])


def test_list_comments_ignores_replies_for_the_cursor(
    test_client: TestClient, mock_conn: AsyncMock
):
    """Only top-level comments count toward the page size."""
    rows = [_make_comment_row(depth=0) for _ in range(DEFAULT_COMMENTS_PAGE_SIZE - 1)]
    rows += [_make_comment_row(depth=1) for _ in range(5)]
    mock_conn.fetch.return_value = rows

    resp = test_client.get(f"/posts/{uuid7.create()}/comments")

    assert resp.json()["next_cursor"] is None


def test_list_comments_passes_cursor_and_tree_params(
    test_client: TestClient, mock_conn: AsyncMock
):
    """Query params reach the stored function call."""
    mock_conn.fetch.return_value = []
    cursor = uuid7.create()

    test_client.get(
        f"/posts/{uuid7.create()}/comments",
        params={"cursor": str(cursor), "max_depth": 0, "replies_per_page": 5},
    )

    _, *params = mock_conn.fetch.await_args.args
    assert cursor in params
    assert 0 in params
    assert 5 in params


@pytest.mark.parametrize(
    ("param", "value"),
    [
        ("max_depth", -1),
        ("max_depth", 1000),
        ("replies_per_page", 0),
        ("replies_per_page", 100_000),
    ],
)
def test_list_comments_rejects_out_of_range_params(
    test_client: TestClient, param: str, value: int
):
    """Tree params are bounded, so a request cannot ask for an unbounded CTE."""
    resp = test_client.get(
        f"/posts/{uuid7.create()}/comments",
        params={param: value},
    )

    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


# === POST /posts/{post_id}/comments ===


def test_create_comment(
    authed_client: TestClient, mock_conn: AsyncMock, mock_user: UserResponse
):
    """Creating a top-level comment attributes it to the authenticated user."""
    post_id = uuid7.create()
    mock_conn.fetchval.return_value = 1
    mock_conn.fetchrow.return_value = _make_comment_row(post_id=post_id)

    resp = authed_client.post(
        f"/posts/{post_id}/comments",
        json={"body": "A comment body"},
    )

    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["body"] == "A comment body"
    _, *params = mock_conn.fetchrow.await_args.args
    assert mock_user.id in params


def test_create_comment_post_not_found(authed_client: TestClient, mock_conn: AsyncMock):
    """Commenting on a nonexistent post returns 404."""
    mock_conn.fetchval.return_value = None

    resp = authed_client.post(
        f"/posts/{uuid7.create()}/comments",
        json={"body": "A comment body"},
    )

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["detail"] == "Post not found"


def test_create_reply(authed_client: TestClient, mock_conn: AsyncMock):
    """A reply passes its parent through to the INSERT."""
    post_id = uuid7.create()
    parent_id = uuid7.create()
    mock_conn.fetchval.return_value = 1
    mock_conn.fetchrow.return_value = _make_comment_row(
        post_id=post_id, parent_comment_id=parent_id
    )

    resp = authed_client.post(
        f"/posts/{post_id}/comments",
        json={"body": "A reply", "parent_comment_id": str(parent_id)},
    )

    assert resp.status_code == status.HTTP_201_CREATED
    _, *params = mock_conn.fetchrow.await_args.args
    assert parent_id in params


def test_create_reply_rejects_parent_from_another_post(
    authed_client: TestClient, mock_conn: AsyncMock
):
    """A parent comment belonging to a different post is a 404, not a stray row."""
    # Post exists, but the parent comment is not on it.
    mock_conn.fetchval.side_effect = [1, None]

    resp = authed_client.post(
        f"/posts/{uuid7.create()}/comments",
        json={"body": "A reply", "parent_comment_id": str(uuid7.create())},
    )

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["detail"] == "Parent comment not found on this post"
    mock_conn.fetchrow.assert_not_awaited()


def test_create_comment_requires_auth(test_client: TestClient):
    """Commenting without credentials is rejected."""
    resp = test_client.post(
        f"/posts/{uuid7.create()}/comments",
        json={"body": "A comment body"},
    )

    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_comment_requires_body(authed_client: TestClient):
    """An empty comment body is rejected."""
    resp = authed_client.post(
        f"/posts/{uuid7.create()}/comments",
        json={"body": ""},
    )

    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


# === GET /posts/{post_id}/comments/{comment_id} ===


def test_get_comment(test_client: TestClient, mock_conn: AsyncMock):
    """Fetches a single comment scoped to its post."""
    post_id = uuid7.create()
    comment_id = uuid7.create()
    mock_conn.fetchrow.return_value = _make_comment_row(id=comment_id, post_id=post_id)

    resp = test_client.get(f"/posts/{post_id}/comments/{comment_id}")

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["id"] == str(comment_id)
    _, *params = mock_conn.fetchrow.await_args.args
    assert post_id in params
    assert comment_id in params


def test_get_comment_not_found(test_client: TestClient, mock_conn: AsyncMock):
    """A comment id that does not match the post returns 404."""
    mock_conn.fetchrow.return_value = None

    resp = test_client.get(f"/posts/{uuid7.create()}/comments/{uuid7.create()}")

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["detail"] == "Comment not found"


# === PATCH /posts/{post_id}/comments/{comment_id} ===


def test_update_comment(
    authed_client: TestClient, mock_conn: AsyncMock, mock_user: UserResponse
):
    """An author can edit their own comment."""
    post_id = uuid7.create()
    comment_id = uuid7.create()
    mock_conn.fetchval.return_value = mock_user.id
    mock_conn.fetchrow.return_value = _make_comment_row(
        id=comment_id, post_id=post_id, body="Edited"
    )

    resp = authed_client.patch(
        f"/posts/{post_id}/comments/{comment_id}",
        json={"body": "Edited"},
    )

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["body"] == "Edited"


def test_update_comment_no_fields(authed_client: TestClient):
    """A PATCH with nothing to change is a 400."""
    resp = authed_client.patch(
        f"/posts/{uuid7.create()}/comments/{uuid7.create()}",
        json={},
    )

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json()["detail"] == "No fields to update"


def test_update_comment_not_found(authed_client: TestClient, mock_conn: AsyncMock):
    """Editing a comment that does not exist is a 404."""
    mock_conn.fetchval.return_value = None

    resp = authed_client.patch(
        f"/posts/{uuid7.create()}/comments/{uuid7.create()}",
        json={"body": "Edited"},
    )

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["detail"] == "Comment not found"


def test_update_comment_rejects_non_author(
    authed_client: TestClient, mock_conn: AsyncMock
):
    """A comment authored by somebody else cannot be edited."""
    mock_conn.fetchval.return_value = uuid7.create()

    resp = authed_client.patch(
        f"/posts/{uuid7.create()}/comments/{uuid7.create()}",
        json={"body": "Edited"},
    )

    assert resp.status_code == status.HTTP_403_FORBIDDEN
    mock_conn.fetchrow.assert_not_awaited()


def test_update_comment_requires_auth(test_client: TestClient):
    """Editing without credentials is rejected."""
    resp = test_client.patch(
        f"/posts/{uuid7.create()}/comments/{uuid7.create()}",
        json={"body": "Edited"},
    )

    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# === DELETE /posts/{post_id}/comments/{comment_id} ===


def test_delete_comment(
    authed_client: TestClient, mock_conn: AsyncMock, mock_user: UserResponse
):
    """An author can delete their own comment."""
    mock_conn.fetchval.return_value = mock_user.id
    mock_conn.execute.return_value = "DELETE 1"

    resp = authed_client.delete(f"/posts/{uuid7.create()}/comments/{uuid7.create()}")

    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_delete_comment_not_found_still_works(
    authed_client: TestClient, mock_conn: AsyncMock
):
    """Deleting an already-absent comment stays idempotent."""
    mock_conn.fetchval.return_value = None

    resp = authed_client.delete(f"/posts/{uuid7.create()}/comments/{uuid7.create()}")

    assert resp.status_code == status.HTTP_204_NO_CONTENT
    mock_conn.execute.assert_not_awaited()


def test_delete_comment_rejects_non_author(
    authed_client: TestClient, mock_conn: AsyncMock
):
    """A comment authored by somebody else cannot be deleted."""
    mock_conn.fetchval.return_value = uuid7.create()

    resp = authed_client.delete(f"/posts/{uuid7.create()}/comments/{uuid7.create()}")

    assert resp.status_code == status.HTTP_403_FORBIDDEN
    mock_conn.execute.assert_not_awaited()


def test_delete_comment_requires_auth(test_client: TestClient):
    """Deleting without credentials is rejected."""
    resp = test_client.delete(f"/posts/{uuid7.create()}/comments/{uuid7.create()}")

    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# === GET /posts/{post_id}/comments/{comment_id}/replies ===


def test_list_replies(test_client: TestClient, mock_conn: AsyncMock):
    """Returns the reply tree under a comment."""
    mock_conn.fetch.return_value = [
        _make_comment_row(depth=1),
        _make_comment_row(depth=2),
    ]

    resp = test_client.get(f"/posts/{uuid7.create()}/comments/{uuid7.create()}/replies")

    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.json()["items"]) == 2


def test_list_replies_cursor_counts_direct_replies_only(
    test_client: TestClient, mock_conn: AsyncMock
):
    """Only depth-1 rows count toward the page size for the next cursor."""
    rows = [_make_comment_row(depth=1) for _ in range(DEFAULT_COMMENTS_PAGE_SIZE)]
    rows += [_make_comment_row(depth=2) for _ in range(3)]
    mock_conn.fetch.return_value = rows

    resp = test_client.get(f"/posts/{uuid7.create()}/comments/{uuid7.create()}/replies")

    assert resp.json()["next_cursor"] == str(rows[DEFAULT_COMMENTS_PAGE_SIZE - 1]["id"])


def test_list_replies_empty_for_existing_comment(
    test_client: TestClient, mock_conn: AsyncMock
):
    """A comment with no replies returns an empty list, not a 404."""
    mock_conn.fetch.return_value = []
    mock_conn.fetchval.return_value = 1

    resp = test_client.get(f"/posts/{uuid7.create()}/comments/{uuid7.create()}/replies")

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"items": [], "next_cursor": None}


def test_list_replies_comment_not_found(test_client: TestClient, mock_conn: AsyncMock):
    """No rows and no such comment is a 404."""
    mock_conn.fetch.return_value = []
    mock_conn.fetchval.return_value = None

    resp = test_client.get(f"/posts/{uuid7.create()}/comments/{uuid7.create()}/replies")

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["detail"] == "Comment not found"
