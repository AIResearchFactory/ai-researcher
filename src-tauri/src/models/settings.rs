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

}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_global_settings() {
        let settings = GlobalSettings::default();
        assert_eq!(settings.theme, "light");
        assert_eq!(settings.default_model, "claude-sonnet-4");
    }
}
