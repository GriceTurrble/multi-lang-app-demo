use crate::context::Context;
use anyhow::{Context as _, Result};
use clap::Args;
use std::path::PathBuf;

#[derive(Args)]
pub struct ReloadSchema {
    /// Path to the schema SQL file.
    #[arg(long, default_value = "../database_schema/schema.sql")]
    pub schema_file: PathBuf,

    /// Skip the confirmation prompt and proceed immediately.
    #[arg(short, long)]
    pub yes: bool,
}

impl ReloadSchema {
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        if !self.yes {
            eprint!(
                "WARNING: This will drop the entire public schema and re-apply \
                 schema.sql. All data will be lost. Proceed? [y/N] "
            );
            let mut input = String::new();
            std::io::stdin().read_line(&mut input)?;
            if !matches!(input.trim().to_ascii_lowercase().as_str(), "y" | "yes") {
                println!("Aborted.");
                return Ok(());
            }
        }

        println!("Dropping public schema…");
        sqlx::raw_sql("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
            .execute(&ctx.pool)
            .await
            .context("Failed to drop/recreate public schema")?;

        let sql = std::fs::read_to_string(&self.schema_file)
            .with_context(|| format!("Cannot read schema file: {}", self.schema_file.display()))?;

        println!("Applying {}…", self.schema_file.display());
        sqlx::raw_sql(&sql)
            .execute(&ctx.pool)
            .await
            .context("Failed to apply schema SQL")?;

        println!("Schema reloaded successfully.");
        Ok(())
    }
}
