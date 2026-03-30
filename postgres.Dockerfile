# Wrapper for the postgres image that injects our schema and fixtures automatically

ARG load_fixtures=false

# Base image
FROM postgres:18 AS base

# Copies schema.sql to use as a startup script
# See: https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/
COPY mlad-db/schema.sql /docker-entrypoint-initdb.d/01_schema.sql

# Fixture loading when `load_fixtures` arg is "true"
FROM base AS fixtures-true
COPY mlad-db/fixtures.sql /docker-entrypoint-initdb.d/02_fixtures.sql

# Default when `load_fixtures` is "false"
FROM base AS fixtures-false

# Final stage, selects the fixture loading based on the arg.
FROM fixtures-${load_fixtures}
