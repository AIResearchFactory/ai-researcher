use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;
use crate::utils::yaml_parser::{strip_quotes, parse_yaml_value};
use crate::models::ai::{ProviderType, MCPServerConfig, OllamaConfig, ClaudeConfig, HostedConfig};

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

    #[serde(default = "default_model", alias = "default_model")]
    pub default_model: String,

    #[serde(default = "default_notifications", alias = "notifications_enabled")]
    pub notifications_enabled: bool,

    #[serde(default, alias = "projects_path")]
    pub projects_path: Option<PathBuf>,

    #[serde(default = "default_active_provider")]
    pub active_provider: ProviderType,

    #[serde(default = "default_ollama_config")]
    pub ollama: OllamaConfig,

    #[serde(default = "default_claude_config")]
    pub claude: ClaudeConfig,

    #[serde(default = "default_hosted_config")]
    pub hosted: HostedConfig,

    #[serde(default)]
    pub mcp_servers: Vec<MCPServerConfig>,
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

fn default_active_provider() -> ProviderType {
    ProviderType::OllamaViaMcp
}

fn default_ollama_config() -> OllamaConfig {
    OllamaConfig {
        model: "llama3".to_string(),
        mcp_server_id: "ollama".to_string(),
    }
}

fn default_claude_config() -> ClaudeConfig {
    ClaudeConfig {
        model: "claude-3-5-sonnet-20241022".to_string(),
    }
}

fn default_hosted_config() -> HostedConfig {
    HostedConfig {
        provider: "anthropic".to_string(),
        model: "claude-3-5-sonnet-20241022".to_string(),
        api_key_secret_id: "ANTHROPIC_API_KEY".to_string(),
    }
}

impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            default_model: default_model(),
            notifications_enabled: default_notifications(),
            projects_path: None,
            active_provider: default_active_provider(),
            ollama: default_ollama_config(),
            claude: default_claude_config(),
            hosted: default_hosted_config(),
            mcp_servers: Vec::new(),
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

        // Parse YAML frontmatter
        let settings: GlobalSettings = serde_yaml::from_str(&frontmatter)
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
        Ok(frontmatter_lines.join("\n"))
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
        let yaml = serde_yaml::to_string(self)
            .map_err(|e| SettingsError::WriteError(format!("Failed to serialize settings: {}", e)))?;
        
        let mut markdown = String::from("---\n");
        markdown.push_str(&yaml);
        markdown.push_str("---\n\n");
        markdown.push_str("# Global Settings\n\n");
        markdown.push_str("This file contains the global settings for the AI Researcher application.\n");

        Ok(markdown)
    }
}

/// Project-specific settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
    #[serde(default)]
    pub name: Option<String>,

    #[serde(default)]
    pub goal: Option<String>,

    #[serde(default)]
    pub custom_prompt: Option<String>,

    #[serde(default)]
    pub preferred_skills: Vec<String>,

    #[serde(default)]
    pub auto_save: Option<bool>,

    #[serde(default)]
    pub encryption_enabled: Option<bool>,
}

impl Default for ProjectSettings {
    fn default() -> Self {
        Self {
            name: None,
            goal: None,
            custom_prompt: None,
            preferred_skills: Vec::new(),
            auto_save: Some(true),
            encryption_enabled: Some(true),
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
                    let value = trimmed[2..].trim();
                    array_items.push(strip_quotes(value).to_string());
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
                    json_map.insert(key, parse_yaml_value(value));
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

        if let Some(ref name) = self.name {
            markdown.push_str(&format!("name: \"{}\"\n", name.replace('"', "\\\"")));
        }

        if let Some(ref goal) = self.goal {
            markdown.push_str(&format!("goal: \"{}\"\n", goal.replace('"', "\\\"")));
        }

        if let Some(ref custom_prompt) = self.custom_prompt {
            markdown.push_str(&format!("custom_prompt: {}\n", custom_prompt));
        }

        if let Some(auto_save) = self.auto_save {
            markdown.push_str(&format!("auto_save: {}\n", auto_save));
        }

        if let Some(encryption_enabled) = self.encryption_enabled {
            markdown.push_str(&format!("encryption_enabled: {}\n", encryption_enabled));
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

    #[test]
    fn test_parse_global_settings_with_boolean() {
        let markdown = r#"---
theme: dark
default_model: claude-sonnet-4
notifications_enabled: true
---

# Settings
"#;

        let settings = GlobalSettings::parse_from_markdown(markdown);
        assert!(settings.is_ok());

        let settings = settings.unwrap();
        assert_eq!(settings.theme, "dark");
        assert_eq!(settings.default_model, "claude-sonnet-4");
        assert_eq!(settings.notifications_enabled, true);
    }

}
