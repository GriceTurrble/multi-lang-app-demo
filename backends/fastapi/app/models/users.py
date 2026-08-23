from __future__ import annotations

import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

# Mirrors the VARCHAR widths on the `users` table, so an over-long value is a
# 422 rather than a 500 from Postgres.
EMAIL_MAX_LENGTH = 255
USERNAME_MAX_LENGTH = 100
PASSWORD_MAX_LENGTH = 128


class UserBase(BaseModel):
    email: EmailStr = Field(max_length=EMAIL_MAX_LENGTH)
    username: str = Field(min_length=1, max_length=USERNAME_MAX_LENGTH)


class UserCreate(UserBase):
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class UserResponse(UserBase):
    id: UUID
    created_at: datetime.datetime
