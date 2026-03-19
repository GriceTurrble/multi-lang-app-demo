use anyhow::{bail, Context as _, Result};
use clap::Args;
use mladmgmt_adr_lib::collect_adr_files;
use std::path::PathBuf;

#[derive(Args)]
pub struct Adr {
    /// Title for the new ADR.
    #[arg(trailing_var_arg = true, num_args = 1..)]
    pub title: Vec<String>,

    /// Path to the ADR directory.
    #[arg(long, default_value = "../docs/adr")]
    pub adr_dir: PathBuf,
}

impl Adr {
    pub fn run(&self) -> Result<()> {
        let title = self.title.join(" ");
        let existing = collect_unique_adr_numbers(&self.adr_dir)?;
        let next = existing.keys().max().map_or(1, |n| n + 1);
        let slug = slugify(&title);
        let filename = format!("{:04}-{}.md", next, slug);
        let output_path = self.adr_dir.join(&filename);

        let template_path = self.adr_dir.join("TEMPLATE.md");
        let template = std::fs::read_to_string(&template_path)
            .with_context(|| format!("Failed to read template: {}", template_path.display()))?;

        let date = chrono::Local::now().format("%Y-%m-%d").to_string();
        let content = template
            .replace("{number}", &format!("{:04}", next))
            .replace("{title}", &title)
            .replace("{date}", &date)
            .replace("{status}", "Draft");

        std::fs::write(&output_path, &content)
            .with_context(|| format!("Failed to write {}", output_path.display()))?;

        println!("Created {}", filename);
        Ok(())
    }
}

/// Collect ADR numbers from `adr_dir`, failing if any ID has more than one file.
fn collect_unique_adr_numbers(adr_dir: &PathBuf) -> Result<std::collections::HashMap<u32, String>> {
    let grouped = collect_adr_files(adr_dir)?;

    let conflicts: Vec<String> = {
        let mut v: Vec<_> = grouped
            .iter()
            .filter(|(_, files)| files.len() > 1)
            .map(|(n, files)| format!("  {:04}: {}", n, files.join(", ")))
            .collect();
        v.sort();
        v
    };
    if !conflicts.is_empty() {
        bail!("ADR number conflicts detected:\n{}", conflicts.join("\n"));
    }

    Ok(grouped
        .into_iter()
        .filter_map(|(n, mut files)| files.pop().map(|f| (n, f)))
        .collect())
}

fn slugify(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("UUID v7 for Identifiers"), "uuid-v7-for-identifiers");
        assert_eq!(slugify("Password Hashing Scheme"), "password-hashing-scheme");
        assert_eq!(slugify("  Multiple   Spaces  "), "multiple-spaces");
        assert_eq!(slugify("Special! @#$ Chars"), "special-chars");
    }
}
