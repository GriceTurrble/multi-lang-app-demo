use anyhow::Result;
use diesel::PgConnection;
use diesel::prelude::*;
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

/// Open a synchronous Postgres connection to `database_url`.
pub fn establish_connection(database_url: &str) -> Result<PgConnection> {
    PgConnection::establish(database_url).map_err(|e| anyhow::anyhow!(e))
}

/// Run all pending migrations.
pub fn run_pending_migrations(conn: &mut PgConnection) -> Result<()> {
    conn.run_pending_migrations(MIGRATIONS)
        .map(|_| ())
        .map_err(|e| anyhow::anyhow!(e))
}

/// Revert the most recently applied migration.
pub fn revert_last_migration(conn: &mut PgConnection) -> Result<()> {
    conn.revert_last_migration(MIGRATIONS)
        .map(|_| ())
        .map_err(|e| anyhow::anyhow!(e))
}
