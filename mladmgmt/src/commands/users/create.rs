use crate::context::Context;
use anyhow::{Context as _, Result};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use clap::Args;
use uuid::Uuid;

#[derive(Args)]
pub struct Create;

impl Create {
    pub async fn run(&self, ctx: &Context) -> Result<()> {
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

        sqlx::query(
            "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)",
        )
        .bind(id)
        .bind(&email)
        .bind(&username)
        .bind(&hash)
        .execute(&ctx.pool)
        .await
        .context("Failed to insert user")?;

        println!("Created user  id={}  username={}", id, username);
        Ok(())
    }
}

fn prompt(label: &str) -> Result<String> {
    use std::io::Write;
    print!("{}", label);
    std::io::stdout().flush()?;
    let mut buf = String::new();
    std::io::stdin().read_line(&mut buf)?;
    Ok(buf.trim().to_string())
}
