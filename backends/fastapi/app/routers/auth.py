from __future__ import annotations

import datetime

import asyncpg
from fastapi import APIRouter, HTTPException, status

from app.auth import BearerDep, CurrentUserDep, hash_password, verify_password
from app.config import SettingsDep
from app.db import PoolDep
from app.models import LoginRequest, TokenResponse, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(pool: PoolDep, payload: UserCreate):
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO users (email, username, password_hash)
                VALUES ($1, $2, $3)
                RETURNING *
                """,
                payload.email,
                payload.username,
                hash_password(payload.password),
            )
    except asyncpg.UniqueViolationError as err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already registered",
        ) from err
    return UserResponse(**dict(row))


@router.post("/login", response_model=TokenResponse)
async def login(pool: PoolDep, settings: SettingsDep, payload: LoginRequest):
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE email = $1",
            payload.email,
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
    async with pool.acquire() as conn:
        session = await conn.fetchrow(
            "INSERT INTO sessions (user_id, expires_at) VALUES ($1, $2) RETURNING *",
            user["id"],
            expires_at,
        )
    return TokenResponse(
        access_token=str(session["id"]),
        user=UserResponse(**dict(user)),
    )


@router.post("/logout", status_code=204)
async def logout(pool: PoolDep, credentials: BearerDep):
    token = credentials.credentials
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE sessions SET is_active = FALSE WHERE id = $1::uuid",
            token,
        )


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUserDep):
    return current_user
