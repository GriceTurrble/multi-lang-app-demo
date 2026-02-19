from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import close_pool, init_pool
from app.routers import ALL_ROUTERS


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


def get_app():
    app = FastAPI(
        title="FastAPI Reddit-like Backend",
        version="0.1.0",
        docs_url="/docs",
        lifespan=lifespan,
    )

    for router in ALL_ROUTERS:
        app.include_router(router)

    return app
