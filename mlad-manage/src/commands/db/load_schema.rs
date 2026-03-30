use crate::context::Context;
use anyhow::{bail, Context as _, Result};
use clap::Args;
use std::path::PathBuf;

/// Arguments for the `db load-schema` subcommand.
#[derive(Args)]
pub struct LoadSchema {
    /// Path to the schema SQL file.
    #[arg(long, default_value = "../database/schema.sql")]
    pub schema_file: PathBuf,

    /// Skip the confirmation prompt and proceed immediately.
    #[arg(short, long)]
    pub yes: bool,

    /// Drop and reload even if the schema already appears to be loaded.
    #[arg(long)]
    pub force: bool,
}

impl LoadSchema {
    /// Drop the public schema and re-apply `schema.sql`.
    ///
    /// Aborts with an error when the schema appears to already be loaded, unless
    /// `--force` is set. Prompts the user for confirmation unless `--yes` is set.
    pub async fn run(&self, ctx: &Context) -> Result<()> {
        let sql = std::fs::read_to_string(&self.schema_file)
            .with_context(|| format!("Cannot read schema file: {}", self.schema_file.display()))?;

        if !self.force {
            if let Some(table) = first_table_name(&sql) {
                let exists: bool = sqlx::query_scalar(
                    "SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = $1
                    )",
                )
                .bind(&table)
                .fetch_one(&ctx.pool)
                .await
                .with_context(|| format!("Failed to check existence of table '{table}'"))?;

                if exists {
                    bail!(
                        "Table '{table}' already exists. Schema appears to be loaded. \
                         Use --force to drop and reload anyway."
                    );
                }
            }
        }

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

        println!("Applying {}...", self.schema_file.display());
        sqlx::raw_sql(&sql)
            .execute(&ctx.pool)
            .await
            .context("Failed to apply schema SQL")?;

        println!("Schema loaded successfully.");
        Ok(())
    }
}

/// Finds the name of the first table in a `CREATE TABLE [IF NOT EXISTS] <name>` statement.
fn first_table_name(sql: &str) -> Option<String> {
    for line in sql.lines() {
        let upper = line.to_uppercase();
        if let Some(pos) = upper.find("CREATE TABLE") {
            let rest = line[pos + "CREATE TABLE".len()..].trim_start();
            let rest = if rest.to_uppercase().starts_with("IF NOT EXISTS") {
                rest["IF NOT EXISTS".len()..].trim_start()
            } else {
                rest
            };
            let name: String = rest
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_')
                .collect();
            if !name.is_empty() {
                return Some(name.to_lowercase());
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::{first_table_name, LoadSchema};
    use crate::commands::db::test_helpers::schema_path;
    use crate::context::Context;
    use sqlx::PgPool;

    #[test]
    fn finds_simple_create_table() {
        let sql = "CREATE TABLE users (\n  id UUID PRIMARY KEY\n);";
        assert_eq!(first_table_name(sql), Some("users".into()));
    }

    #[test]
    fn finds_create_table_if_not_exists() {
        let sql = "CREATE TABLE IF NOT EXISTS sessions (\n  id UUID PRIMARY KEY\n);";
        assert_eq!(first_table_name(sql), Some("sessions".into()));
    }

    #[test]
    fn case_insensitive_keyword() {
        let sql = "create table IF NOT EXISTS posts (\n  id UUID PRIMARY KEY\n);";
        assert_eq!(first_table_name(sql), Some("posts".into()));
    }

    #[test]
    fn returns_first_table_when_multiple_present() {
        let sql = "-- comment\nCREATE TABLE users (id UUID);\nCREATE TABLE posts (id UUID);";
        assert_eq!(first_table_name(sql), Some("users".into()));
    }

    #[test]
    fn ignores_leading_comments_and_blank_lines() {
        let sql = "-- Backend schema\n\nCREATE TABLE sessions (id UUID);";
        assert_eq!(first_table_name(sql), Some("sessions".into()));
    }

    #[test]
    fn returns_none_when_no_create_table() {
        let sql = "SELECT 1; INSERT INTO foo VALUES (1);";
        assert_eq!(first_table_name(sql), None);
    }

    // --- Integration tests ---

    /// Create the first table that schema.sql would create, simulating an already-loaded schema.
    async fn create_users_table(pool: &PgPool) {
        sqlx::raw_sql("CREATE TABLE users (id UUID PRIMARY KEY, email TEXT NOT NULL)")
            .execute(pool)
            .await
            .unwrap();
    }

    #[sqlx::test]
    async fn blocks_load_if_first_table_exists(pool: PgPool) {
        create_users_table(&pool).await;

        let ctx = Context { pool };
        let result = LoadSchema {
            schema_file: schema_path(),
            yes: true,
            force: false,
        }
        .run(&ctx)
        .await;

        assert!(result.is_err());
        assert!(
            result.unwrap_err().to_string().contains("already exists"),
            "Expected an 'already exists' error"
        );
    }

    #[sqlx::test]
    async fn force_bypasses_existence_check(pool: PgPool) {
        create_users_table(&pool).await;

        let ctx = Context { pool };
        let result = LoadSchema {
            schema_file: schema_path(),
            yes: true,
            force: true,
        }
        .run(&ctx)
        .await;

        // The guard must not block us. The command may still fail for other
        // environment reasons (e.g. missing extension), but not with "already exists".
        if let Err(e) = result {
            assert!(
                !e.to_string().contains("already exists"),
                "Guard should be bypassed with --force, got: {e}"
            );
        }
    }
}
