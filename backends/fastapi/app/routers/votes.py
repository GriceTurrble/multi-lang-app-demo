from __future__ import annotations

import typing
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import PoolDep
from app.models import VoteRequest, VoteResponse

router = APIRouter(tags=["votes"])

if typing.TYPE_CHECKING:
    import asyncpg


class VoteService:
    """Service layer for applying votes, shared between endpoints."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self.pool = pool

    def _get_table_for_object_type(self, object_type: str) -> str:
        # TODO move this to some more generic service layer for all object types,
        # which would be needed if some new table were added with more polymorphic keys.
        if object_type.lower() in {"post", "posts"}:
            return "posts"
        if object_type.lower() in {"comment", "comments"}:
            return "comments"
        raise ValueError(f"Unknown object_type '{object_type}'")

    async def _validate_post_exists(
        self,
        post_id: UUID,
    ) -> None:
        """Checks in the database whether the given Post exists.

        Raises HTTPException with 404 if not.
        Otherwise, returns None.
        """
        exists = await self.pool.fetchval(
            """
            SELECT 1 FROM posts
            WHERE id = $1
            """,
            post_id,
        )
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found",
            )

    async def _validate_comment_exists(
        self,
        post_id: UUID,
        comment_id: UUID,
    ) -> None:
        """Checks database whether this Comment exists and is a child of the given Post.

        Raises HTTPException with 404 if not. Otherwise, returns None.
        """
        exists = await self.pool.fetchval(
            """
            SELECT 1 FROM comments
            WHERE post_id = $1
            AND id = $2
            """,
            post_id,
            comment_id,
        )
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found",
            )

    async def _apply_vote(
        self,
        object_id: UUID,
        object_type: str,
        payload: VoteRequest,
    ) -> VoteResponse:
        """Applies `payload` vote to the `object_type` object with ID `object_id`.

        Note we expect another call has validated that the object, its parents, and all
        connections between them
        already exist in the database.
        """
        object_table = self._get_table_for_object_type(object_type)
        async with self.pool.acquire() as conn:
            if payload.value == 0:
                await conn.execute(
                    """
                    DELETE FROM votes
                    WHERE voter = $1
                    AND object_id = $2
                    AND object_type = $3
                    """,
                    payload.username,
                    object_id,
                    object_type,
                )
            else:
                await conn.execute(
                    """
                    INSERT INTO votes
                    (voter, object_id, object_type, vote_value)
                    VALUES
                    ($1, $2, $3, $4)
                    ON CONFLICT (object_id, object_type, voter)
                    DO UPDATE SET vote_value = EXCLUDED.vote_value
                    """,
                    payload.username,
                    object_id,
                    object_type,
                    payload.value,
                )

            # Grab the updated score of the object we voted on
            score = await conn.fetchval(
                f"SELECT vote_score FROM {object_table} WHERE id = $1", object_id
            )
            if score is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{object_type} not found",
                )
        return VoteResponse(
            object_id=object_id,
            object_type=object_type,
            vote_score=score,
        )

    async def vote_on_post(
        self,
        post_id: UUID,
        payload: VoteRequest,
    ):
        await self._validate_post_exists(post_id=post_id)
        return await self._apply_vote(
            object_id=post_id,
            object_type="Post",
            payload=payload,
        )

    async def vote_on_comment(
        self,
        post_id: UUID,
        comment_id: UUID,
        payload: VoteRequest,
    ):
        await self._validate_comment_exists(post_id=post_id, comment_id=comment_id)
        return await self._apply_vote(
            object_id=comment_id,
            object_type="Comment",
            payload=payload,
        )


class VoteServiceWithDepInjections(VoteService):
    """Subclass of the service layer that includes FastAPI dependency injections."""

    def __init__(self, pool: PoolDep):
        super().__init__(pool=pool)


VoterServiceDep = typing.Annotated[VoteService, Depends(VoteServiceWithDepInjections)]


@router.post("/posts/{post_id}/vote", response_model=VoteResponse)
async def vote_on_post(
    service: VoterServiceDep,
    post_id: UUID,
    payload: VoteRequest,
):
    return await service.vote_on_post(
        post_id=post_id,
        payload=payload,
    )


@router.post("/posts/{post_id}/comments/{comment_id}/vote", response_model=VoteResponse)
async def vote_on_comment(
    service: VoterServiceDep,
    post_id: UUID,
    comment_id: UUID,
    payload: VoteRequest,
):
    return await service.vote_on_comment(
        post_id=post_id,
        comment_id=comment_id,
        payload=payload,
    )
