# Testing

This application includes several tests at different layers to ensure functionality
of both the individual applications (with **unit tests**) and that other versions of that app
function identically to each other (with **integration tests**).

## Unit tests

Individual applications - such as [backends/fastapi](backends/fastapi/) or [frontends/nextjs](frontends/nextjs) -
include unit tests to help ensure functionality of the app at a low level.
Tests in this category generally mock external dependencies (such as the database or the accompanying frontend/backend)
to simulate how the app should be used in isolation.

These tests help ensure that updates to code in the repo, as well as updates to project dependencies,
do not break overall functionality.

Tests run in CI as part of the [CI workflow](.github/workflows/ci.yaml).

Unit tests for an individual app are defined by that app's needs and ecosystem.
For instance, [backends/fastapi](backends/fastapi/) uses tests in Pytest that interact with the FastAPI `TestClient` instance
and send simulated requests to its endpoints, while mocking database responses, to ensure response shapes are accurate
and other computations are working as intended.

Meanwhile, [frontends/nextjs](frontends/nextjs) uses Vitest to ensure different frontend components behave as intended.

## Integration tests

At a higher level from individual apps, **integration tests** ensure the overall app works as intended
using simulated user interactions. See [integration/](integration/) for full details.
