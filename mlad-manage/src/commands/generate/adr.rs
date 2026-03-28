use anyhow::{bail, Context as _, Result};
use clap::Args;
use mlad_manage_adr_lib::collect_adr_files;
use std::path::PathBuf;

/// Arguments for the `generate adr` subcommand.
#[derive(Args)]
pub struct Adr {
    /// Title for the new ADR.
    #[arg(trailing_var_arg = true, num_args = 1..)]
    pub title: Vec<String>,

    /// Path to the ADR directory.
    #[arg(long, default_value = "../docs/adrs")]
    pub adrs_dir: PathBuf,
}

impl Adr {
    /// Determine the next ADR number, render the template, and write the file.
    pub fn run(&self) -> Result<()> {
        let title = self.title.join(" ");
        let existing = collect_unique_adr_numbers(&self.adrs_dir)?;
        let next = existing.keys().max().map_or(1, |n| n + 1);
        let slug = slugify(&title);
        let filename = format!("{:04}-{}.md", next, slug);
        let output_path = self.adrs_dir.join(&filename);

        let template_path = self.adrs_dir.join("TEMPLATE.md");
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

        let readme_path = self.adrs_dir.join("README.md");
        let readme = std::fs::read_to_string(&readme_path)
            .with_context(|| format!("Failed to read README: {}", readme_path.display()))?;
        let updated_readme = append_readme_row(&readme, next, &filename, &title, &date, "Draft");
        std::fs::write(&readme_path, &updated_readme)
            .with_context(|| format!("Failed to write README: {}", readme_path.display()))?;

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

/// Insert a new row into the README table after the last `|`-prefixed line.
fn append_readme_row(
    readme: &str,
    number: u32,
    filename: &str,
    title: &str,
    date: &str,
    status: &str,
) -> String {
    let adr_link = format!("[ADR-{:04}]({})", number, filename);
    let new_row = format!("| {} | {} | {} | {} |", adr_link, title, date, status);
    let lines: Vec<&str> = readme.lines().collect();
    let last_table_idx = lines.iter().rposition(|l| l.starts_with('|'));
    match last_table_idx {
        Some(idx) => {
            let mut result = lines[..=idx].join("\n");
            result.push('\n');
            result.push_str(&new_row);
            result.push('\n');
            let tail = lines[idx + 1..].join("\n");
            if !tail.is_empty() {
                result.push_str(&tail);
                result.push('\n');
            }
            result
        }
        None => format!("{}\n{}\n", readme.trim_end_matches('\n'), new_row),
    }
}

/// Convert a title string into a lowercase hyphen-separated slug suitable for filenames.
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
    fn test_append_readme_row() {
        let readme = "# ADRs\n\n| ADR | Title | Date | Status |\n| --- | ----- | ---- | ------ |\n| [ADR-0001](0001-foo.md) | Foo | 2026-01-01 | Accepted |\n";
        let result = append_readme_row(readme, 2, "0002-bar.md", "Bar", "2026-03-27", "Draft");
        let expected = "# ADRs\n\n| ADR | Title | Date | Status |\n| --- | ----- | ---- | ------ |\n| [ADR-0001](0001-foo.md) | Foo | 2026-01-01 | Accepted |\n| [ADR-0002](0002-bar.md) | Bar | 2026-03-27 | Draft |\n";
        assert_eq!(result, expected);
    }

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("UUID v7 for Identifiers"), "uuid-v7-for-identifiers");
        assert_eq!(slugify("Password Hashing Scheme"), "password-hashing-scheme");
        assert_eq!(slugify("  Multiple   Spaces  "), "multiple-spaces");
        assert_eq!(slugify("Special! @#$ Chars"), "special-chars");
    }
}
