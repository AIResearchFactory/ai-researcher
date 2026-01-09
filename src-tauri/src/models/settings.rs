use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;
use crate::utils::yaml_parser::{strip_quotes, parse_yaml_value};

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
pub struct GlobalSettings {
    #[serde(default = "default_theme")]
    pub theme: String,

    #[serde(default = "default_model")]
    pub default_model: String,

    #[serde(default = "default_notifications")]
    pub notifications_enabled: bool,

    #[serde(default)]
    pub projects_path: Option<PathBuf>,

    #[serde(default = "default_llm_provider")]
    pub llm_provider: String,
}

fn default_llm_provider() -> String {
    "claude".to_string()
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
            llm_provider: default_llm_provider(),
        }
    }
}

impl GlobalSettings {
    /// Load global settings from a file
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self, SettingsError> {
        let path = path.as_ref();

        if !path.exists() {
            // Check for legacy .settings.md for migration
            let legacy_path = path.with_file_name(".settings.md");
            if legacy_path.exists() {
                if let Ok(content) = fs::read_to_string(&legacy_path) {
                    if let Ok(settings) = Self::parse_from_markdown(&content) {
                        // Successfully migrated, we will save it as JSON on next save
                        return Ok(settings);
                    }
                }
            }
            return Ok(Self::default());
        }

        let content = fs::read_to_string(path)?;
        serde_json::from_str(&content)
            .map_err(|e| SettingsError::ParseError(format!("Failed to parse JSON settings: {}", e)))
    }

    /// Save global settings to a file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), SettingsError> {
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| SettingsError::WriteError(format!("Failed to serialize settings: {}", e)))?;
        
        fs::write(path, content)
            .map_err(|e| SettingsError::WriteError(format!("Failed to write settings: {}", e)))?;

        Ok(())
    }

    /// Robust extract frontmatter using the same logic as MarkdownService (Kept for other services if needed, but simplified)
    pub fn extract_frontmatter_raw(content: &str) -> (String, String) {
        use gray_matter::{Matter, engine::YAML};
        let matter = Matter::<YAML>::new();
        
        if let Ok(result) = matter.parse::<serde_yaml::Value>(content) {
            if result.data.is_some() {
                 let markdown_content = result.content;
                 let content_len = markdown_content.len();
                 let total_len = content.len();
                 
                 if total_len > content_len {
                     let frontmatter_part = &content[..total_len - content_len];
                     let clean = frontmatter_part.trim();
                     let clean = clean.strip_prefix("---").unwrap_or(clean); 
                     let clean = clean.strip_suffix("---").unwrap_or(clean);
                     return (clean.trim().to_string(), markdown_content);
                 }
            }
        }
        (String::new(), content.to_string())
    }

    /// Legacy parse from markdown content (kept for migration)
    fn parse_from_markdown(content: &str) -> Result<Self, SettingsError> {
        let (frontmatter_yml, _) = Self::extract_frontmatter_raw(content);
        if frontmatter_yml.is_empty() {
            return Ok(Self::default());
        }
        let json_str = Self::yaml_to_json(&frontmatter_yml)?;
        let settings: GlobalSettings = serde_json::from_str(&json_str)
            .map_err(|e| SettingsError::ParseError(format!("Failed to parse migration data: {}", e)))?;
        Ok(settings)
    }

    /// Legacy YAML to JSON converter (kept for migration)
    fn yaml_to_json(yaml: &str) -> Result<String, SettingsError> {
        let mut json_map = std::collections::HashMap::new();
        for line in yaml.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() { continue; }
            if let Some(colon_pos) = trimmed.find(':') {
                let key = trimmed[..colon_pos].trim().to_string();
                let value = trimmed[colon_pos + 1..].trim();
                if !value.is_empty() {
                    json_map.insert(key, crate::utils::yaml_parser::parse_yaml_value(value));
                }
            }
        }
        serde_json::to_string(&json_map)
            .map_err(|e| SettingsError::ParseError(format!("Migration failed: {}", e)))
    }
}

/// Project-specific settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
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
            // Check for legacy .settings.md for migration
            let legacy_path = path.with_file_name(".settings.md");
            if legacy_path.exists() {
                if let Ok(content) = fs::read_to_string(&legacy_path) {
                    if let Ok(settings) = Self::parse_from_markdown(&content) {
                        return Ok(settings);
                    }
                }
            }
            return Ok(Self::default());
        }

        let content = fs::read_to_string(path)?;
        serde_json::from_str(&content)
            .map_err(|e| SettingsError::ParseError(format!("Failed to parse project JSON settings: {}", e)))
    }

    /// Save project settings to a file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), SettingsError> {
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| SettingsError::WriteError(format!("Failed to serialize project settings: {}", e)))?;
        
        fs::write(path, content)
            .map_err(|e| SettingsError::WriteError(format!("Failed to write project settings: {}", e)))?;

        Ok(())
    }

    /// Legacy parse project settings from markdown content (kept for migration)
    fn parse_from_markdown(content: &str) -> Result<Self, SettingsError> {
        let (frontmatter_yml, _) = GlobalSettings::extract_frontmatter_raw(content);
        if frontmatter_yml.is_empty() {
             return Ok(Self::default());
        }
        let json_str = Self::yaml_to_json(&frontmatter_yml)?;
        let settings: ProjectSettings = serde_json::from_str(&json_str)
            .map_err(|e| SettingsError::ParseError(format!("Migration failed: {}", e)))?;
        Ok(settings)
    }

    /// Legacy YAML to JSON converter for settings with arrays (kept for migration)
    fn yaml_to_json(yaml: &str) -> Result<String, SettingsError> {
        let mut json_map = std::collections::HashMap::new();
        let mut current_key: Option<String> = None;
        let mut array_items: Vec<String> = Vec::new();

        for line in yaml.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() { continue; }

            if trimmed.starts_with("- ") {
                if let Some(_) = &current_key {
                    let value = trimmed[2..].trim();
                    array_items.push(strip_quotes(value).to_string());
                }
                continue;
            }

            if let Some(key) = current_key.take() {
                if !array_items.is_empty() {
                    json_map.insert(key, serde_json::json!(array_items));
                    array_items.clear();
                }
            }

            if let Some(colon_pos) = trimmed.find(':') {
                let key = trimmed[..colon_pos].trim().to_string();
                let value = trimmed[colon_pos + 1..].trim();
                if value.is_empty() {
                    current_key = Some(key);
                } else {
                    json_map.insert(key, crate::utils::yaml_parser::parse_yaml_value(value));
                }
            }
        }

        if let Some(key) = current_key {
            if !array_items.is_empty() {
                json_map.insert(key, serde_json::json!(array_items));
            }
        }

        serde_json::to_string(&json_map)
            .map_err(|e| SettingsError::ParseError(format!("Migration failed: {}", e)))
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
