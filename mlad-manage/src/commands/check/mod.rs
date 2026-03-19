pub mod adrs;

use anyhow::{Result, bail};
use clap::{Args, Subcommand};

#[derive(Subcommand)]
pub enum CheckCommands {
    /// Check ADR compliance: no duplicate IDs, no gaps in sequence.
    Adr(adrs::CheckAdrs),
}

/// Arguments for the `check` subcommand group.
///
/// When invoked without a subcommand, all registered checks are run in parallel.
#[derive(Args)]
pub struct Check {
    #[command(subcommand)]
    pub command: Option<CheckCommands>,
}

impl Check {
    /// Dispatch to a specific check subcommand, or run all checks when none is given.
    pub fn run(&self) -> Result<()> {
        match &self.command {
            Some(CheckCommands::Adr(cmd)) => {
                println!("Running management checks");
                let failures = cmd.check()?;
                print_result("ADRs", &failures);
                if !failures.is_empty() {
                    bail!("check adrs: {} failure(s)", failures.len());
                }
                println!("All checks passed");
                Ok(())
            }
            None => run_all_checks(),
        }
    }
}

/// Run every registered check in parallel and report results.
///
/// Returns an error if any check fails or panics.
fn run_all_checks() -> Result<()> {
    println!("Running management checks");

    // Each check is a (name, thread) pair. New checks are added here.
    let handles: Vec<(&str, std::thread::JoinHandle<anyhow::Result<Vec<String>>>)> = vec![(
        "ADRs",
        std::thread::spawn(|| adrs::CheckAdrs::default().check()),
    )];

    let mut any_failed = false;
    for (name, handle) in handles {
        match handle.join() {
            Ok(Ok(failures)) => {
                print_result(name, &failures);
                if !failures.is_empty() {
                    any_failed = true;
                }
            }
            Ok(Err(e)) => {
                print_error(name, &e.to_string());
                any_failed = true;
            }
            Err(_) => {
                print_error(name, "check panicked");
                any_failed = true;
            }
        }
    }

    if any_failed {
        bail!("one or more checks failed");
    }
    println!("All checks passed");
    Ok(())
}

/// Print a check result line followed by any failure details.
fn print_result(check_name: &str, failures: &[String]) {
    if failures.is_empty() {
        print_result_line(check_name, "PASSED");
    } else {
        print_result_line(check_name, "FAILED");
        for f in failures {
            println!("   - {f}");
        }
    }
}

/// Print an ERROR result line and write the error detail to stderr.
fn print_error(check_name: &str, detail: &str) {
    print_result_line(check_name, "ERROR");
    eprintln!("  {detail}");
}

/// Format and print a single `>> <name>...<result>` status line.
fn print_result_line(check_name: &str, result: &str) {
    let dots = ".".repeat(70usize.saturating_sub(check_name.len()));
    println!(">> {check_name}{dots}{result}");
}

// ruff-check-backend-fastapi...............................................Passed
