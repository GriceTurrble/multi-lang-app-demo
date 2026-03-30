load('ext://dotenv', 'dotenv')
# Load contents of `.env` automatically into the Tilt environment variables:
dotenv()

docker_compose('compose.yaml')

# Database
dc_resource(
    "postgres",
    labels=["database"],
    links=[
        link("http://localhost:5432", "postgres"),
    ],
    infer_links=False,
)
local_resource(
    "db-migrate",
    cmd="just manage run db migrate run",
    resource_deps=["postgres"],
    labels=["manage"],
)
local_resource(
    "db-load-fixtures",
    cmd="just manage run db load-fixtures",
    resource_deps=["postgres", "db-migrate"],
    labels=["manage"],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
)
dc_resource(
    "pgadmin",
    labels=["database"],
    links=[
        link("http://localhost:5050", "pgAdmin"),
    ],
    infer_links=False,
)

# Nginx
dc_resource(
    "nginx",
    links=[
        link("http://localhost:8080", "Frontend"),
        link("http://localhost:8080/api/docs", "API Docs"),
    ],
    infer_links=False,
    labels=["nginx"],
)


## Frontend services ##
# NextJS
docker_build(
    "frontend-nextjs",
    "./frontends/nextjs/",
    target="dev-runner",
    live_update=[
        # Copy file changes into the container
        sync("./frontends/nextjs", "/app"),
        # install any new dependencies
        run("npm i", trigger=["package.json", "package-lock.json"]),
        # force a restart of the
        restart_container(),
    ],
)
dc_resource(
    "frontend-nextjs",
    links=[
        link("http://localhost:8080", "Frontend"),
    ],
    infer_links=False,
    labels=["frontends"],
)


## Backend services ##
# FastAPI
docker_build(
    "backend-fastapi",
    "./backends/fastapi/",
    target="dev-runner",
    live_update=[
        # Copy file changes into the container
        sync("./backends/fastapi", "/app"),
        # install any new dependencies
        run("uv sync --locked", trigger=["pyproject.toml", "uv.lock"]),
        # uvicorn --reload watcher auto-restarts server
    ],
)
dc_resource(
    "backend-fastapi",
    links=[
        link("http://localhost:8080/api/docs", "OpenAPI Docs"),
    ],
    infer_links=False,
    labels=["backends"],
)
