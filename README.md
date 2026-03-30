# MLAD: multi-lang-app-demo

A playground for exploring different languages and frameworks by implementing the same application spec in each one.

## What is it?

The application is a barebones Reddit-like API:
users can create Posts,
leave Comments on those Posts,
reply to Comments,
and cast upvotes or downvotes on both Posts and Comments.

Every backend implementation follows the same [specification](backends/SPEC.md)
and exposes the same REST API, making each one a drop-in replacement for any other.

A single shared Postgres instance handles data storage across all services.
The schema and stored functions are maintained by a local Rust crate, [`mlad-db/`](mlad-db/).

The local development environment is orchestrated with [Tilt] and [Docker Compose],
providing live reloading and easy switching between backend services.

### Project structure

```
backends/     # One sub-directory per backend implementation
frontends/    # One sub-directory per frontend implementation
mlad-db/      # Rust crate used to manage database schema
mlad-manage/  # Rust crate used for general management commands across the project
integration/  # Playwright integration tests
data/         # Supporting data files
```

### Backends

| Directory                      | Language | Framework |
| ------------------------------ | -------- | --------- |
| [`fastapi`](backends/fastapi/) | Python   | FastAPI   |

### Frontends

| Directory                     | Language   | Framework |
| ----------------------------- | ---------- | --------- |
| [`nextjs`](frontends/nextjs/) | TypeScript | NextJs    |

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
- [Node] (25+)

Otherwise, you are free to run processes via their Docker entrypoints.

*Dev container definitions coming soon*

### Tools

To get started, if using [Homebrew], you can install the tools listed in the [Brewfile](Brewfile) using the following command:

```sh
brew bundle install
```

Otherwise, you can manually install each of the following:

- [just] - command runner used to manage pretty much everything in the project
- [pre-commit] - a framework for tools used to check code quality
- [uv] - [Python] package manager and workspace tool

You will also need:

- Docker, particularly [Docker Compose]
  - **recommendation**: install Docker Desktop to install Docker, Compose, and other tools together
- [Tilt] to orchestrate the full application on your local machine
  - **recommendation**: follow their installation instructions, including the setup for Kubernetes in Docker.

## Usage

### First start up

Make a copy of the different `.env.example` files in each service:

- Root [`.env.example`](.env.example)
- Backends:
  - FastAPI: [`backends/fastapi/.env.example`](backends/fastapi/.env.example)

Rename these copies to `.env` to store local environment variables.

> [!NOTE]
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

**Tilt** runs everything configured in our [Tiltfile](Tiltfile),
which essentially runs on top of Docker Compose
(using [compose.yaml](compose.yaml)).
Resources are defined in the Docker Compose spec,
while Tilt provides some means for extra local resources,
such as migrating the shared [database schema](database/schema.sql) automatically
and loading [fixture data](database/fixtures.sql).

With `tilt up` running in a dedicated console, hit the `Space` key to open its web UI
and view the logs for each service.

Different services also expose their ports independently,
and you can open them from the links provided in the UI.

### pgadmin

A [pgadmin] instance starts alongside the other services in this app,
which you can reach at http://localhost:5050
(or follow its link from the Tilt web UI).

The environment variables `PGADMIN_EMAIL` and `PGADMIN_PASSWORD`
(see [`.env.example`](.env.example))
define the login credentials for this interface.

## Testing

Please see [TESTING.md](TESTING.md) for details.

## Architecture Decision Records

Key design decisions are documented in [docs/adrs/](docs/adrs/).

## AI Usage Disclosure

Code in this repository was developed with AI assistance, however all code here is (eventually) reviewed by a human and continually refactored to improve quality, clarity, coherence, and idiomatic patterns in their respective frameworks.

This project is not intended to be deployed into any production environment.
Rather, it serves for education (of its author!) and demonstration.
If it *was* intended for production use, the author of this work would have much more strict guidelines here.

## AI Contributions

Any contributions to this repository should adhere to the same standard set by the above disclosure. Human contributors must always be directly accountable for the work committed.

Contributions suspected of being created and submitted solely by an AI agent will be summarily closed with a reminder about this standard.

[docker compose]: https://docs.docker.com/compose/install
[homebrew]: https://brew.sh/
[just]: https://just.systems/man/en/introduction.html
[node]: https://nodejs.org/en/download
[pgadmin]: https://www.pgadmin.org/
[pre-commit]: https://pre-commit.com
[python]: https://www.python.org/
[rust]: https://rust-lang.org/
[tilt]: https://docs.tilt.dev/install.html
[uv]: https://docs.astral.sh/uv/
