use crate::config::Config;
use anyhow::Result;
use diesel::PgConnection;
use diesel::prelude::*;

/// Shared runtime context passed to database-backed commands.
pub struct Context {
    pub conn: PgConnection,
    pub database_url: String,
}

impl Context {
    /// Connect to the database described by `config` and return a [`Context`].
    pub fn new(config: Config) -> Result<Self> {
        let conn = PgConnection::establish(&config.database_url)?;
        Ok(Self {
            conn,
            database_url: config.database_url,
        })
    }
}
