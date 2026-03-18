use crate::config::Config;
use anyhow::Result;
use sqlx::PgPool;

pub struct Context {
    pub pool: PgPool,
}

impl Context {
    pub async fn new(config: Config) -> Result<Self> {
        let pool = PgPool::connect(&config.database_url).await?;
        Ok(Self { pool })
    }
}
