from __future__ import annotations

import datetime
from uuid import UUID

from pydantic import BaseModel


class CommentCreate(BaseModel):
    body: str
    parent_comment_id: UUID | None = None


class CommentUpdate(BaseModel):
    body: str | None = None


class CommentResponse(BaseModel):
    id: UUID
    post_id: UUID
    parent_comment_id: UUID | None
    author: str
    body: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    vote_score: int
    depth: int | None = None


class CommentTreeResponse(BaseModel):
    items: list[CommentResponse]
    next_cursor: UUID | None
