use crate::context::Context;
use anyhow::{Context as _, Result};
use clap::Args;
use std::path::PathBuf;

#[derive(Args)]
pub struct LoadFixtures {
    /// Path to the fixtures SQL file.
    #[arg(long, default_value = "../database_schema/fixtures.sql")]
    pub fixtures_file: PathBuf,
}

impl LoadFixtures {
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        let sql = std::fs::read_to_string(&self.fixtures_file).with_context(|| {
            format!(
                "Cannot read fixtures file: {}",
                self.fixtures_file.display()
            )
        })?;

        println!("Loading fixtures from {}…", self.fixtures_file.display());
        sqlx::raw_sql(&sql)
            .execute(&ctx.pool)
            .await
            .context("Failed to apply fixtures SQL")?;

        println!("Fixtures loaded successfully.");
        Ok(())
    }
}
