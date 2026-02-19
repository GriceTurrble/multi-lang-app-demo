load('ext://dotenv', 'dotenv')
# Load contents of `.env` automatically into the Tilt environment variables:
dotenv()

docker_compose('compose.yaml')

# Database
dc_resource(
    "postgres",
    labels=["database"],
)
dc_resource(
    "pgadmin",
    labels=["database"],
)
local_resource(
    "schema-load",
    cmd="docker exec -i postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < database_schema/schema.sql",
    resource_deps=["postgres"],
    labels=["database"],
)
local_resource(
    "fixture-load",
    cmd="docker exec -i postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < database_schema/fixtures.sql",
    resource_deps=["postgres", "schema-load"],
    labels=["database"],
)

# Backend services

# FastAPI backend service
dc_resource(
    "fastapi-backend",
    links=[
        link("http://localhost:8080", "Main"),
        link("http://localhost:8080/docs", "OpenAPI Docs"),
    ],
    labels=["backends"],
)
