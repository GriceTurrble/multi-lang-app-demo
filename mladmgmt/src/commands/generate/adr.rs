use anyhow::{bail, Context as _, Result};
use clap::Args;
use std::collections::HashMap;
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
        let existing = collect_adr_numbers(&self.adr_dir)?;
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

fn collect_adr_numbers(adr_dir: &PathBuf) -> Result<HashMap<u32, String>> {
    let mut map: HashMap<u32, Vec<String>> = HashMap::new();

    for entry in std::fs::read_dir(adr_dir)
        .with_context(|| format!("Failed to read ADR directory: {}", adr_dir.display()))?
    {
        let entry = entry.context("Failed to read directory entry")?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if let Some(number) = parse_adr_number(&name) {
            map.entry(number).or_default().push(name);
        }
    }

    let conflicts: Vec<String> = {
        let mut v: Vec<_> = map
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

    Ok(map
        .into_iter()
        .filter_map(|(n, mut files)| files.pop().map(|f| (n, f)))
        .collect())
}

fn parse_adr_number(filename: &str) -> Option<u32> {
    if !filename.ends_with(".md") {
        return None;
    }
    let digits: String = filename.chars().take_while(|c| c.is_ascii_digit()).collect();
    if digits.len() != 4 {
        return None;
    }
    // Must be followed by '-' to distinguish from e.g. filenames with more digits
    if filename.chars().nth(4) != Some('-') {
        return None;
    }
    digits.parse().ok()
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
    fn test_parse_adr_number() {
        assert_eq!(parse_adr_number("0001-some-title.md"), Some(1));
        assert_eq!(parse_adr_number("0042-another-adr.md"), Some(42));
        assert_eq!(parse_adr_number("TEMPLATE.md"), None);
        assert_eq!(parse_adr_number("README.md"), None);
        assert_eq!(parse_adr_number("001-short.md"), None); // only 3 digits
        assert_eq!(parse_adr_number("00001-too-long.md"), None); // 5 digits
        assert_eq!(parse_adr_number("0001notaslug.md"), None); // no hyphen after digits
    }

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("UUID v7 for Identifiers"), "uuid-v7-for-identifiers");
        assert_eq!(slugify("Password Hashing Scheme"), "password-hashing-scheme");
        assert_eq!(slugify("  Multiple   Spaces  "), "multiple-spaces");
        assert_eq!(slugify("Special! @#$ Chars"), "special-chars");
    }
}
