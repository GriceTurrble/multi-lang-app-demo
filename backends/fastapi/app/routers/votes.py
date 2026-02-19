from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.db import get_pool
from app.models import VoteRequest, VoteResponse

router = APIRouter(tags=["votes"])


async def _apply_vote(
    object_id: UUID,
    object_type: str,
    payload: VoteRequest,
) -> VoteResponse:
    pool = get_pool()
    async with pool.acquire() as conn:
        if payload.value == 0:
            await conn.execute(
                "DELETE FROM votes WHERE voter = $1 AND object_id = $2 AND object_type = $3",
                payload.username,
                object_id,
                object_type,
            )
        else:
            await conn.execute(
                """
                INSERT INTO votes (voter, object_id, object_type, vote_value)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (object_id, object_type, voter)
                DO UPDATE SET vote_value = EXCLUDED.vote_value
                """,
                payload.username,
                object_id,
                object_type,
                payload.value,
            )
        table = "posts" if object_type == "Post" else "comments"
        score = await conn.fetchval(
            f"SELECT vote_score FROM {table} WHERE id = $1", object_id
        )
        if score is None:
            raise HTTPException(status_code=404, detail=f"{object_type} not found")
    return VoteResponse(object_id=object_id, object_type=object_type, vote_score=score)


@router.post("/posts/{post_id}/vote", response_model=VoteResponse)
async def vote_on_post(post_id: UUID, payload: VoteRequest):
    return await _apply_vote(post_id, "Post", payload)


@router.post("/posts/{post_id}/comments/{comment_id}/vote", response_model=VoteResponse)
async def vote_on_comment(post_id: UUID, comment_id: UUID, payload: VoteRequest):
    pool = get_pool()
    async with pool.acquire() as conn:
        exists = await conn.fetchval(
            "SELECT 1 FROM comments WHERE id = $1 AND post_id = $2",
            comment_id,
            post_id,
        )
    if not exists:
        raise HTTPException(status_code=404, detail="Comment not found")
    return await _apply_vote(comment_id, "Comment", payload)
