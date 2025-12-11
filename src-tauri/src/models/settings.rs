use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SettingsError {
    #[error("Failed to read settings file: {0}")]
    ReadError(#[from] std::io::Error),

    #[error("Failed to parse settings: {0}")]
    ParseError(String),

    #[error("Failed to write settings: {0}")]
    WriteError(String),
}

/// App-wide global settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalSettings {
    #[serde(default = "default_theme")]
    pub theme: String,

    #[serde(default = "default_model")]
    pub default_model: String,

    #[serde(default = "default_notifications")]
    pub notifications_enabled: bool,

    #[serde(default)]
    pub projects_path: Option<PathBuf>,
}

fn default_theme() -> String {
    "light".to_string()
}

fn default_model() -> String {
    "claude-sonnet-4".to_string()
}

fn default_notifications() -> bool {
    true
}

impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            default_model: default_model(),
            notifications_enabled: default_notifications(),
            projects_path: None,
        }
    }
}

impl GlobalSettings {
    /// Load global settings from a file
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self, SettingsError> {
        let path = path.as_ref();

        if !path.exists() {
            // Return default settings if file doesn't exist
            return Ok(Self::default());
        }

        let content = fs::read_to_string(path)?;
        Self::parse_from_markdown(&content)
    }

    /// Parse global settings from markdown content
    pub fn parse_from_markdown(content: &str) -> Result<Self, SettingsError> {
        // Extract YAML frontmatter between --- delimiters
        let frontmatter = Self::extract_frontmatter(content)?;

        // Parse YAML frontmatter as JSON
        let settings: GlobalSettings = serde_json::from_str(&frontmatter)
            .map_err(|e| SettingsError::ParseError(format!("Failed to parse settings: {}", e)))?;

        Ok(settings)
    }

    /// Extract YAML frontmatter from markdown content
    fn extract_frontmatter(content: &str) -> Result<String, SettingsError> {
        let lines: Vec<&str> = content.lines().collect();

        // Check if file starts with ---
        if lines.is_empty() || lines[0] != "---" {
            return Err(SettingsError::ParseError(
                "No frontmatter found (missing opening ---)".to_string()
            ));
        }

        // Find closing ---
        let end_index = lines[1..]
            .iter()
            .position(|&line| line == "---")
            .ok_or_else(|| SettingsError::ParseError("No closing --- found".to_string()))?
            + 1;

        // Extract frontmatter lines
        let frontmatter_lines = &lines[1..end_index];
        let yaml_content = frontmatter_lines.join("\n");

        Self::yaml_to_json(&yaml_content)
    }

    /// Simple YAML to JSON converter
    fn yaml_to_json(yaml: &str) -> Result<String, SettingsError> {
        let mut json_map = std::collections::HashMap::new();

        for line in yaml.lines() {
            let trimmed = line.trim();

            if trimmed.is_empty() {
                continue;
            }

            if let Some(colon_pos) = trimmed.find(':') {
                let key = trimmed[..colon_pos].trim().to_string();
                let value = trimmed[colon_pos + 1..].trim();

                if !value.is_empty() {
                    json_map.insert(key, serde_json::json!(value));
                }
            }
        }

        serde_json::to_string(&json_map)
            .map_err(|e| SettingsError::ParseError(format!("Failed to convert to JSON: {}", e)))
    }

    /// Save global settings to a file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), SettingsError> {
        let content = self.to_markdown()?;
        fs::write(path, content)
            .map_err(|e| SettingsError::WriteError(format!("Failed to write settings: {}", e)))?;

        Ok(())
    }

    /// Convert settings to markdown format with frontmatter
    pub fn to_markdown(&self) -> Result<String, SettingsError> {
        let mut markdown = String::from("---\n");
        markdown.push_str(&format!("theme: {}\n", self.theme));
        markdown.push_str(&format!("default_model: {}\n", self.default_model));
        markdown.push_str(&format!("notifications_enabled: {}\n", self.notifications_enabled));

        if let Some(ref projects_path) = self.projects_path {
            markdown.push_str(&format!(
                "projects_path: {}\n",
                projects_path.display()
            ));
        }

        markdown.push_str("---\n\n");
        markdown.push_str("# Global Settings\n\n");
        markdown.push_str("This file contains the global settings for the AI Researcher application.\n");

        Ok(markdown)
    }
}

/// Project-specific settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSettings {
    #[serde(default)]
    pub custom_prompt: Option<String>,

    #[serde(default)]
    pub preferred_skills: Vec<String>,
}

