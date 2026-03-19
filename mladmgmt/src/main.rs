#![doc = include_str!("../README.md")]

mod commands;
mod config;
mod context;

use anyhow::Result;
use clap::Parser;
use commands::Commands;
use config::Config;
use context::Context;

/// Top-level CLI arguments parsed by Clap.
#[derive(Parser)]
#[command(name = "mgmt", about = "Management CLI for multi-lang-app-demo")]
struct Cli {
    /// Override the DATABASE_URL environment variable.
    #[arg(long, global = true, env = "DATABASE_URL")]
    database_url: Option<String>,

    #[command(subcommand)]
    command: Commands,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let config = Config::load(cli.database_url)?;

    match &cli.command {
        Commands::Check(cmd) => cmd.run(),
        Commands::Generate(cmd) => cmd.run(),
        Commands::Db(cmd) => {
            let ctx = Context::new(config).await?;
            cmd.run(&ctx).await
        }
        Commands::Users(cmd) => {
            let ctx = Context::new(config).await?;
            cmd.run(&ctx).await
        }
    }
}
