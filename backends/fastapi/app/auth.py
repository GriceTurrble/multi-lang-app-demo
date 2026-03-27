from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

from app.db import PoolDep
from app.models import UserResponse

pwd_context = CryptContext(
    schemes=[
        "argon2",
        "pbkdf2_sha256",
        "bcrypt",
    ],
    deprecated="auto",
)

_bearer = HTTPBearer()
BearerDep = Annotated[HTTPAuthorizationCredentials, Depends(_bearer)]

_optional_bearer = HTTPBearer(auto_error=False)
OptionalBearerDep = Annotated[
    HTTPAuthorizationCredentials | None, Depends(_optional_bearer)
]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


async def get_current_user(
    credentials: BearerDep,
    pool: PoolDep,
) -> UserResponse:
    token = credentials.credentials
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT u.*
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = $1::uuid
              AND s.is_active = TRUE
              AND s.expires_at > NOW()
            """,
            token,
        )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return UserResponse(**dict(row))


CurrentUserDep = Annotated[UserResponse, Depends(get_current_user)]


async def get_optional_current_user(
    credentials: OptionalBearerDep,
    pool: PoolDep,
) -> UserResponse | None:
    if not credentials:
        return None
    token = credentials.credentials
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT u.*
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = $1::uuid
              AND s.is_active = TRUE
              AND s.expires_at > NOW()
            """,
            token,
        )
    if not row:
        return None
    return UserResponse(**dict(row))


OptionalCurrentUserDep = Annotated[
    UserResponse | None, Depends(get_optional_current_user)
]
