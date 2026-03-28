from __future__ import annotations

import datetime

import asyncpg
from fastapi import APIRouter, HTTPException, status
from pgargs import Args, Cols

from app.auth import BearerDep, CurrentUserDep, hash_password, verify_password
from app.config import SettingsDep
from app.db import PoolDep
from app.models import LoginRequest, TokenResponse, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(pool: PoolDep, payload: UserCreate):
    try:
        cols = Cols(
            email=payload.email,
            username=payload.username,
            passwrd=hash_password(payload.password),
        )
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                f"""
                INSERT INTO users {cols.names}
                VALUES {cols.values}
                RETURNING *
                """,
                *cols.args,
            )
    except asyncpg.UniqueViolationError as err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already registered",
        ) from err
    return UserResponse(**dict(row))


@router.post("/login", response_model=TokenResponse)
async def login(pool: PoolDep, settings: SettingsDep, payload: LoginRequest):
    select_args = Args(email=payload.email)
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            f"SELECT * FROM users WHERE email = {select_args.email}",
            *select_args,
        )
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_at = datetime.datetime.now(datetime.UTC) + datetime.timedelta(
        days=settings.session_expire_days
    )
    insert_cols = Cols(user_id=user["id"], expires_at=expires_at)
    async with pool.acquire() as conn:
        session = await conn.fetchrow(
            f"""
            INSERT INTO sessions {insert_cols.names}
            VALUES {insert_cols.values}
            RETURNING *
            """,
            *insert_cols.args,
        )
    return TokenResponse(
        access_token=str(session["id"]),
        user=UserResponse(**dict(user)),
    )


@router.post("/logout", status_code=204)
async def logout(pool: PoolDep, credentials: BearerDep):
    args = Args(token=credentials.credentials)
    async with pool.acquire() as conn:
        await conn.execute(
            f"UPDATE sessions SET is_active = FALSE WHERE id = {args.token}::uuid",
            *args,
        )


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUserDep):
    return current_user
