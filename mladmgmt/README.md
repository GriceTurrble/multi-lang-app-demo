# mladmgmt

A CLI management tool written in Rust for managing database state for the multi-lang-app-demo app, independent from other backends.

## Requirements

- Rust toolchain (see [rustup])
- [just] (optional, for Justfile recipes)
- A running PostgreSQL instance

## Configuration

The tool reads configuration from environment variables or a `.env` file in the `mladmgmt/` directory.

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/testdb` |

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
just build         # builds release binary and copies to bin/mladmgmt
just run [command] # runs bin/mladmgmt (builds if missing)
# or
./bin/mladmgmt [command]
```

**Tests:**

```bash
just test
# or
cargo test
```

## Global Flags

These flags apply to all commands:

| Flag | Description | Default |
|---|---|---|
| `--database-url <URL>` | Override the `DATABASE_URL` environment variable | — |

## Commands

### `db` — Database Management

#### `db load-schema`

Apply `schema.sql` to the database. Fails if the schema appears already loaded (i.e., the first table already exists), unless `--force` is used.

```bash
just run db load-schema [OPTIONS]
```

| Option | Description | Default |
|---|---|---|
| `--schema-file <PATH>` | Path to schema SQL file | `../database_schema/schema.sql` |
| `-y, --yes` | Skip confirmation prompt | — |
| `--force` | Drop and reload even if schema already appears loaded | — |

#### `db reload-schema`

Alias for `load-schema --force`. Drops and reloads the schema unconditionally.

```bash
just run db reload-schema [OPTIONS]
```

| Option | Description | Default |
|---|---|---|
| `--schema-file <PATH>` | Path to schema SQL file | `../database_schema/schema.sql` |
| `-y, --yes` | Skip confirmation prompt | — |

#### `db load-fixtures`

Load fixture data from `fixtures.sql` into the current schema.

```bash
just run db load-fixtures [OPTIONS]
```

| Option | Description | Default |
|---|---|---|
| `--fixtures-file <PATH>` | Path to fixtures SQL file | `../database_schema/fixtures.sql` |

#### `db refresh-db`

Reload the schema then load fixtures in one step. Equivalent to running `reload-schema` followed by `load-fixtures`.

```bash
just run db refresh-db [OPTIONS]
```

| Option | Description | Default |
|---|---|---|
| `--schema-file <PATH>` | Path to schema SQL file | `../database_schema/schema.sql` |
| `--fixtures-file <PATH>` | Path to fixtures SQL file | `../database_schema/fixtures.sql` |
| `-y, --yes` | Skip confirmation prompt | — |

---

### `users` — User Management

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
```

[just]: https://github.com/casey/just
[rustup]: https://rustup.rs/
