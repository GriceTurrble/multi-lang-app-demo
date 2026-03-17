use anyhow::Result;

pub struct Config {
    pub database_url: String,
}

impl Config {
    pub fn load(database_url_override: Option<String>) -> Result<Self> {
        // Load .env from the working directory; ignore if missing.
        let _ = dotenvy::dotenv();

        let database_url = database_url_override
            .or_else(|| std::env::var("DATABASE_URL").ok())
            .unwrap_or_else(|| {
                "postgresql://postgres:postgres@localhost:5432/testdb".to_string()
            });

        Ok(Self { database_url })
    }
}
