# Integration tests

Integration tests ensure the overall app works as intended, using simulated user interactions via [Playwright].
Unlike unit tests, these tests exercise the full application stack, from frontend interactions to backend responses
and the database queries that drive those responses.

## How they work

Tests are written in TypeScript using the Playwright test runner and live in the [tests/](tests/) directory.

Running `just test` in this directory (or `just integration test` from the project root) spins up an isolated
version of the application in Docker Compose along with a non-persisted Postgres database, then executes the
test suite against it. This allows tests to run cleanly in CI without any external state.

> [!NOTE]
> Tests can also be run using the [Playwright VS Code extension], so long as the application is already started
> via `just up` in a separate terminal tab before running tests.
>
> For more details see the [Playwright VS Code extension docs][playwright-vscode-docs].

[playwright]: https://playwright.dev/
[playwright vs code extension]: https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright
[playwright-vscode-docs]: https://playwright.dev/docs/getting-started-vscode
