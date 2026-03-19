from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.auth import CurrentUserDep
from app.db import PoolDep
from app.models import PostCreate, PostListResponse, PostResponse, PostUpdate

router = APIRouter(prefix="/posts", tags=["posts"])

PAGE_SIZE = 25


@router.get("", response_model=PostListResponse)
async def list_posts(
    pool: PoolDep,
    cursor: UUID | None = None,
):
    async with pool.acquire() as conn:
        if cursor:
            rows = await conn.fetch(
                """
                SELECT p.*, u.username AS author
                FROM posts p
                JOIN users u ON u.id = p.author_id
                WHERE (p.created_at, p.id) > (
                    SELECT pp.created_at, pp.id FROM posts pp WHERE pp.id = $1
                )
                ORDER BY p.created_at ASC, p.id ASC
                LIMIT $2
                """,
                cursor,
                PAGE_SIZE,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT p.*, u.username AS author
                FROM posts p
                JOIN users u ON u.id = p.author_id
                ORDER BY p.created_at ASC, p.id ASC
                LIMIT $1
                """,
                PAGE_SIZE,
            )
    items = [PostResponse(**dict(r)) for r in rows]
    next_cursor = items[-1].id if len(items) == PAGE_SIZE else None
    return PostListResponse(items=items, next_cursor=next_cursor)


@router.post("", response_model=PostResponse, status_code=201)
async def create_post(
    pool: PoolDep,
    current_user: CurrentUserDep,
    payload: PostCreate,
):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            WITH ins AS (
                INSERT INTO posts (title, body, author_id)
                VALUES ($1, $2, $3)
                RETURNING *
            )
            SELECT ins.*, u.username AS author
            FROM ins
            JOIN users u ON u.id = ins.author_id
            """,
            payload.title,
            payload.body,
            current_user.id,
        )
    return PostResponse(**dict(row))


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    pool: PoolDep,
    post_id: UUID,
):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT p.*, u.username AS author
            FROM posts p
            JOIN users u ON u.id = p.author_id
            WHERE p.id = $1
            """,
            post_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostResponse(**dict(row))


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    pool: PoolDep,
    current_user: CurrentUserDep,
    post_id: UUID,
    payload: PostUpdate,
):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clauses = ", ".join(f"{key} = ${i + 2}" for i, key in enumerate(updates))
    set_clauses += ", updated_at = NOW()"
    values = list(updates.values())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            WITH upd AS (UPDATE posts SET {set_clauses} WHERE id = $1 RETURNING *)
            SELECT upd.*, u.username AS author
            FROM upd
            JOIN users u ON u.id = upd.author_id
            """,
            post_id,
            *values,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostResponse(**dict(row))


@router.delete("/{post_id}", status_code=204)
async def delete_post(
    pool: PoolDep,
    current_user: CurrentUserDep,
    post_id: UUID,
):
    async with pool.acquire() as conn:
        _ = await conn.execute("DELETE FROM posts WHERE id = $1", post_id)
