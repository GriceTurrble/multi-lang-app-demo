from typing import Annotated

import asyncpg
from fastapi import Depends

from app.config import get_settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool  # noqa: PLW0603

    settings = get_settings()
    _pool = await asyncpg.create_pool(
        dsn=settings.db_connection_url,
        min_size=settings.db_min_connections,
        max_size=settings.db_max_connections,
    )


async def close_pool() -> None:
    if _pool:
        await _pool.close()


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized")
    return _pool


PoolDep = Annotated[asyncpg.Pool, Depends(get_pool)]
