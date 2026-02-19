from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

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


@app.exception_handler(RequestValidationError)
async def vote_validation_handler(request, exc):
    """Return 400 instead of 422 for vote endpoint validation errors."""
    if request.url.path.endswith("/vote"):
        return JSONResponse(status_code=400, content={"detail": str(exc)})
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(votes.router)
