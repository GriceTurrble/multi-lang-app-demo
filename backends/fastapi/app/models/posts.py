from __future__ import annotations

import datetime
from uuid import UUID

from pydantic import BaseModel, Field

TITLE_MAX_LENGTH = 300
BODY_MAX_LENGTH = 40_000


class PostCreate(BaseModel):
    title: str | None = Field(default=None, max_length=TITLE_MAX_LENGTH)
    body: str = Field(min_length=1, max_length=BODY_MAX_LENGTH)


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=TITLE_MAX_LENGTH)
    body: str | None = Field(default=None, min_length=1, max_length=BODY_MAX_LENGTH)


class PostResponse(BaseModel):
    id: UUID
    title: str | None
    body: str
    author: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    vote_score: int
    user_vote: int = 0


class PostListResponse(BaseModel):
    items: list[PostResponse]
    next_cursor: UUID | None
