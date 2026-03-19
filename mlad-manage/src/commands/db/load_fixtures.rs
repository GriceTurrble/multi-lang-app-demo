use crate::context::Context;
use anyhow::{Context as _, Result};
use clap::Args;
use std::path::PathBuf;

/// Arguments for the `db load-fixtures` subcommand.
#[derive(Args)]
pub struct LoadFixtures {
    /// Path to the fixtures SQL file.
    #[arg(long, default_value = "../database_schema/fixtures.sql")]
    pub fixtures_file: PathBuf,
}

impl LoadFixtures {
    /// Execute `fixtures.sql` against the current schema.
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        let sql = std::fs::read_to_string(&self.fixtures_file).with_context(|| {
            format!(
                "Cannot read fixtures file: {}",
                self.fixtures_file.display()
            )
        })?;

        println!("Loading fixtures from {}...", self.fixtures_file.display());
        sqlx::raw_sql(&sql)
            .execute(&ctx.pool)
            .await
            .context("Failed to apply fixtures SQL")?;

        println!("Fixtures loaded successfully.");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::LoadFixtures;
    use crate::commands::db::test_helpers::{apply_schema, fixtures_path};
    use crate::context::Context;
    use sqlx::PgPool;

    #[sqlx::test]
    async fn loads_fixture_rows_into_schema(pool: PgPool) {
        apply_schema(&pool).await;

        let ctx = Context { pool };
        LoadFixtures {
            fixtures_file: fixtures_path(),
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

    #[sqlx::test]
    async fn is_idempotent_when_posts_already_exist(pool: PgPool) {
        apply_schema(&pool).await;
        let ctx = Context { pool };

        // Load fixtures twice; the second run should skip due to the existing-posts guard
        // in fixtures.sql and leave row counts unchanged.
        LoadFixtures {
            fixtures_file: fixtures_path(),
        }
        .run(&ctx)
        .await
        .unwrap();

        LoadFixtures {
            fixtures_file: fixtures_path(),
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
