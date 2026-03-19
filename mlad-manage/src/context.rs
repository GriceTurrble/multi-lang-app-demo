use crate::config::Config;
use anyhow::Result;
use sqlx::PgPool;

/// Shared runtime context passed to database-backed commands.
pub struct Context {
    pub pool: PgPool,
}

impl Context {
    /// Connect to the database described by `config` and return a [`Context`].
    pub async fn new(config: Config) -> Result<Self> {
        let pool = PgPool::connect(&config.database_url).await?;
        Ok(Self { pool })
    }
}
