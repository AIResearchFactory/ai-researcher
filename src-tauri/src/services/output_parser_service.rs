use regex::Regex;
use crate::services::file_service::FileService;
use anyhow::Result;

pub struct OutputParserService;

#[derive(Debug, PartialEq)]
pub struct FileChange {
    pub path: String,
    pub content: String,
}

impl OutputParserService {
    /// Parse the output string for file change requests.
    /// Supports the pattern:
    /// FILE: path/to/file
    /// ```ignore
    /// content
    /// ```
    pub fn parse_file_changes(output: &str) -> Vec<FileChange> {
        let mut changes = Vec::new();
        
        // Regex to look for "FILE: filename" followed by content in code blocks
        // This is a common pattern for "dumb" CLI agents.
        let re = Regex::new(r"(?m)^FILE:\s*([^\n\r]+)[\s\r\n]*```[^\n]*\n([\s\S]*?)\n```").unwrap();

        for cap in re.captures_iter(output) {
            let path = cap[1].trim().to_string();
            let content = cap[2].to_string();
            changes.push(FileChange { path, content });
        }

        changes
    }

    /// Automatically apply changes to the project
    pub fn apply_changes(project_id: &str, changes: &[FileChange]) -> Result<()> {
        for change in changes {
            FileService::write_file(project_id, &change.path, &change.content)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_file_changes() {
        let output = r#"
I have generated the code for you.

FILE: src/main.rs
```rust
fn main() {
    println!("Hello, world!");
}
```

And also a README:

FILE: README.md
```markdown
# My Project
```
"#;
        let changes = OutputParserService::parse_file_changes(output);
        assert_eq!(changes.len(), 2);
        assert_eq!(changes[0].path, "src/main.rs");
        assert!(changes[0].content.contains("println!"));
        assert_eq!(changes[1].path, "README.md");
        assert_eq!(changes[1].content, "# My Project");
    }
}
