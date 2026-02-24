from __future__ import annotations

import copy
import datetime
import typing
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
import uuid7
from fastapi import status
from freezegun import freeze_time

if typing.TYPE_CHECKING:
    from fastapi.testclient import TestClient


@freeze_time("2025-02-24")
def _make_post_row(**kwargs) -> dict:
    now = datetime.datetime.now(datetime.UTC)
    row = {
        "id": uuid7.create(),
        "title": "Test Title",
        "body": "Test body content",
        "author": "testuser",
        "created_at": now,
        "updated_at": now,
        "vote_score": 0,
    }
    row.update(kwargs)
    return row


# === GET /posts ===


def test_list_posts_returns_items(
    test_client: TestClient,
    mock_conn: AsyncMock,
):
    """/posts endpoint returning a single matching item."""
    row = _make_post_row()
    mock_conn.fetch.return_value = [row]

    resp = test_client.get("/posts")

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == str(row["id"])
    assert data["next_cursor"] is None


def test_list_posts_empty(
    test_client: TestClient,
    mock_conn: AsyncMock,
):
    """/posts endpoint returning no items."""
    mock_conn.fetch.return_value = []

    resp = test_client.get("/posts")

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["items"] == []
    assert data["next_cursor"] is None


def test_list_posts_full_page_sets_next_cursor(
    test_client: TestClient,
    mock_conn: AsyncMock,
):
    """/posts endpoint returns a page of posts.

    A `next_cursor` ID matching the ID of the last post is available.
    """
    rows = [_make_post_row() for _ in range(25)]
    mock_conn.fetch.return_value = rows

    resp = test_client.get("/posts")

    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert len(data["items"]) == 25
    assert data["next_cursor"] == str(rows[-1]["id"])


def test_list_posts_with_cursor(
    test_client: TestClient,
    mock_conn: AsyncMock,
):
    cursor_id = uuid7.create()
    mock_conn.fetch.return_value = [_make_post_row()]

    resp = test_client.get("/posts", params={"cursor": str(cursor_id)})

    assert resp.status_code == status.HTTP_200_OK
    # Cursor UUID is passed as first query parameter in the cursor-based query
    assert mock_conn.fetch.call_args.args[1] == cursor_id
    # NOTE we are not actually querying the data,
    # and the logic for returning data based on query resides in the database,
    # not this backend.
    # Therefore, we already know what data is going to be returned;
    # there is no need to assert the response here.


# === POST /posts ===


def test_create_post(
    test_client: TestClient,
    mock_conn: AsyncMock,
):
    """A POST to /posts endpoint creates a new post."""
    row = _make_post_row(title="New Post", body="Body text", author="alice")

    # We make a somewhat complex side effect for the fetchrow call here.
    # We want to take the values actually passed to the request in the payload
    # and assert that those values were "entered" in our INSERT statement.
    # So, we copy all the valid keys of the generated `row` dict,
    # then overwrite the ones requested i the `fetchrow` call itself.
    # It's a little roundabout, but it asserts the real values are passed into the method.
    async def _side_effect(query, title, body, author):
        # Assert args as passed
        assert "INSERT" in query.upper()
        assert title == row["title"]
        assert body == row["body"]
        assert author == row["author"]

        # Return an updated copy of the row using those passed values
        copied = copy.deepcopy(row)
        copied.update({"title": title, "body": body, "author": author})
        return copied

    mock_conn.fetchrow.side_effect = _side_effect

    resp = test_client.post(
        "/posts",
        json={
            "title": row["title"],
            "body": row["body"],
            "author": row["author"],
        },
    )

    # We should get a 201 response and the same data we had fetchrow return:
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["title"] == "New Post"
    assert data["body"] == "Body text"
    assert data["author"] == "alice"


def test_create_post_without_title(
    test_client: TestClient,
    mock_conn: AsyncMock,
):
    """Post titles are optional (in this implementation).

    Assert that we can pass None and get a Post from it still.
    """
    row = _make_post_row(title=None, body="Body text", author="alice")

    async def _side_effect(query, title, body, author):
        # Assert args as passed
        assert "INSERT" in query.upper()
        assert title == row["title"]
        assert body == row["body"]
        assert author == row["author"]

        # Return an updated copy of the row using those passed values
        copied = copy.deepcopy(row)
        copied.update({"title": title, "body": body, "author": author})
        return copied

    mock_conn.fetchrow.side_effect = _side_effect

    resp = test_client.post("/posts", json={"body": "Body text", "author": "alice"})

    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["title"] is None


