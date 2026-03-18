from __future__ import annotations

from pydantic import BaseModel

from app.models.users import UserResponse


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 (not a password)
    user: UserResponse
