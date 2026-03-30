use anyhow::{Context as _, Result};
use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2,
};
use rand::rngs::OsRng;
use clap::Args;
use diesel::prelude::*;
use diesel::sql_types::{Text, Uuid as SqlUuid};
use uuid::Uuid;

/// Arguments for the `users create` subcommand.
#[derive(Args)]
pub struct Create;

impl Create {
    /// Prompt for user details, hash the password with Argon2, and insert the new user.
    pub fn run(&self, conn: &mut PgConnection) -> Result<()> {
        let email = prompt("Email: ")?;
        let username = prompt("Username: ")?;
        let password = rpassword::prompt_password("Password: ")
            .context("Failed to read password")?;

        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| anyhow::anyhow!("Password hashing failed: {e}"))?
            .to_string();

        let id = Uuid::now_v7();

        diesel::sql_query(
            "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)",
        )
        .bind::<SqlUuid, _>(id)
        .bind::<Text, _>(&email)
        .bind::<Text, _>(&username)
        .bind::<Text, _>(&hash)
        .execute(conn)
        .context("Failed to insert user")?;

        println!("Created user  id={}  username={}", id, username);
        Ok(())
    }
}

/// Print `label` and read a trimmed line from stdin.
fn prompt(label: &str) -> Result<String> {
    use std::io::Write;
    print!("{}", label);
    std::io::stdout().flush()?;
    let mut buf = String::new();
    std::io::stdin().read_line(&mut buf)?;
    Ok(buf.trim().to_string())
}