def test_create_post_missing_required_fields(
    test_client: TestClient,
):
    """Checks validation errors for missing required fields."""
    resp = test_client.post("/posts", json={"title": "Only title"})
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


# === GET /posts/{post_id} ===


def test_get_post(
    test_client: TestClient,
    mock_conn: AsyncMock,
):
    """We can return a single Post's details from /posts/<uuid>"""
    post_id = uuid7.create()
    row = _make_post_row(id=post_id)

    async def _side_effect(query, post_id):
        # Assert args as passed
        assert "SELECT" in query.upper()
        assert post_id == row["id"]

        # Return an updated copy of the row using those passed values
        copied = copy.deepcopy(row)
        copied.update({"id": post_id})
        return copied

    mock_conn.fetchrow.side_effect = _side_effect

    resp = test_client.get(f"/posts/{post_id}")

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["id"] == str(post_id)


def test_get_post_not_found(test_client: TestClient, mock_conn: AsyncMock):
    """Returns 404 if nothing was returned from the database."""
    mock_conn.fetchrow.return_value = None

    resp = test_client.get(f"/posts/{uuid7.create()}")

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["detail"] == "Post not found"


@pytest.mark.parametrize(
    "fake_uuid",
    [
        "not-a-uuid",
        "1234",
        456,
    ],
)
def test_get_post_invalid_uuid(
    test_client: TestClient,
    fake_uuid,
):
    """Validation errors for /posts/<uuid> (in particular, not a UUID type)"""
    resp = test_client.get(f"/posts/{fake_uuid}")
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


# === PATCH /posts/{post_id} ===


def test_update_post(
    test_client: TestClient,
    mock_conn: AsyncMock,
):
    """PATCH /posts/<uuid> edits the post."""
    post_id = uuid7.create()
    row = _make_post_row(id=post_id, body="Updated body")

    def _side_effect(query: str, post_id: UUID, *args):
        assert "UPDATE" in query.upper()
        assert post_id == row["id"]
        assert args[0] == row["body"]

        copied = copy.deepcopy(row)
        copied.update({"id": post_id, "body": args[0]})
        return copied

    mock_conn.fetchrow.side_effect = _side_effect

    resp = test_client.patch(f"/posts/{post_id}", json={"body": "Updated body"})

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["body"] == "Updated body"


def test_update_post_no_fields(test_client: TestClient):
    """If no fields are passed in the PATCH call, responds with 400."""
    resp = test_client.patch(f"/posts/{uuid7.create()}", json={})

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json()["detail"] == "No fields to update"


def test_update_post_not_found(test_client: TestClient, mock_conn: AsyncMock):
    """Attemping to PATCH a non-existent Post 404's."""
    mock_conn.fetchrow.return_value = None

    resp = test_client.patch(f"/posts/{uuid7.create()}", json={"body": "Updated"})

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["detail"] == "Post not found"


# === DELETE /posts/{post_id} ===


def test_delete_post(test_client: TestClient, mock_conn: AsyncMock):
    """Can DELETE Posts."""
    row_id = uuid7.create()

    async def _side_effect(query, post_id):
        assert "DELETE" in query.upper()
        assert post_id == row_id

        result = "DELETE 1"
        return result

    mock_conn.execute.side_effect = _side_effect

    resp = test_client.delete(f"/posts/{row_id}")

    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_delete_post_not_found_still_works(
    test_client: TestClient, mock_conn: AsyncMock
):
    """Attempting to DELETE a non-existent post should still work.

    I mean, why 404 (not found) when we want to no longer be able to find it, anyway?
    Issuing the same DELETE command more than once should be idempotent.
    """
    mock_conn.execute.return_value = "DELETE 0"

    resp = test_client.delete(f"/posts/{uuid7.create()}")

    assert resp.status_code == status.HTTP_204_NO_CONTENT
