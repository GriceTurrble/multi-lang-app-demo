pub mod load_fixtures;
pub mod reload_schema;

use crate::context::Context;
use anyhow::Result;
use clap::{Args, Subcommand};

#[derive(Subcommand)]
pub enum DbCommands {
    /// Drop and recreate the public schema, then re-apply schema.sql.
    ReloadSchema(reload_schema::ReloadSchema),
    /// Load fixture data from fixtures.sql into the current schema.
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
