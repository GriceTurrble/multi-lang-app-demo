pub mod check;
pub mod db;
pub mod generate;
pub mod users;

use clap::Subcommand;

#[derive(Subcommand)]
pub enum Commands {
    /// Run compliance checks on the project.
    Check(check::Check),
    /// Generate project artifacts (ADRs, etc.).
    #[command(alias = "gen")]
    Generate(generate::Generate),
    /// Database management commands.
    Db(db::Db),
    /// User management commands.
    Users(users::Users),
}
