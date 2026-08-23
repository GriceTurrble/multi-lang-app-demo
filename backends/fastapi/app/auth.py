from __future__ import annotations

import dataclasses
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pgargs import Args

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


@dataclasses.dataclass(frozen=True)
class AuthenticatedSession:
    """An active session row paired with the user it authenticates."""

    id: UUID
    user: UserResponse


async def lookup_session(pool, token: str) -> AuthenticatedSession | None:
    """Resolve a raw Bearer token to an active, unexpired session.

    Returns `None` for anything that is not a usable session token, including
    tokens that are not well-formed UUIDs. Callers decide whether that is a 401
    or simply an anonymous request.
    """
    try:
        session_id = UUID(token)
    except ValueError:
        return None

    args = Args(session_id=session_id)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            SELECT u.*
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = {args.session_id}
              AND s.is_active = TRUE
              AND s.expires_at > NOW()
            """,
            *args,
        )
    if not row:
        return None
    return AuthenticatedSession(id=session_id, user=UserResponse(**dict(row)))


async def get_current_session(
    credentials: BearerDep,
    pool: PoolDep,
) -> AuthenticatedSession:
    session = await lookup_session(pool, credentials.credentials)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return session


CurrentSessionDep = Annotated[AuthenticatedSession, Depends(get_current_session)]


async def get_current_user(session: CurrentSessionDep) -> UserResponse:
    return session.user


CurrentUserDep = Annotated[UserResponse, Depends(get_current_user)]


async def get_optional_current_user(
    credentials: OptionalBearerDep,
    pool: PoolDep,
) -> UserResponse | None:
    if not credentials:
        return None
    session = await lookup_session(pool, credentials.credentials)
    return session.user if session is not None else None


OptionalCurrentUserDep = Annotated[
    UserResponse | None, Depends(get_optional_current_user)
]
