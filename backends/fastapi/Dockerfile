FROM python:3.14-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.10.3 /uv /uvx /bin/

# Compile Python files to bytecode for faster startup
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
# Disable development dependencies
ENV UV_NO_DEV=1

WORKDIR /app

# Copy lockfile and project config first for layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project

# Copy application source
COPY app/ ./app/

# Sync the project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked

# Uvicorn settings via env variables (to avoid cluttering the CMDs):
ENV UVICORN_HOST=0.0.0.0
ENV UVICORN_PORT=8080
ENV UVICORN_FACTORY=1

EXPOSE 8080

FROM builder AS dev-runner

CMD ["uv", "run", "uvicorn", "app.main:get_app", "--reload"]

FROM builder AS prod-runner

CMD ["uv", "run", "uvicorn", "app.main:get_app"]
