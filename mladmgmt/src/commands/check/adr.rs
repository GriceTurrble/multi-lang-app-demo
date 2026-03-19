use anyhow::Result;
use clap::Args;
use mladmgmt_adr_lib::collect_adr_files;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

#[derive(Args)]
pub struct CheckAdr {
    /// Path to the ADR directory.
    #[arg(long, default_value = "../docs/adr")]
    pub adr_dir: PathBuf,
}

impl Default for CheckAdr {
    fn default() -> Self {
        Self {
            adr_dir: PathBuf::from("../docs/adr"),
        }
    }
}

impl CheckAdr {
    /// Run all ADR checks. Returns a list of failure messages; empty means all passed.
    pub fn check(&self) -> Result<Vec<String>> {
        let id_to_files = collect_adr_files(&self.adr_dir)?;
        let mut failures = Vec::new();
        failures.extend(check_duplicates(&id_to_files));
        failures.extend(check_gaps(&id_to_files));
        Ok(failures)
    }
}

fn check_duplicates(id_to_files: &HashMap<u32, Vec<String>>) -> Vec<String> {
    let mut duplicates: Vec<_> = id_to_files
        .iter()
        .filter(|(_, files)| files.len() > 1)
        .collect();
    duplicates.sort_by_key(|(n, _)| *n);
    duplicates
        .into_iter()
        .map(|(num, files)| {
            let mut sorted = files.clone();
            sorted.sort();
            format!("Duplicate ADR ID {:04}: {}", num, sorted.join(", "))
        })
        .collect()
}

fn check_gaps(id_to_files: &HashMap<u32, Vec<String>>) -> Vec<String> {
    if id_to_files.is_empty() {
        return vec![];
    }
    let mut ids: Vec<u32> = id_to_files.keys().copied().collect();
    ids.sort();
    let max = *ids.last().unwrap();
    let present: HashSet<u32> = ids.into_iter().collect();

    let mut gaps: Vec<u32> = (1..=max).filter(|n| !present.contains(n)).collect();
    gaps.sort();
    if gaps.is_empty() {
        return vec![];
    }
    let gap_strs: Vec<String> = gaps.iter().map(|n| format!("{:04}", n)).collect();
    vec![format!("Gaps in ADR sequence: {}", gap_strs.join(", "))]
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
        fs::write(dir.path().join(name), "# ADR").unwrap();
    }

    fn checker(dir: &TempDir) -> CheckAdr {
        CheckAdr { adr_dir: dir.path().to_path_buf() }
    }

    #[test]
    fn passes_on_clean_sequence() {
        let dir = make_dir();
        touch(&dir, "0001-first.md");
        touch(&dir, "0002-second.md");
        touch(&dir, "0003-third.md");
        touch(&dir, "README.md");
        touch(&dir, "TEMPLATE.md");

        let failures = checker(&dir).check().unwrap();
        assert!(failures.is_empty(), "expected no failures: {:?}", failures);
    }

    #[test]
    fn detects_duplicate_ids() {
        let dir = make_dir();
        touch(&dir, "0001-first.md");
        touch(&dir, "0001-duplicate.md");
        touch(&dir, "0002-second.md");

        let failures = checker(&dir).check().unwrap();
        assert_eq!(failures.len(), 1);
        assert!(failures[0].contains("Duplicate ADR ID 0001"), "{}", failures[0]);
        assert!(failures[0].contains("0001-duplicate.md"), "{}", failures[0]);
        assert!(failures[0].contains("0001-first.md"), "{}", failures[0]);
    }

    #[test]
    fn detects_gap_in_sequence() {
        let dir = make_dir();
        touch(&dir, "0001-first.md");
        touch(&dir, "0003-third.md"); // gap at 0002

        let failures = checker(&dir).check().unwrap();
        assert_eq!(failures.len(), 1);
        assert!(failures[0].contains("0002"), "{}", failures[0]);
    }

    #[test]
    fn detects_multiple_gaps() {
        let dir = make_dir();
        touch(&dir, "0001-first.md");
        touch(&dir, "0004-fourth.md"); // gaps at 0002 and 0003

        let failures = checker(&dir).check().unwrap();
        assert_eq!(failures.len(), 1);
        assert!(failures[0].contains("0002"), "{}", failures[0]);
        assert!(failures[0].contains("0003"), "{}", failures[0]);
    }

    #[test]
    fn passes_on_empty_directory() {
        let dir = make_dir();
        let failures = checker(&dir).check().unwrap();
        assert!(failures.is_empty());
    }

    // --- unit tests for individual check functions ---

    #[test]
    fn check_duplicates_returns_empty_when_no_dupes() {
        let map: HashMap<u32, Vec<String>> = [
            (1, vec!["0001-first.md".into()]),
            (2, vec!["0002-second.md".into()]),
        ]
        .into();
        assert!(check_duplicates(&map).is_empty());
    }

    #[test]
    fn check_duplicates_reports_all_dupe_ids() {
        let map: HashMap<u32, Vec<String>> = [
            (1, vec!["0001-a.md".into(), "0001-b.md".into()]),
            (3, vec!["0003-a.md".into(), "0003-b.md".into()]),
        ]
        .into();
        let failures = check_duplicates(&map);
        assert_eq!(failures.len(), 2);
    }

    #[test]
    fn check_gaps_returns_empty_when_no_gaps() {
        let map: HashMap<u32, Vec<String>> = [
            (1, vec!["0001-first.md".into()]),
            (2, vec!["0002-second.md".into()]),
            (3, vec!["0003-third.md".into()]),
        ]
        .into();
        assert!(check_gaps(&map).is_empty());
    }

    #[test]
    fn check_gaps_returns_empty_for_empty_map() {
        assert!(check_gaps(&HashMap::new()).is_empty());
    }

    #[test]
    fn check_gaps_reports_missing_ids() {
        let map: HashMap<u32, Vec<String>> = [
            (1, vec!["0001-first.md".into()]),
            (4, vec!["0004-fourth.md".into()]),
        ]
        .into();
        let failures = check_gaps(&map);
        assert_eq!(failures.len(), 1);
        assert!(failures[0].contains("0002"));
        assert!(failures[0].contains("0003"));
    }
}
