# MLAD: multi-lang-app-demo

A playground for exploring different languages and frameworks by implementing the same application spec in each one.

## What is it?

The application is a barebones Reddit-like API:
users can create Posts,
leave Comments on those Posts,
reply to Comments,
and cast upvotes or downvotes on both Posts and Comments.

Every backend implementation follows the same [specification]
and exposes the same REST API, making each one a drop-in replacement for any other. A single shared Postgres instance handles data storage across all services, with the schema and stored functions defined once in [`database_schema/`](database_schema/).

The local development environment is orchestrated with [Tilt] and [Docker Compose],
providing live reloading and easy switching between backend services.

### Project structure

```
backends/       # One sub-directory per backend implementation
frontends/      # One sub-directory per frontend implementation (planned)
database_schema/# Shared Postgres schema, migrations, and fixture data
data/           # Supporting data files
```

### Backends

| Directory                    | Language | Framework |
| ---------------------------- | -------- | --------- |
| [`fastapi`][fastapi-backend] | Python   | FastAPI   |

### Frontends

*Coming soon*

### Goals

- Implement the same spec faithfully in each language and framework
- Highlight idiomatic differences in how each ecosystem approaches the same problem
- Keep each implementation self-contained and independently runnable
- Learn things
- Have fun
- ???
- Profit?

## Installation

### Languages

You'll want the following languages installed on your local machine *if* you want to develop and test code in your local environment:

- [Python] (3.14 or later)
- [Rust] (latest stable)

Otherwise, you are free to run processes via their Docker entrypoints.

*Dev container definitions coming soon*

### Tools

To get started, if using [Homebrew], you can install the tools listed in the [Brewfile] using the following command:

```sh
brew bundle install
```

Other, you can manually install each of the following:

- [just] - command runner used to manage pretty much everything in the project
- [pre-commit] - a framework for tools used to check code quality
- [uv] - [Python] package manager and workspace tool

You will also need:

- Docker, particularly [Docker Compose]
    - recommendation: install Docker Desktop to install Docker, Compose, and other tools together
- [Tilt] to orchestrate the full application on your local machine
    - recommendation: follow their installation instructions, including the setup for Kubernetes in Docker)

## Usage
### First start up
Make a copy of the different `.env.example` files in each service:

- Root [`.env.example`](.env.example)
- Backends:
    - FastAPI: [`backends/fastapi/.env.example`](backends/fastapi/.env.example)

Rename these copies to `.env` to store local environment variables.

> [!note]
> The defaults in each `.env.example` file should be sufficient in most cases,
> but I recommend *at least* changing the values of
> `PGADMIN_EMAIL` and `PGADMIN_PASSWORD`
> in the [root env file](.env.example).
> When you start the pgadmin interface,
> you will need to login with these credentials.
>
> Of course, you can just run whatever other application you want
> to access the postgres database
> exposed on port `5432`.

### Running with tilt

To start all services at once, simply run:

```sh
tilt up
```

**Tilt** runs everything configured in our [Tiltfile],
which essentially runs on top of Docker Compose
(using [compose.yaml]).
Resources are defined in the Docker Compose spec,
while Tilt provides some means for extra local resources,
such as migrating the shared [database schema](database_schema/schema.sql) automatically
and loading [fixture data](database_schema/fixtures.sql).

With `tilt up` running in a dedicated console, hit the `Space` key to open its web UI
and view the logs for each service.

Difference services also expose their ports independently,
and you can open them from the links provided in the UI.

### pgadmin

A [pgadmin] instance starts alongside the other services in this app,
which you can reach at http://localhost:5050
(or follow its link from the Tilt web UI).

The environment variables `PGADMIN_EMAIL` and `PGADMIN_PASSWORD`
(see [`.env.example`](.env.example))
define the login credentials for this interface.

[brewfile]: Brewfile
[compose.yaml]: compose.yaml
[database-schema]: database_schema/
[docker compose]: https://docs.docker.com/compose/install
[fastapi-backend]: backends/fastapi/
[homebrew]: https://brew.sh/
[just]: https://just.systems/man/en/introduction.html
[pgadmin]: https://www.pgadmin.org/
[pre-commit]: https://pre-commit.com
[python]: https://www.python.org/
[rust]: https://rust-lang.org/
[specification]: backends/SPEC.md
[tilt]: https://docs.tilt.dev/install.html
[tiltfile]: Tiltfile
[uv]: https://docs.astral.sh/uv/
