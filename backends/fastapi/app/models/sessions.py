from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.models.users import (
    EMAIL_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    UserResponse,
)


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=EMAIL_MAX_LENGTH)
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 (not a password)
    user: UserResponse