impl Default for ProjectSettings {
    fn default() -> Self {
        Self {
            custom_prompt: None,
            preferred_skills: Vec::new(),
        }
    }
}

impl ProjectSettings {
    /// Load project settings from a file
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self, SettingsError> {
        let path = path.as_ref();

        if !path.exists() {
            return Ok(Self::default());
        }

        let content = fs::read_to_string(path)?;
        Self::parse_from_markdown(&content)
    }

    /// Parse project settings from markdown content
    pub fn parse_from_markdown(content: &str) -> Result<Self, SettingsError> {
        let frontmatter = Self::extract_frontmatter(content)?;

        let settings: ProjectSettings = serde_json::from_str(&frontmatter)
            .map_err(|e| SettingsError::ParseError(format!("Failed to parse settings: {}", e)))?;

        Ok(settings)
    }

    /// Extract YAML frontmatter from markdown content
    fn extract_frontmatter(content: &str) -> Result<String, SettingsError> {
        let lines: Vec<&str> = content.lines().collect();

        if lines.is_empty() || lines[0] != "---" {
            return Err(SettingsError::ParseError(
                "No frontmatter found (missing opening ---)".to_string()
            ));
        }

        let end_index = lines[1..]
            .iter()
            .position(|&line| line == "---")
            .ok_or_else(|| SettingsError::ParseError("No closing --- found".to_string()))?
            + 1;

        let frontmatter_lines = &lines[1..end_index];
        let yaml_content = frontmatter_lines.join("\n");

        Self::yaml_to_json(&yaml_content)
    }

    /// Simple YAML to JSON converter for settings with arrays
    fn yaml_to_json(yaml: &str) -> Result<String, SettingsError> {
        let mut json_map = std::collections::HashMap::new();
        let mut current_key: Option<String> = None;
        let mut array_items: Vec<String> = Vec::new();

        for line in yaml.lines() {
            let trimmed = line.trim();

            if trimmed.is_empty() {
                continue;
            }

            // Handle array items
            if trimmed.starts_with("- ") {
                if let Some(_) = &current_key {
                    array_items.push(trimmed[2..].trim().to_string());
                }
                continue;
            }

            // Save previous array if we're starting a new key
            if let Some(key) = current_key.take() {
                if !array_items.is_empty() {
                    json_map.insert(key, serde_json::json!(array_items));
                    array_items.clear();
                }
            }

            // Handle key-value pairs
            if let Some(colon_pos) = trimmed.find(':') {
                let key = trimmed[..colon_pos].trim().to_string();
                let value = trimmed[colon_pos + 1..].trim();

                if value.is_empty() {
                    current_key = Some(key);
                } else {
                    json_map.insert(key, serde_json::json!(value));
                }
            }
        }

        // Save last array if exists
        if let Some(key) = current_key {
            if !array_items.is_empty() {
                json_map.insert(key, serde_json::json!(array_items));
            }
        }

        serde_json::to_string(&json_map)
            .map_err(|e| SettingsError::ParseError(format!("Failed to convert to JSON: {}", e)))
    }

    /// Save project settings to a file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), SettingsError> {
        let content = self.to_markdown()?;
        fs::write(path, content)
            .map_err(|e| SettingsError::WriteError(format!("Failed to write settings: {}", e)))?;

        Ok(())
    }

    /// Convert settings to markdown format with frontmatter
    pub fn to_markdown(&self) -> Result<String, SettingsError> {
        let mut markdown = String::from("---\n");

        if let Some(ref custom_prompt) = self.custom_prompt {
            markdown.push_str(&format!("custom_prompt: {}\n", custom_prompt));
        }

        if !self.preferred_skills.is_empty() {
            markdown.push_str("preferred_skills:\n");
            for skill in &self.preferred_skills {
                markdown.push_str(&format!("- {}\n", skill));
            }
        }

        markdown.push_str("---\n\n");
        markdown.push_str("# Project Settings\n\n");
        markdown.push_str("This file contains project-specific settings.\n");

        Ok(markdown)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_global_settings() {
        let markdown = r#"---
theme: dark
default_model: claude-opus-4
---

# Settings
"#;

        let settings = GlobalSettings::parse_from_markdown(markdown);
        assert!(settings.is_ok());

        let settings = settings.unwrap();
        assert_eq!(settings.theme, "dark");
        assert_eq!(settings.default_model, "claude-opus-4");
    }

    #[test]
    fn test_default_global_settings() {
        let settings = GlobalSettings::default();
        assert_eq!(settings.theme, "light");
        assert_eq!(settings.default_model, "claude-sonnet-4");
    }
}
