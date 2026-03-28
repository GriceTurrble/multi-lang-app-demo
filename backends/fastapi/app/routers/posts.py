from uuid import UUID

from fastapi import APIRouter, HTTPException
from pgargs import Args, Cols

from app.auth import CurrentUserDep, OptionalCurrentUserDep
from app.db import PoolDep
from app.models import PostCreate, PostListResponse, PostResponse, PostUpdate

router = APIRouter(prefix="/posts", tags=["posts"])

PAGE_SIZE = 25


@router.get("", response_model=PostListResponse)
async def list_posts(
    pool: PoolDep,
    current_user: OptionalCurrentUserDep,
    cursor: UUID | None = None,
):
    args = Args(
        page_size=PAGE_SIZE,
        voter_id=current_user.id if current_user else None,
    )
    cursor_filter = ""
    if cursor:
        args.cursor = cursor
        cursor_filter = f"""
        WHERE
            (p.created_at, p.id)
            >
            (SELECT pp.created_at, pp.id FROM posts pp WHERE pp.id = {args.cursor})
        """
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT p.*, u.username AS author,
                COALESCE(v.vote_value, 0) AS user_vote
            FROM posts p
            JOIN users u ON u.id = p.author_id
            LEFT JOIN votes v ON v.object_id = p.id
                AND v.object_type = 'Post'
                AND v.voter_id = {args.voter_id}
            {cursor_filter}
            ORDER BY p.created_at ASC, p.id ASC
            LIMIT {args.page_size}
            """,
            *args,
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
    args = Args(
        title=payload.title,
        body=payload.body,
        current_user_id=current_user.id,
    )
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            WITH ins AS (
                INSERT INTO posts (title, body, author_id)
                VALUES ({args.title}, {args.body}, {args.current_user_id})
                RETURNING *
            )
            SELECT ins.*, u.username AS author
            FROM ins
            JOIN users u ON u.id = ins.author_id
            """,
            *args,
        )
    return PostResponse(**dict(row))


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    pool: PoolDep,
    post_id: UUID,
    current_user: OptionalCurrentUserDep,
):
    args = Args(
        post_id=post_id,
        voter_id=current_user.id if current_user else None,
    )
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            SELECT p.*, u.username AS author,
                COALESCE(v.vote_value, 0) AS user_vote
            FROM posts p
            JOIN users u ON u.id = p.author_id
            LEFT JOIN votes v ON v.object_id = p.id
                AND v.object_type = 'Post'
                AND v.voter_id = {args.voter_id}
            WHERE p.id = {args.post_id}
            """,
            *args,
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
    args = Args(post_id=post_id)
    update_cols = Cols(args, **updates)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            WITH upd AS (
                UPDATE posts
                SET
                    {update_cols.assignments},
                    updated_at = NOW()
                WHERE id = {args.post_id} RETURNING *
            )
            SELECT upd.*, u.username AS author
            FROM upd
            JOIN users u ON u.id = upd.author_id
            """,
            *args,
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
    args = Args(post_id=post_id)
    async with pool.acquire() as conn:
        _ = await conn.execute(f"DELETE FROM posts WHERE id = {args.post_id}", *args)
