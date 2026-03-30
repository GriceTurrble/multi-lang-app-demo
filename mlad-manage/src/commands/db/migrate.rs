use anyhow::Result;
use clap::{Args, Subcommand};
use mlad_manage_db_lib as db;

#[derive(Subcommand)]
pub enum MigrateCommands {
    /// Run all pending migrations.
    Run,
    /// Revert the most recently applied migration.
    Revert,
    /// Revert then re-run the most recently applied migration.
    Redo,
}

/// Arguments for the `db migrate` subcommand group.
#[derive(Args)]
pub struct Migrate {
    #[command(subcommand)]
    pub command: MigrateCommands,
}

impl Migrate {
    pub fn run(&self, database_url: &str) -> Result<()> {
        let mut conn = db::establish_connection(database_url)?;
        match &self.command {
            MigrateCommands::Run => {
                db::run_pending_migrations(&mut conn)?;
                println!("Migrations applied successfully.");
            }
            MigrateCommands::Revert => {
                db::revert_last_migration(&mut conn)?;
                println!("Last migration reverted.");
            }
            MigrateCommands::Redo => {
                db::revert_last_migration(&mut conn)?;
                db::run_pending_migrations(&mut conn)?;
                println!("Last migration redone.");
            }
        }
        Ok(())
    }
}
