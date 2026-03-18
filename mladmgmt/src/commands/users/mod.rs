pub mod create;

use crate::context::Context;
use anyhow::Result;
use clap::{Args, Subcommand};

#[derive(Subcommand)]
pub enum UsersCommands {
    /// Interactively create a new user.
    Create(create::Create),
}

#[derive(Args)]
pub struct Users {
    #[command(subcommand)]
    pub command: UsersCommands,
}

impl Users {
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        match &self.command {
            UsersCommands::Create(cmd) => cmd.run(ctx).await,
        }
    }
}
