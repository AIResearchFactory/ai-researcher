use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

pub struct SecretsService;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Secrets {
    pub claude_api_key: Option<String>,
    // Future: other AI service keys
}

impl SecretsService {
    /// Get the path to the secrets file
    fn get_secrets_path() -> Result<PathBuf> {
        let home_dir = dirs::home_dir().context("Failed to get home directory")?;
        Ok(home_dir.join(".ai-researcher").join(".secrets.md"))
    }

    /// Load secrets from .secrets.md (unencrypted for now)
    pub fn load_secrets() -> Result<Secrets> {
        let secrets_path = Self::get_secrets_path()?;

        // If file doesn't exist, return empty secrets
        if !secrets_path.exists() {
            return Ok(Secrets {
                claude_api_key: None,
            });
        }

        let content = fs::read_to_string(&secrets_path)
            .context("Failed to read secrets file")?;

        Self::parse_secrets(&content)
    }

    /// Parse secrets from markdown content
    fn parse_secrets(content: &str) -> Result<Secrets> {
        let mut claude_api_key = None;

        // Parse the frontmatter section
        if let Some(frontmatter) = Self::extract_frontmatter(content) {
            for line in frontmatter.lines() {
                let line = line.trim();
                if line.starts_with("claude_api_key:") {
                    claude_api_key = Some(
                        line.trim_start_matches("claude_api_key:")
                            .trim()
                            .to_string(),
                    );
                }
            }
        }

        Ok(Secrets { claude_api_key })
    }

    /// Extract frontmatter from markdown content
    fn extract_frontmatter(content: &str) -> Option<String> {
        let content = content.trim();
        if !content.starts_with("---") {
            return None;
        }

        let remaining = &content[3..];
        if let Some(end_pos) = remaining.find("---") {
            Some(remaining[..end_pos].trim().to_string())
        } else {
            None
        }
    }

    /// Save secrets to .secrets.md
    pub fn save_secrets(secrets: &Secrets) -> Result<()> {
        let secrets_path = Self::get_secrets_path()?;

        // Ensure directory exists
        if let Some(parent) = secrets_path.parent() {
            fs::create_dir_all(parent).context("Failed to create secrets directory")?;
        }

        let content = Self::format_secrets(secrets);
        fs::write(&secrets_path, content).context("Failed to write secrets file")?;

        Ok(())
    }

    /// Format secrets as markdown content
    fn format_secrets(secrets: &Secrets) -> String {
        let mut content = String::from("---\n");

        if let Some(ref api_key) = secrets.claude_api_key {
            content.push_str(&format!("claude_api_key: {}\n", api_key));
        }

        content.push_str("---\n\n");
        content.push_str("# Secrets\n");
        content.push_str("⚠️ This file contains sensitive information. Keep it secure.\n");
        content.push_str("\n");
        content.push_str("This file stores API keys and other sensitive information.\n");
        content.push_str("Future versions will encrypt this data.\n");

        content
    }

    /// Get Claude API key
    pub fn get_claude_api_key() -> Result<Option<String>> {
        let secrets = Self::load_secrets()?;
        Ok(secrets.claude_api_key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_secrets() {
        let content = r#"---
claude_api_key: sk-ant-test123
---

# Secrets
⚠️ This file contains sensitive information.
"#;

        let secrets = SecretsService::parse_secrets(content).unwrap();
        assert_eq!(secrets.claude_api_key, Some("sk-ant-test123".to_string()));
    }

    #[test]
    fn test_extract_frontmatter() {
        let content = r#"---
claude_api_key: sk-ant-test123
---

# Content
"#;

        let frontmatter = SecretsService::extract_frontmatter(content).unwrap();
        assert!(frontmatter.contains("claude_api_key"));
    }

    #[test]
    fn test_format_secrets() {
        let secrets = Secrets {
            claude_api_key: Some("sk-ant-test123".to_string()),
        };

        let content = SecretsService::format_secrets(&secrets);
        assert!(content.contains("claude_api_key: sk-ant-test123"));
        assert!(content.contains("⚠️"));
    }
}
