pub mod load_fixtures;
pub mod migrate;

use crate::context::Context;
use anyhow::Result;
use clap::{Args, Subcommand};

#[derive(Subcommand)]
pub enum DbCommands {
    /// Run, revert, or redo diesel migrations.
    Migrate(migrate::Migrate),
    /// Load fixture data from fixtures.sql into the current schema.
    LoadFixtures(load_fixtures::LoadFixtures),
}

/// Arguments for the `db` subcommand group.
#[derive(Args)]
pub struct Db {
    #[command(subcommand)]
    pub command: DbCommands,
}

impl Db {
    /// Dispatch to the selected database subcommand.
    pub fn run(&self, ctx: &mut Context) -> Result<()> {
        match &self.command {
            DbCommands::Migrate(cmd) => cmd.run(&ctx.database_url),
            DbCommands::LoadFixtures(cmd) => cmd.run(&mut ctx.conn),
        }
    }
}

#[cfg(test)]
pub mod test_helpers {
    use diesel::PgConnection;
    use diesel::prelude::*;
    use std::path::PathBuf;

    /// Canonical path to `fixtures.sql` relative to the workspace root.
    pub fn fixtures_path() -> PathBuf {
        PathBuf::from("./db_fixtures/fixtures.sql")
    }

    /// Open a connection to the test database.
    pub fn establish_test_conn() -> PgConnection {
        let url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/mlad".to_string());
        PgConnection::establish(&url).expect("Failed to connect to test database")
    }

    /// Run all pending migrations against `conn`.
    /// Suitable for use inside a `test_transaction` block.
    pub fn apply_migrations(conn: &mut PgConnection) {
        mlad_manage_db_lib::run_pending_migrations(conn)
            .expect("Failed to run migrations in test setup");
    }
}
