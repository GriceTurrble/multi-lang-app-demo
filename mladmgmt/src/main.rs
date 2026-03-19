mod commands;
mod config;
mod context;

use anyhow::Result;
use clap::Parser;
use commands::Commands;
use config::Config;
use context::Context;

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

    // Dispatch commands that don't require a database connection before DB init.
    if let Commands::Generate(cmd) = &cli.command {
        return cmd.run();
    }

    let ctx = Context::new(config).await?;
    cli.command.run(&ctx).await
}
