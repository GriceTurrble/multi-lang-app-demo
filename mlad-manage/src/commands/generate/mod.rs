pub mod adr;

use anyhow::Result;
use clap::{Args, Subcommand};

#[derive(Subcommand)]
pub enum GenerateCommands {
    /// Create a new ADR file from the template.
    Adr(adr::Adr),
}

/// Arguments for the `generate` subcommand group.
#[derive(Args)]
pub struct Generate {
    #[command(subcommand)]
    pub command: GenerateCommands,
}

impl Generate {
    /// Dispatch to the selected generate subcommand.
    pub fn run(&self) -> Result<()> {
        match &self.command {
            GenerateCommands::Adr(cmd) => cmd.run(),
        }
    }
}
