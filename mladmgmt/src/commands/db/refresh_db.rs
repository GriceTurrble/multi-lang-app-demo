use super::{load_fixtures::LoadFixtures, reload_schema::ReloadSchema};
use crate::context::Context;
use anyhow::Result;
use clap::Args;
use std::path::PathBuf;

#[derive(Args)]
pub struct RefreshDb {
    /// Path to the schema SQL file.
    #[arg(long, default_value = "../database_schema/schema.sql")]
    pub schema_file: PathBuf,

    /// Path to the fixtures SQL file.
    #[arg(long, default_value = "../database_schema/fixtures.sql")]
    pub fixtures_file: PathBuf,

    /// Skip the confirmation prompt and proceed immediately.
    #[arg(short, long)]
    pub yes: bool,
}

impl RefreshDb {
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        let reload = ReloadSchema {
            schema_file: self.schema_file.clone(),
            yes: self.yes,
        };
        reload.run(ctx).await?;

        let fixtures = LoadFixtures {
            fixtures_file: self.fixtures_file.clone(),
        };
        fixtures.run(ctx).await
    }
}
