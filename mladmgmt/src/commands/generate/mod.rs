pub mod adr;

use anyhow::Result;
use clap::{Args, Subcommand};

#[derive(Subcommand)]
pub enum GenerateCommands {
    /// Create a new ADR file from the template.
    Adr(adr::Adr),
}

#[derive(Args)]
pub struct Generate {
    #[command(subcommand)]
    pub command: GenerateCommands,
}

impl Generate {
    pub fn run(&self) -> Result<()> {
        match &self.command {
            GenerateCommands::Adr(cmd) => cmd.run(),
        }
    }
}
