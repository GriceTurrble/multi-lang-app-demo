from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.db import get_pool
from app.models import CommentCreate, CommentResponse, CommentTreeResponse, CommentUpdate

router = APIRouter(prefix="/posts/{post_id}/comments", tags=["comments"])

TOP_COMMENTS_PAGE_SIZE = 10


@router.get("", response_model=CommentTreeResponse)
async def list_comments(
    post_id: UUID,
    cursor: UUID | None = None,
    max_depth: int = 2,
    replies_per_page: int = 10,
):
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, post_id, parent_comment_id, author, body,
                   created_at, updated_at, vote_score, depth
            FROM get_comment_tree(
                p_post_id   := $1,
                p_max_depth := $2,
                p_page_size := $3,
                p_cursor_id := $4
            )
            """,
            post_id,
            max_depth,
            replies_per_page,
            cursor,
        )
    top_level = [r for r in rows if r["depth"] == 0]
    next_cursor = (
        top_level[-1]["id"] if len(top_level) == replies_per_page else None
    )
    items = [CommentResponse(**dict(r)) for r in rows]
    return CommentTreeResponse(items=items, next_cursor=next_cursor)


@router.post("", response_model=CommentResponse, status_code=201)
async def create_comment(post_id: UUID, payload: CommentCreate):
    pool = get_pool()
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT 1 FROM posts WHERE id = $1", post_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Post not found")
        row = await conn.fetchrow(
            """
            INSERT INTO comments (post_id, author, body)
            VALUES ($1, $2, $3) RETURNING *
            """,
            post_id,
            payload.author,
            payload.body,
        )
    return CommentResponse(**dict(row))


@router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment(post_id: UUID, comment_id: UUID):
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM comments WHERE id = $1 AND post_id = $2",
            comment_id,
            post_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")
    return CommentResponse(**dict(row))


@router.patch("/{comment_id}", response_model=CommentResponse)
async def update_comment(post_id: UUID, comment_id: UUID, payload: CommentUpdate):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clauses = ", ".join(f"{k} = ${i + 3}" for i, k in enumerate(updates))
    set_clauses += ", updated_at = NOW()"
    values = list(updates.values())
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE comments SET {set_clauses} WHERE id = $1 AND post_id = $2 RETURNING *",
            comment_id,
            post_id,
            *values,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")
    return CommentResponse(**dict(row))


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(post_id: UUID, comment_id: UUID):
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM comments WHERE id = $1 AND post_id = $2",
            comment_id,
            post_id,
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Comment not found")


@router.get("/{comment_id}/replies", response_model=CommentTreeResponse)
async def list_replies(
    post_id: UUID,
    comment_id: UUID,
    cursor: UUID | None = None,
    max_depth: int = 2,
    replies_per_page: int = 10,
):
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, post_id, parent_comment_id, author, body,
                   created_at, updated_at, vote_score, depth
            FROM get_reply_tree(
                p_post_id    := $1,
                p_comment_id := $2,
                p_max_depth  := $3,
                p_page_size  := $4,
                p_cursor_id  := $5
            )
            """,
            post_id,
            comment_id,
            max_depth,
            replies_per_page,
            cursor,
        )
        if not rows:
            # Distinguish "comment not found" from "comment has no replies"
            exists = await conn.fetchval(
                "SELECT 1 FROM comments WHERE id = $1 AND post_id = $2",
                comment_id,
                post_id,
            )
            if not exists:
                raise HTTPException(status_code=404, detail="Comment not found")
            return CommentTreeResponse(items=[], next_cursor=None)
    direct_replies = [r for r in rows if r["depth"] == 1]
    next_cursor = (
        direct_replies[-1]["id"]
        if len(direct_replies) == replies_per_page
        else None
    )
    items = [CommentResponse(**dict(r)) for r in rows]
    return CommentTreeResponse(items=items, next_cursor=next_cursor)
