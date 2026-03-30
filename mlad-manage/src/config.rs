use anyhow::Result;

/// Application configuration loaded from the environment or `.env` file.
pub struct Config {
    pub database_url: String,
}

impl Config {
    /// Load configuration, optionally overriding `DATABASE_URL`.
    ///
    /// Reads `.env` from the working directory if present. Falls back to a
    /// default local Postgres URL when no value is supplied or found in the
    /// environment.
    pub fn load(database_url_override: Option<String>) -> Result<Self> {
        // Load .env from the working directory; ignore if missing.
        let _ = dotenvy::dotenv();

        let database_url = database_url_override
            .or_else(|| std::env::var("DATABASE_URL").ok())
            .unwrap_or_else(|| {
                "postgresql://postgres:postgres@localhost:5432/mlad".to_string()
            });

        Ok(Self { database_url })
    }
}
