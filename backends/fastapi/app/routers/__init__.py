from .comments import router as comments_router
from .health import router as health_router
from .posts import router as posts_router
from .votes import router as votes_router

ALL_ROUTERS = [
    health_router,
    posts_router,
    comments_router,
    votes_router,
]
