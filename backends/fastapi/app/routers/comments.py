from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pgargs import Args, Cols

from app.auth import CurrentUserDep, OptionalCurrentUserDep
from app.db import PoolDep
from app.models import (
    CommentCreate,
    CommentResponse,
    CommentTreeResponse,
    CommentUpdate,
)

router = APIRouter(
    prefix="/posts/{post_id}/comments",
    tags=["comments"],
)

DEFAULT_MAX_DEPTH = 2
DEFAULT_COMMENTS_PAGE_SIZE = 10

# Upper bounds on the recursive tree queries. Without these a single request can
# ask for `(max_depth + 1) * replies_per_page` comments with no ceiling.
MAX_TREE_DEPTH = 10
MAX_REPLIES_PER_PAGE = 50

MaxDepthQuery = Annotated[int, Query(ge=0, le=MAX_TREE_DEPTH)]
RepliesPerPageQuery = Annotated[int, Query(ge=1, le=MAX_REPLIES_PER_PAGE)]


async def _comment_is_owned_by(
    conn,
    comment_id: UUID,
    post_id: UUID,
    user_id: UUID,
) -> bool:
    """Check that `user_id` authored comment `comment_id` under `post_id`.

    Returns `False` when no such comment exists, leaving the caller to choose
    between a 404 and an idempotent no-op. Raises 403 when the comment exists
    but belongs to someone else.
    """
    args = Args(comment_id=comment_id, post_id=post_id)
    author_id = await conn.fetchval(
        f"""
        SELECT author_id
        FROM comments
        WHERE id = {args.comment_id}
          AND post_id = {args.post_id}
        """,
        *args,
    )
    if author_id is None:
        return False
    if author_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only modify your own comments",
        )
    return True


@router.get("", response_model=CommentTreeResponse)
async def list_comments(
    pool: PoolDep,
    post_id: UUID,
    current_user: OptionalCurrentUserDep,
    cursor: UUID | None = None,
    max_depth: MaxDepthQuery = DEFAULT_MAX_DEPTH,
    replies_per_page: RepliesPerPageQuery = DEFAULT_COMMENTS_PAGE_SIZE,
):
    args = Args(
        post_id=post_id,
        max_depth=max_depth,
        page_size=replies_per_page,
        cursor_id=cursor,
        voter_id=current_user.id if current_user else None,
    )
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT
                id,
                post_id,
                parent_comment_id,
                author,
                body,
                created_at,
                updated_at,
                vote_score,
                depth,
                user_vote
            FROM get_comment_tree(
                p_post_id   := {args.post_id},
                p_max_depth := {args.max_depth},
                p_page_size := {args.page_size},
                p_cursor_id := {args.cursor_id},
                p_voter_id  := {args.voter_id}
            )
            """,
            *args,
        )
    top_level = [r for r in rows if r["depth"] == 0]
    next_cursor = top_level[-1]["id"] if len(top_level) == replies_per_page else None
    items = [CommentResponse(**dict(r)) for r in rows]
    return CommentTreeResponse(items=items, next_cursor=next_cursor)


@router.post("", response_model=CommentResponse, status_code=201)
async def create_comment(
    pool: PoolDep,
    current_user: CurrentUserDep,
    post_id: UUID,
    payload: CommentCreate,
):
    exists_args = Args(post_id=post_id)
    async with pool.acquire() as conn:
        exists = await conn.fetchval(
            f"SELECT 1 FROM posts WHERE id = {exists_args.post_id}",
            *exists_args,
        )
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found",
            )
        if payload.parent_comment_id is not None:
            # The FK only proves the parent exists somewhere. Without this check
            # a reply can be grafted onto a comment on a different post, where
            # neither tree query would ever return it.
            parent_args = Args(
                parent_comment_id=payload.parent_comment_id,
                post_id=post_id,
            )
            parent_exists = await conn.fetchval(
                f"""
                SELECT 1
                FROM comments
                WHERE id = {parent_args.parent_comment_id}
                  AND post_id = {parent_args.post_id}
                """,
                *parent_args,
            )
            if not parent_exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent comment not found on this post",
                )
        cols = Cols(
            post_id=post_id,
            parent_comment_id=payload.parent_comment_id,
            author_id=current_user.id,
            body=payload.body,
        )
        row = await conn.fetchrow(
            f"""
            WITH ins AS (
                INSERT INTO comments {cols.names}
                VALUES {cols.values}
                RETURNING *
            )
            SELECT ins.*, u.username AS author
            FROM ins
              JOIN users u ON u.id = ins.author_id
            """,
            *cols.args,
        )
    return CommentResponse(**dict(row))


@router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment(
    pool: PoolDep,
    post_id: UUID,
    comment_id: UUID,
    current_user: OptionalCurrentUserDep,
):
    args = Args(
        comment_id=comment_id,
        post_id=post_id,
        voter_id=current_user.id if current_user else None,
    )
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            SELECT c.*, u.username AS author,
                COALESCE(v.vote_value, 0) AS user_vote
            FROM comments c
            JOIN users u ON u.id = c.author_id
            LEFT JOIN votes v
                ON v.object_id = c.id
                AND v.object_type = 'Comment'
                AND v.voter_id = {args.voter_id}
            WHERE 1=1
                AND c.id = {args.comment_id}
                AND c.post_id = {args.post_id}
            """,
            *args,
        )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
        )
    return CommentResponse(**dict(row))


