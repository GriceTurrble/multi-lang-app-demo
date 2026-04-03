# mlad-manage - CLI for management tasks across the project

A CLI management tool written in Rust for managing database state for the multi-lang-app-demo app, independent from other backends.

## Requirements

- Rust toolchain (see [rustup])
- [just] (optional, for Justfile recipes)
- A running PostgreSQL instance

## Configuration

The tool reads configuration from environment variables or a `.env` file in the `mlad-manage/` directory.

| Variable       | Description                  | Default                                              |
| -------------- | ---------------------------- | ---------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/mlad` |

`DATABASE_URL` can also be overridden at runtime with the `--database-url` flag (see [Global Flags](#global-flags)).

## Building and Running

**Development (via `cargo run`):**

```bash
just run-dev [command]
# or
cargo run -- [command]
```

**Production (pre-built binary):**

```bash
just build         # builds release binary and copies to `bin/`
just run [command] # runs a command in release binary `bin/mlad-manage` (builds if missing)
# or
./bin/mlad-manage [command]
```

**Tests:**

```bash
just test
# or
cargo test
```

**One-time setup** - install `diesel_cli` (required to generate new migrations):

```bash
just bootstrap
```

**Justfile shortcuts** (aliases for common commands using the release binary):

| Shortcut             | Equivalent                  |
| -------------------- | --------------------------- |
| `just migrate`       | `just run db migrate run`   |
| `just load-fixtures` | `just run db load-fixtures` |
| `just check`         | `just run check`            |

## Global Flags

These flags apply to all commands:

| Flag                   | Description                                      | Default |
| ---------------------- | ------------------------------------------------ | ------- |
| `--database-url <URL>` | Override the `DATABASE_URL` environment variable | -       |

## Commands

### `generate` (`gen`) - Generators

> These commands do not require a database connection.

#### `generate adr`

Create a new ADR file from [docs/adrs/TEMPLATE.md](../docs/adrs/TEMPLATE.md).
Scans the ADR directory for existing numbered files, determines the next number in sequence, and writes a new file with status `Draft`.
Errors if any two existing files share the same 4-digit number prefix.

```bash
just run-dev generate adr "Title of the Decision" [OPTIONS]
# or
just run-dev gen adr "Title of the Decision" [OPTIONS]
```

| Option              | Description               | Default        |
| ------------------- | ------------------------- | -------------- |
| `--adrs-dir <PATH>` | Path to the ADR directory | `../docs/adrs` |

______________________________________________________________________

### `db` - Database Management

#### `db migrate` - Migrations

Wraps [Diesel] migrations. Requires `diesel_cli` to be installed (see `just bootstrap` above).

##### `db migrate run`

Run all pending migrations.

```bash
just run db migrate run
```

##### `db migrate revert`

Revert the most recently applied migration.

```bash
just run db migrate revert
```

##### `db migrate redo`

Revert and re-run the most recently applied migration.

```bash
just run db migrate redo
```

______________________________________________________________________

#### `db load-fixtures`

Load fixture data from `fixtures.sql` into the current schema.

```bash
just run db load-fixtures [OPTIONS]
```

| Option                   | Description               | Default                      |
| ------------------------ | ------------------------- | ---------------------------- |
| `--fixtures-file <PATH>` | Path to fixtures SQL file | `./db_fixtures/fixtures.sql` |

______________________________________________________________________

### `check` - Management Checks

Run integrity checks against project assets. When invoked without a subcommand, all registered checks are run in parallel.

```bash
just run check [SUBCOMMAND]
```

Output follows the format:

```
>> <check-name>......................................................PASSED
>> <check-name>......................................................FAILED
   - <failure detail>
```

#### `check adr`

Check ADR file compliance. Verifies:

- **No duplicate IDs** - no two files share the same 4-digit number prefix.
- **No gaps in sequence** - ADR IDs form a contiguous sequence starting from `0001`.

```bash
just run check adr [OPTIONS]
```

| Option              | Description               | Default        |
| ------------------- | ------------------------- | -------------- |
| `--adrs-dir <PATH>` | Path to the ADR directory | `../docs/adrs` |

______________________________________________________________________

### `users` - User Management

#### `users create`

Interactively create a new user. Prompts for email, username, and password (hidden input). Passwords are hashed with Argon2 before storage.

```bash
just run users create
```

No flags or arguments. Prompts:

- **Email**
- **Username**
- **Password** (hidden)

## Examples

```bash
# Run all pending migrations
just run db migrate run

# Revert the last migration
just run db migrate revert

# Load fixture data
just run db load-fixtures

# Create a new user interactively
just run users create

# Run all checks
just run check

# Run only the ADR check
just run check adr

# Run ADR check against a non-default directory
just run check adr --adrs-dir /path/to/docs/adrs

# Create a new ADR
just run generate adr "My Architecture Decision"

# Create a new ADR using the short alias
just run gen adr "My Architecture Decision"

# Create a new ADR targeting a non-default directory
just run gen adr "My Architecture Decision" --adrs-dir /path/to/docs/adrs
```

[diesel]: https://diesel.rs/
[just]: https://github.com/casey/just
[rustup]: https://rustup.rs/
