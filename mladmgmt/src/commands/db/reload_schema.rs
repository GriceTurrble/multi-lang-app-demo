use super::load_schema::LoadSchema;
use crate::context::Context;
use anyhow::Result;
use clap::Args;
use std::path::PathBuf;

/// Alias for `load-schema --force`. Drops and reloads the schema unconditionally.
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
        LoadSchema {
            schema_file: self.schema_file.clone(),
            yes: self.yes,
            force: true,
        }
        .run(ctx)
        .await
    }
}
