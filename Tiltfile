load('ext://dotenv', 'dotenv')
# Load contents of `.env` automatically into the Tilt environment variables:
dotenv()

docker_compose('compose.yaml')

local_resource(
    "schema-load",
    cmd="docker exec -i postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < database_schema/schema.sql",
    resource_deps=["postgres"]
)
local_resource(
    "fixture-load",
    cmd="docker exec -i postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < database_schema/fixtures.sql",
    resource_deps=["postgres", "schema-load"]
)
