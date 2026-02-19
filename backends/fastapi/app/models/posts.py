from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PostCreate(BaseModel):
    title: str | None = None
    body: str
    author: str


class PostUpdate(BaseModel):
    title: str | None = None
    body: str | None = None


class PostResponse(BaseModel):
    id: UUID
    title: str | None
    body: str
    author: str
    created_at: datetime
    updated_at: datetime
    vote_score: int


class PostListResponse(BaseModel):
    items: list[PostResponse]
    next_cursor: UUID | None
