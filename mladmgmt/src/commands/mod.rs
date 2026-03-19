pub mod db;
pub mod generate;
pub mod users;

use crate::context::Context;
use anyhow::Result;
use clap::Subcommand;

#[derive(Subcommand)]
pub enum Commands {
    /// Generate project artifacts (ADRs, etc.).
    #[command(alias = "gen")]
    Generate(generate::Generate),
    /// Database management commands.
    Db(db::Db),
    /// User management commands.
    Users(users::Users),
}

impl Commands {
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        match self {
            Commands::Generate(_) => unreachable!("generate commands are dispatched before DB init"),
            Commands::Db(cmd) => cmd.run(ctx).await,
            Commands::Users(cmd) => cmd.run(ctx).await,
        }
    }
}
