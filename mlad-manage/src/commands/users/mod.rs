pub mod create;

use crate::context::Context;
use anyhow::Result;
use clap::{Args, Subcommand};

#[derive(Subcommand)]
pub enum UsersCommands {
    /// Interactively create a new user.
    Create(create::Create),
}

/// Arguments for the `users` subcommand group.
#[derive(Args)]
pub struct Users {
    #[command(subcommand)]
    pub command: UsersCommands,
}

impl Users {
    /// Dispatch to the selected user subcommand.
    pub fn run(&self, ctx: &mut Context) -> Result<()> {
        match &self.command {
            UsersCommands::Create(cmd) => cmd.run(&mut ctx.conn),
        }
    }
}
