pub mod load_fixtures;
pub mod load_schema;
pub mod refresh_db;
pub mod reload_schema;

use crate::context::Context;
use anyhow::Result;
use clap::{Args, Subcommand};

#[derive(Subcommand)]
pub enum DbCommands {
    /// Apply schema.sql, failing if the schema already appears to be loaded. Use --force to override.
    LoadSchema(load_schema::LoadSchema),
    /// Alias for `load-schema --force`. Drops and reloads the schema unconditionally.
    ReloadSchema(reload_schema::ReloadSchema),
    /// Load fixture data from fixtures.sql into the current schema.
    LoadFixtures(load_fixtures::LoadFixtures),
    /// Reload schema then load fixtures in one step.
    RefreshDb(refresh_db::RefreshDb),
}

#[derive(Args)]
pub struct Db {
    #[command(subcommand)]
    pub command: DbCommands,
}

impl Db {
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        match &self.command {
            DbCommands::LoadSchema(cmd) => cmd.run(ctx).await,
            DbCommands::ReloadSchema(cmd) => cmd.run(ctx).await,
            DbCommands::LoadFixtures(cmd) => cmd.run(ctx).await,
            DbCommands::RefreshDb(cmd) => cmd.run(ctx).await,
        }
    }
}

#[cfg(test)]
pub mod test_helpers {
    use sqlx::PgPool;
    use std::path::PathBuf;

    pub fn schema_path() -> PathBuf {
        PathBuf::from("../database_schema/schema.sql")
    }

    pub fn fixtures_path() -> PathBuf {
        PathBuf::from("../database_schema/fixtures.sql")
    }

    /// Apply schema.sql directly to the pool without dropping first.
    /// Suitable for setting up fresh test databases from `#[sqlx::test]`.
    pub async fn apply_schema(pool: &PgPool) {
        let sql = std::fs::read_to_string(schema_path()).expect("Cannot read schema.sql");
        sqlx::raw_sql(&sql)
            .execute(pool)
            .await
            .expect("Failed to apply schema in test setup");
    }
}
