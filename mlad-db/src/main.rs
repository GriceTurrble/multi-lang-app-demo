use diesel::PgConnection;
use diesel::prelude::*;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

fn main() {
    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let mut conn = PgConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Failed to connect to database"));
    conn.run_pending_migrations(MIGRATIONS)
        .expect("Failed to run migrations");
    println!("Migrations applied successfully.");
}
