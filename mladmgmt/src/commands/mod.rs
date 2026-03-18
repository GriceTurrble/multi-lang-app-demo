pub mod db;
pub mod users;

use crate::context::Context;
use anyhow::Result;
use clap::Subcommand;

#[derive(Subcommand)]
pub enum Commands {
    /// Database management commands.
    Db(db::Db),
    /// User management commands.
    Users(users::Users),
}

impl Commands {
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        match self {
            Commands::Db(cmd) => cmd.run(ctx).await,
            Commands::Users(cmd) => cmd.run(ctx).await,
        }
    }
}
