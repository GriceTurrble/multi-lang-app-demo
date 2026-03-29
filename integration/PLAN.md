# Integration Testing Plan

## Goals

Integration tests serve as **acceptance criteria** for the application as a whole.
Because MLAD is designed to swap backend implementations behind the same frontend and API contract,
integration tests need to verify behavior at the system boundary — through the Nginx proxy —
rather than against any individual service.

This makes them the natural home for cross-backend regression testing:
any new backend implementation must pass the same suite before it can be considered complete.

## Technology: Playwright

Playwright is the chosen framework for browser-based end-to-end testing.
It runs against the real application stack in a real browser,
allowing tests to assert on actual rendered output rather than mocked state.

Key properties that make it well-suited here:

- TypeScript-native, consistent with the existing frontend tooling
- Supports multiple browsers (Chromium, Firefox, WebKit)
- Built-in support for waiting on network and DOM state
- Straightforward CI integration via Docker or GitHub Actions runner

## Test Environment

Tests run against a **test-specific Docker Compose stack** defined in `compose.test.yaml`
at the repository root. This stack is self-contained and does not require Tilt.

The entry point is the Nginx reverse proxy at `http://localhost:8080`,
which routes requests to the active frontend and backend services.

No mock servers or isolated service targets are used.
If a service is not running, tests will fail — this is intentional.

### Why not Tilt?

Tilt is optimized for interactive development (live reload, manual triggers, a web UI).
For automated testing, a plain Docker Compose file is simpler, reproducible,
and straightforward to run in CI without extra tooling.

The one thing Tilt provides that plain Compose does not is schema loading —
Tilt uses a `local_resource` to `docker exec` into the Postgres container and pipe in `schema.sql`.
In the test stack this is handled instead by Postgres's built-in initialization mechanism
(see below).

### compose.test.yaml

`compose.test.yaml` differs from `compose.yaml` in a few ways:

- **Builds images directly** from their Dockerfiles (`prod-runner` target),
  rather than expecting Tilt to have already built them.
- **Postgres has no data volume**, so the container always starts with an empty database.
  `database_schema/schema.sql` is mounted into `/docker-entrypoint-initdb.d/` and applied
  automatically on startup.
- **pgadmin is omitted** — it is not needed for testing.
- **Environment variables are inlined** (or sourced from a dedicated `.env.test` file)
  so the stack can start without requiring developer-specific `.env` files to exist.

### Database state

Each test run starts from a clean schema with no data.
If a test requires fixture data, it is responsible for seeding it via the API
or a setup step — there is no global fixture load.
This keeps tests independent and avoids shared-state coupling between test cases.

### Base URL

```
http://localhost:8080
```

All Playwright tests are configured with this as the `baseURL`.
Individual tests use relative paths (e.g., `page.goto('/')`) so the base can be overridden
via environment variable when needed (e.g., staging environments).

### Backend selection

Because Nginx routes `/api/*` to the currently active backend,
switching which backend is under test requires only changing which backend service is running
in the Docker Compose stack. The tests themselves are backend-agnostic.

## Directory Structure

```
integration/
├── PLAN.md                  # This document
├── package.json             # Node dependencies (Playwright)
├── playwright.config.ts     # Playwright configuration
└── tests/
    └── home.spec.ts         # Initial smoke test: home page is shown

compose.test.yaml            # Test-specific Docker Compose stack (repo root)
```

## Initial Test: Home Page

The first test confirms that the application is up and serving the frontend home page.
This is the minimum viable check — if this fails, nothing else can be trusted.

**Test: `home.spec.ts`**

- Navigate to `/`
- Assert that the page loads without error
- Assert that a recognizable element of the home page is visible
  (e.g., the site header or a post listing container)

This test acts as the smoke test and will be the first to run in CI.

## Running the Tests

The canonical way to run integration tests is a single `just` recipe from the repo root:

```sh
just test-integration
```

This recipe does three things in sequence, using a bash shebang block so that `trap` ensures
the stack is torn down on exit — whether tests pass, fail, or the process is interrupted:

1. `docker compose -f compose.test.yaml up -d --build --wait` — builds images and starts the stack
2. `cd integration && npx playwright test` — runs the tests
3. `docker compose -f compose.test.yaml down --remove-orphans` — always runs via `trap EXIT`

### The `--wait` flag

`docker compose up --wait` blocks until all services report healthy via their `healthcheck`
definitions, then exits. Without it, Compose returns as soon as containers have started —
not when they are ready to serve traffic.

For `--wait` to be meaningful for every service, each service in `compose.test.yaml` should
define a `healthcheck`. Postgres already has one. Healthchecks for Nginx (and any backend)
will need to be added when writing `compose.test.yaml`.

## CI Integration

The test stack is self-contained, so CI only needs Docker (already available on GitHub-hosted runners).
The expected approach for the GitHub Actions workflow:

1. `docker compose -f compose.test.yaml up -d --build --wait`
2. `npx playwright install --with-deps chromium`
3. `npx playwright test` from the `integration/` directory
4. Upload the Playwright HTML report as an artifact on failure
5. `docker compose -f compose.test.yaml down`

This will be added as a new job (`test-integration`) in [`.github/workflows/ci.yaml`](../.github/workflows/ci.yaml),
gated behind the same draft-PR skip logic used by the other test jobs.

No Tilt, no extra tooling, no `.env` files required in CI.

## Next Steps

1. Write `compose.test.yaml` at the repo root
2. Initialize `package.json` and install Playwright in `integration/`
3. Write `playwright.config.ts` with `baseURL` and browser targets
4. Write the initial `home.spec.ts` smoke test
5. Verify the test passes against the test stack locally
6. Add the `test-integration` CI job
7. Expand test coverage as new features and backends are added
