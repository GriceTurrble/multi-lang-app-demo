from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.db import get_pool
from app.models import PostCreate, PostListResponse, PostResponse, PostUpdate

router = APIRouter(prefix="/posts", tags=["posts"])

PAGE_SIZE = 25


@router.get("", response_model=PostListResponse)
async def list_posts(cursor: UUID | None = None):
    pool = get_pool()
    async with pool.acquire() as conn:
        if cursor:
            rows = await conn.fetch(
                """
                SELECT * FROM posts
                WHERE (created_at, id) > (
                    SELECT created_at, id FROM posts WHERE id = $1
                )
                ORDER BY created_at ASC, id ASC
                LIMIT $2
                """,
                cursor,
                PAGE_SIZE,
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM posts ORDER BY created_at ASC, id ASC LIMIT $1",
                PAGE_SIZE,
            )
    items = [PostResponse(**dict(r)) for r in rows]
    next_cursor = items[-1].id if len(items) == PAGE_SIZE else None
    return PostListResponse(items=items, next_cursor=next_cursor)


@router.post("", response_model=PostResponse, status_code=201)
async def create_post(payload: PostCreate):
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO posts (title, body, author) VALUES ($1, $2, $3) RETURNING *",
            payload.title,
            payload.body,
            payload.author,
        )
    return PostResponse(**dict(row))


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: UUID):
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM posts WHERE id = $1", post_id)
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostResponse(**dict(row))


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(post_id: UUID, payload: PostUpdate):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clauses = ", ".join(f"{key} = ${i + 2}" for i, key in enumerate(updates))
    set_clauses += ", updated_at = NOW()"
    values = list(updates.values())
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE posts SET {set_clauses} WHERE id = $1 RETURNING *",
            post_id,
            *values,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostResponse(**dict(row))


@router.delete("/{post_id}", status_code=204)
async def delete_post(post_id: UUID):
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM posts WHERE id = $1", post_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Post not found")
