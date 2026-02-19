from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import close_pool, init_pool
from app.routers import comments, posts, votes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(
    title="FastAPI Reddit-like Backend",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)


app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(votes.router)
