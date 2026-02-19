from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, field_validator


class VoteRequest(BaseModel):
    username: str
    value: int

    @field_validator("value")
    @classmethod
    def value_must_be_valid(cls, v: int) -> int:
        if v not in (-1, 0, 1):
            raise ValueError("value must be -1, 0, or 1")
        return v


class VoteResponse(BaseModel):
    object_id: UUID
    object_type: str
    vote_score: int