@router.patch("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    pool: PoolDep,
    current_user: CurrentUserDep,
    post_id: UUID,
    comment_id: UUID,
    payload: CommentUpdate,
):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No fields to update",
        )
    args = Args(
        comment_id=comment_id,
        post_id=post_id,
    )
    update_cols = Cols(args, **updates)
    async with pool.acquire() as conn:
        if not await _comment_is_owned_by(conn, comment_id, post_id, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
            )
        row = await conn.fetchrow(
            f"""
            WITH upd AS (
                UPDATE comments SET {update_cols.assignments}, updated_at = NOW()
                WHERE id = {args.comment_id} AND post_id = {args.post_id}
                RETURNING *
            )
            SELECT upd.*, u.username AS author
            FROM upd
              JOIN users u ON u.id = upd.author_id
            """,
            *args,
        )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
        )
    return CommentResponse(**dict(row))


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    pool: PoolDep,
    current_user: CurrentUserDep,
    post_id: UUID,
    comment_id: UUID,
):
    args = Args(comment_id=comment_id, post_id=post_id)
    async with pool.acquire() as conn:
        # Deleting an already-absent comment stays a no-op 204.
        if not await _comment_is_owned_by(conn, comment_id, post_id, current_user.id):
            return
        _ = await conn.execute(
            f"""
            DELETE FROM comments
            WHERE id = {args.comment_id}
            AND post_id = {args.post_id}
            """,
            *args,
        )


@router.get("/{comment_id}/replies", response_model=CommentTreeResponse)
async def list_replies(
    pool: PoolDep,
    post_id: UUID,
    comment_id: UUID,
    current_user: OptionalCurrentUserDep,
    cursor: UUID | None = None,
    max_depth: MaxDepthQuery = DEFAULT_MAX_DEPTH,
    replies_per_page: RepliesPerPageQuery = DEFAULT_COMMENTS_PAGE_SIZE,
):
    args = Args(
        post_id=post_id,
        comment_id=comment_id,
        max_depth=max_depth,
        page_size=replies_per_page,
        cursor_id=cursor,
        voter_id=current_user.id if current_user else None,
    )
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT
                id,
                post_id,
                parent_comment_id,
                author,
                body,
                created_at,
                updated_at,
                vote_score,
                depth,
                user_vote
            FROM get_reply_tree(
                p_post_id    := {args.post_id},
                p_comment_id := {args.comment_id},
                p_max_depth  := {args.max_depth},
                p_page_size  := {args.page_size},
                p_cursor_id  := {args.cursor_id},
                p_voter_id   := {args.voter_id}
            )
            """,
            *args,
        )
        if not rows:
            # Distinguish "comment not found" from "comment has no replies"
            exists_args = Args(comment_id=comment_id, post_id=post_id)
            exists = await conn.fetchval(
                f"""
                SELECT 1
                FROM comments
                WHERE id = {exists_args.comment_id}
                AND post_id = {exists_args.post_id}
                """,
                *exists_args,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Comment not found",
                )
            return CommentTreeResponse(items=[], next_cursor=None)
    direct_replies = [r for r in rows if r["depth"] == 1]
    next_cursor = (
        direct_replies[-1]["id"] if len(direct_replies) == replies_per_page else None
    )
    items = [CommentResponse(**dict(r)) for r in rows]
    return CommentTreeResponse(items=items, next_cursor=next_cursor)
