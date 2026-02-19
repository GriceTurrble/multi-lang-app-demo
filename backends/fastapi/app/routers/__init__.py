from .comments import router as comments_router
from .posts import router as posts_router
from .votes import router as votes_router

ALL_ROUTERS = [
    posts_router,
    comments_router,
    votes_router,
]
