from __future__ import annotations

import datetime
from uuid import UUID

from pydantic import BaseModel, Field

BODY_MAX_LENGTH = 10_000


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=BODY_MAX_LENGTH)
    parent_comment_id: UUID | None = None


class CommentUpdate(BaseModel):
    body: str | None = Field(default=None, min_length=1, max_length=BODY_MAX_LENGTH)


class CommentResponse(BaseModel):
    id: UUID
    post_id: UUID
    parent_comment_id: UUID | None
    author: str
    body: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    vote_score: int
    user_vote: int = 0
    depth: int | None = None


class CommentTreeResponse(BaseModel):
    items: list[CommentResponse]
    next_cursor: UUID | None
