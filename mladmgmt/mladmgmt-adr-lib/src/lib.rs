use anyhow::{Context as _, Result};
use std::collections::HashMap;
use std::path::Path;

/// Parse a 4-digit ADR number from a filename like `0001-some-title.md`.
/// Returns `None` for non-ADR files (README, TEMPLATE, wrong digit count, etc.).
pub fn parse_adr_number(filename: &str) -> Option<u32> {
    if !filename.ends_with(".md") {
        return None;
    }
    let digits: String = filename.chars().take_while(|c| c.is_ascii_digit()).collect();
    if digits.len() != 4 {
        return None;
    }
    // Must be followed by '-' to distinguish `0001-foo.md` from `00011-foo.md`
    if filename.chars().nth(4) != Some('-') {
        return None;
    }
    digits.parse().ok()
}

/// Scan `adr_dir` and return every numbered ADR file grouped by ID.
/// Non-ADR files (README.md, TEMPLATE.md, etc.) are silently ignored.
pub fn collect_adr_files(adr_dir: &Path) -> Result<HashMap<u32, Vec<String>>> {
    let mut map: HashMap<u32, Vec<String>> = HashMap::new();
    for entry in std::fs::read_dir(adr_dir)
        .with_context(|| format!("Failed to read ADR directory: {}", adr_dir.display()))?
    {
        let entry = entry.context("Failed to read directory entry")?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if let Some(num) = parse_adr_number(&name) {
            map.entry(num).or_default().push(name);
        }
    }
    Ok(map)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn make_dir() -> TempDir {
        tempfile::tempdir().unwrap()
    }

    fn touch(dir: &TempDir, name: &str) {
        fs::write(dir.path().join(name), "").unwrap();
    }

    #[test]
    fn parse_recognizes_valid_adr() {
        assert_eq!(parse_adr_number("0001-some-title.md"), Some(1));
        assert_eq!(parse_adr_number("0042-another.md"), Some(42));
    }

    #[test]
    fn parse_rejects_non_adr_files() {
        assert_eq!(parse_adr_number("README.md"), None);
        assert_eq!(parse_adr_number("TEMPLATE.md"), None);
        assert_eq!(parse_adr_number("001-short.md"), None);
        assert_eq!(parse_adr_number("00001-long.md"), None);
        assert_eq!(parse_adr_number("0001notslug.md"), None);
        assert_eq!(parse_adr_number("notes.txt"), None);
    }

    #[test]
    fn collect_groups_files_by_id() {
        let dir = make_dir();
        touch(&dir, "0001-first.md");
        touch(&dir, "0002-second.md");
        touch(&dir, "README.md");

        let map = collect_adr_files(dir.path()).unwrap();
        assert_eq!(map.len(), 2);
        assert!(map.contains_key(&1));
        assert!(map.contains_key(&2));
    }

    #[test]
    fn collect_detects_duplicates_under_same_id() {
        let dir = make_dir();
        touch(&dir, "0001-first.md");
        touch(&dir, "0001-duplicate.md");

        let map = collect_adr_files(dir.path()).unwrap();
        assert_eq!(map[&1].len(), 2);
    }
}
