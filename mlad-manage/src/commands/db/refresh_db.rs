use super::{load_fixtures::LoadFixtures, reload_schema::ReloadSchema};
use crate::context::Context;
use anyhow::Result;
use clap::Args;
use std::path::PathBuf;

/// Arguments for the `db refresh-db` subcommand.
#[derive(Args)]
pub struct RefreshDb {
    /// Path to the schema SQL file.
    #[arg(long, default_value = "../database/schema.sql")]
    pub schema_file: PathBuf,

    /// Path to the fixtures SQL file.
    #[arg(long, default_value = "../database/fixtures.sql")]
    pub fixtures_file: PathBuf,

    /// Skip the confirmation prompt and proceed immediately.
    #[arg(short, long)]
    pub yes: bool,
}

impl RefreshDb {
    /// Reload the schema unconditionally, then load fixtures in one step.
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

#[cfg(test)]
mod tests {
    use super::RefreshDb;
    use crate::commands::db::test_helpers::{fixtures_path, schema_path};
    use crate::context::Context;
    use sqlx::PgPool;

    #[sqlx::test]
    async fn applies_schema_and_fixtures(pool: PgPool) {
        let ctx = Context { pool };
        RefreshDb {
            schema_file: schema_path(),
            fixtures_file: fixtures_path(),
            yes: true,
        }
        .run(&ctx)
        .await
        .unwrap();

        let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
            .fetch_one(&ctx.pool)
            .await
            .unwrap();
        assert_eq!(user_count, 12);
    }
}
