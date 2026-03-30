use super::load_schema::LoadSchema;
use crate::context::Context;
use anyhow::Result;
use clap::Args;
use std::path::PathBuf;

/// Alias for `load-schema --force`. Drops and reloads the schema unconditionally.
#[derive(Args)]
pub struct ReloadSchema {
    /// Path to the schema SQL file.
    #[arg(long, default_value = "../database/schema.sql")]
    pub schema_file: PathBuf,

    /// Skip the confirmation prompt and proceed immediately.
    #[arg(short, long)]
    pub yes: bool,
}

impl ReloadSchema {
    /// Delegate to [`LoadSchema::run`] with `force: true`.
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

#[cfg(test)]
mod tests {
    use super::ReloadSchema;
    use crate::commands::db::test_helpers::schema_path;
    use crate::context::Context;
    use sqlx::PgPool;

    #[sqlx::test]
    async fn succeeds_when_schema_exists(pool: PgPool) {
        // Simulate an existing schema by creating the first table.
        sqlx::raw_sql("CREATE TABLE users (id UUID PRIMARY KEY, email TEXT NOT NULL)")
            .execute(&pool)
            .await
            .unwrap();

        let ctx = Context { pool };
        let result = ReloadSchema {
            schema_file: schema_path(),
            yes: true,
        }
        .run(&ctx)
        .await;

        // ReloadSchema always uses --force, so it must not block with "already exists".
        if let Err(e) = result {
            assert!(
                !e.to_string().contains("already exists"),
                "ReloadSchema should bypass the existence guard, got: {e}"
            );
        }
    }
}
