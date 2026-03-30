use anyhow::{Context as _, Result};
use clap::Args;
use diesel::connection::SimpleConnection;
use diesel::prelude::*;
use std::path::PathBuf;

/// Arguments for the `db load-fixtures` subcommand.
#[derive(Args)]
pub struct LoadFixtures {
    /// Path to the fixtures SQL file.
    #[arg(long, default_value = "./db_fixtures/fixtures.sql")]
    pub fixtures_file: PathBuf,
}

impl LoadFixtures {
    /// Execute `fixtures.sql` against the current schema.
    pub fn run(&self, conn: &mut PgConnection) -> Result<()> {
        let sql = std::fs::read_to_string(&self.fixtures_file).with_context(|| {
            format!(
                "Cannot read fixtures file: {}",
                self.fixtures_file.display()
            )
        })?;

        println!("Loading fixtures from {}...", self.fixtures_file.display());
        conn.batch_execute(&sql)
            .context("Failed to apply fixtures SQL")?;

        println!("Fixtures loaded successfully.");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::LoadFixtures;
    use crate::commands::db::test_helpers::{apply_migrations, establish_test_conn, fixtures_path};
    use diesel::prelude::*;
    use diesel::sql_types::BigInt;

    #[derive(QueryableByName)]
    struct CountResult {
        #[diesel(sql_type = BigInt)]
        count: i64,
    }

    #[test]
    fn loads_fixture_rows_into_schema() {
        let mut conn = establish_test_conn();
        conn.test_transaction::<_, anyhow::Error, _>(|conn| {
            apply_migrations(conn);

            LoadFixtures {
                fixtures_file: fixtures_path(),
            }
            .run(conn)?;

            let user_count = diesel::sql_query("SELECT COUNT(*) AS count FROM users")
                .get_result::<CountResult>(conn)?
                .count;
            assert_eq!(user_count, 12);
            Ok(())
        });
    }

    #[test]
    fn is_idempotent_when_posts_already_exist() {
        let mut conn = establish_test_conn();
        conn.test_transaction::<_, anyhow::Error, _>(|conn| {
            apply_migrations(conn);

            // Load fixtures twice; the second run should skip due to the existing-posts guard
            // in fixtures.sql and leave row counts unchanged.
            LoadFixtures {
                fixtures_file: fixtures_path(),
            }
            .run(conn)?;

            LoadFixtures {
                fixtures_file: fixtures_path(),
            }
            .run(conn)?;

            let user_count = diesel::sql_query("SELECT COUNT(*) AS count FROM users")
                .get_result::<CountResult>(conn)?
                .count;
            assert_eq!(user_count, 12);
            Ok(())
        });
    }
}
