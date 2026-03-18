# Rust CLI Management Tool - Proposal

## Overview

A standalone Rust binary (`mgmt`) providing subcommands for common database
management tasks. It lives in `mgmt/` as its own Cargo project and connects
directly to PostgreSQL - no dependency on any backend service.

---

## Subcommands

### `mgmt db reload-schema`

Drops all objects in the public schema and re-executes
`database_schema/schema.sql`. Useful during active schema development.

Steps:
1. Connect to the database.
2. Execute `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` to wipe state.
3. Read and execute `database_schema/schema.sql`.

### `mgmt db load-fixtures`

Loads fixture data from `database_schema/fixtures.sql` into the current
database state. Assumes the schema is already applied.

Steps:
1. Connect to the database.
2. Read and execute `database_schema/fixtures.sql`.

### `mgmt users create`

Interactively creates a new user record in the database.

Steps:
1. Prompt for: email, username, password (hidden input).
2. Hash the password using Argon2id (matching the FastAPI backend's primary scheme).
3. Generate a UUID v7 for the new user.
4. Insert the record into the `users` table.
5. Print the new user's id and username on success.

---

## Configuration

The tool reads database connection details from environment variables,
with `.env` file support (loaded from the working directory or project root).

| Variable       | Default                                                | Description         |
| -------------- | ------------------------------------------------------ | ------------------- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/testdb` | Full connection URL |

The tool should also accept `--database-url` as a CLI flag to override the
environment variable without modifying the `.env` file.

---

## Crate Dependencies

| Crate       | Purpose                                          |
| ----------- | ------------------------------------------------ |
| `clap`      | CLI argument and subcommand parsing (derive API) |
| `tokio`     | Async runtime                                    |
| `sqlx`      | PostgreSQL driver with async support             |
| `argon2`    | Password hashing (Argon2id, matches backend)     |
| `uuid`      | UUID generation with v7 support                  |
| `dotenvy`   | `.env` file loading                              |
| `rpassword` | Hidden password prompt (no echo to terminal)     |

---

## Command Architecture

Commands are organized as a file-per-subcommand module tree. The rules are:

- **Each file** in `commands/` defines exactly one subcommand by exposing an
  `Args` struct (via `#[derive(Args)]`) and a `run()` method on it.
- **Each directory** in `commands/` represents a command group. Its `mod.rs`
  defines a `#[derive(Subcommand)]` enum that lists the child modules as
  variants, plus an outer `Args` struct that holds the subcommand enum.
  The group's `Args` also implements `run()`, dispatching to the matched child.
- This nesting is **recursive**: a directory can contain both leaf files and
  further subdirectories, each following the same pattern.

Adding a new command means adding one file (and registering it in the parent
`mod.rs`) - nothing else changes.

### Sketch

```rust
// commands/db/reload_schema.rs  - a leaf command
#[derive(Args)]
pub struct ReloadSchema { /* flags */ }
impl ReloadSchema {
    pub async fn run(&self, ctx: &Context) -> Result<()> { ... }
}

// commands/db/mod.rs  - a command group
#[derive(Subcommand)]
pub enum DbCommands {
    ReloadSchema(reload_schema::ReloadSchema),
    LoadFixtures(load_fixtures::LoadFixtures),
}
#[derive(Args)]
pub struct Db {
    #[command(subcommand)]
    pub command: DbCommands,
}
impl Db {
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        match &self.command {
            DbCommands::ReloadSchema(cmd) => cmd.run(ctx).await,
            DbCommands::LoadFixtures(cmd) => cmd.run(ctx).await,
        }
    }
}

// commands/mod.rs  - root subcommand enum
#[derive(Subcommand)]
pub enum Commands {
    Db(db::Db),
    Users(users::Users),
}
```

---

## Project Layout

```
mgmt/
├── Cargo.toml
├── PROPOSAL.md
├── README.md
└── src/
    ├── main.rs              # Entry point; top-level Cli struct and dispatch
    ├── config.rs            # Config struct; reads DATABASE_URL from env
    ├── context.rs           # Context passed to every run(); holds pool + config
    └── commands/
        ├── mod.rs           # Root Commands enum (Db, Users, ...)
        ├── db/
        │   ├── mod.rs       # Db group: DbCommands enum + Db Args + run()
        │   ├── reload_schema.rs
        │   └── load_fixtures.rs
        └── users/
            ├── mod.rs       # Users group: UsersCommands enum + Users Args + run()
            └── create.rs
```

---

## Notes

- Path resolution for SQL files (`schema.sql`, `fixtures.sql`) will be relative
  to the project root. The tool will look for them at
  `../database_schema/schema.sql` relative to the binary's working directory,
  with an option to override via `--schema-file` / `--fixtures-file` flags.
- Schema reload is intentionally destructive. The CLI will print a warning and
  require `--yes` (or `-y`) to confirm before executing.
- Password hashing uses **Argon2id** to match the FastAPI backend's primary
  scheme, ensuring users created via this tool can authenticate through the API.
