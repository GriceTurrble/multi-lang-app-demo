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

#### `db load-schema`

Apply `schema.sql` to the database. Fails if the schema appears already loaded (i.e., the first table already exists), unless `--force` is used.

```bash
just run db load-schema [OPTIONS]
```

| Option                 | Description                                           | Default                  |
| ---------------------- | ----------------------------------------------------- | ------------------------ |
| `--schema-file <PATH>` | Path to schema SQL file                               | `../database/schema.sql` |
| `-y, --yes`            | Skip confirmation prompt                              | -                        |
| `--force`              | Drop and reload even if schema already appears loaded | -                        |

#### `db reload-schema`

Alias for `load-schema --force`. Drops and reloads the schema unconditionally.

```bash
just run db reload-schema [OPTIONS]
```

| Option                 | Description              | Default                  |
| ---------------------- | ------------------------ | ------------------------ |
| `--schema-file <PATH>` | Path to schema SQL file  | `../database/schema.sql` |
| `-y, --yes`            | Skip confirmation prompt | -                        |

#### `db load-fixtures`

Load fixture data from `fixtures.sql` into the current schema.

```bash
just run db load-fixtures [OPTIONS]
```

| Option                   | Description               | Default                    |
| ------------------------ | ------------------------- | -------------------------- |
| `--fixtures-file <PATH>` | Path to fixtures SQL file | `../database/fixtures.sql` |

#### `db refresh-db`

Reload the schema then load fixtures in one step. Equivalent to running `reload-schema` followed by `load-fixtures`.

```bash
just run db refresh-db [OPTIONS]
```

| Option                   | Description               | Default                    |
| ------------------------ | ------------------------- | -------------------------- |
| `--schema-file <PATH>`   | Path to schema SQL file   | `../database/schema.sql`   |
| `--fixtures-file <PATH>` | Path to fixtures SQL file | `../database/fixtures.sql` |
| `-y, --yes`              | Skip confirmation prompt  | -                          |

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

#### `check adrs`

Check ADR file compliance. Verifies:

- **No duplicate IDs** - no two files share the same 4-digit number prefix.
- **No gaps in sequence** - ADR IDs form a contiguous sequence starting from `0001`.

```bash
just run check adrs [OPTIONS]
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
# Full database reset with fixtures (skip confirmation)
just run db refresh-db --yes

# Load only the schema (prompt for confirmation)
just run db load-schema

# Force reload schema from a custom path
just run db reload-schema --yes --schema-file /path/to/schema.sql

# Create a new user interactively
just run users create

# Run all checks
just run check

# Run only the ADR check
just run check adrs

# Run ADR check against a non-default directory
just run check adrs --adrs-dir /path/to/docs/adrs

# Create a new ADR
just run generate adr "My Architecture Decision"

# Create a new ADR using the short alias
just run gen adr "My Architecture Decision"

# Create a new ADR targeting a non-default directory
just run gen adr "My Architecture Decision" --adrs-dir /path/to/docs/adrs
```

[just]: https://github.com/casey/just
[rustup]: https://rustup.rs/
