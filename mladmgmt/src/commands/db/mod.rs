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
