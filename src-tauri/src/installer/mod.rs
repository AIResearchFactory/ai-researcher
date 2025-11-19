use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::detector::{self, ClaudeCodeInfo, OllamaInfo};
use crate::directory;

/// Installation configuration state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationConfig {
    pub app_data_path: PathBuf,
    pub is_first_install: bool,
    pub claude_code_detected: bool,
    pub ollama_detected: bool,
}

/// Installation progress state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationProgress {
    pub stage: InstallationStage,
    pub message: String,
    pub progress_percentage: u8,
}

/// Installation stage enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InstallationStage {
    Initializing,
    SelectingDirectory,
    CreatingStructure,
    DetectingDependencies,
    InstallingClaudeCode,
    InstallingOllama,
    Finalizing,
    Complete,
    Error,
}

/// Installation result containing detected dependencies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationResult {
    pub success: bool,
    pub config: InstallationConfig,
    pub claude_code_info: Option<ClaudeCodeInfo>,
    pub ollama_info: Option<OllamaInfo>,
    pub error_message: Option<String>,
}

/// Installation Manager
pub struct InstallationManager {
    config: InstallationConfig,
}

impl InstallationManager {
    /// Create a new installation manager with the given app data path
    pub fn new(app_data_path: PathBuf) -> Self {
        let is_first_install = !app_data_path.exists();

        Self {
            config: InstallationConfig {
                app_data_path,
                is_first_install,
                claude_code_detected: false,
                ollama_detected: false,
            },
        }
    }

    /// Create installation manager with default app data path
    pub fn with_default_path() -> Result<Self> {
        let app_data_path = crate::utils::paths::get_app_data_dir()?;
        Ok(Self::new(app_data_path))
    }

    /// Get the current installation configuration
    pub fn config(&self) -> &InstallationConfig {
        &self.config
    }

    /// Check if this is a first-time installation
    pub fn is_first_install(&self) -> bool {
        self.config.is_first_install
    }

    /// Run the complete installation process
    pub async fn run_installation<F>(&mut self, progress_callback: F) -> Result<InstallationResult>
    where
        F: Fn(InstallationProgress) + Send + 'static,
    {
        // Stage 1: Initializing
        progress_callback(InstallationProgress {
            stage: InstallationStage::Initializing,
            message: "Initializing installation...".to_string(),
            progress_percentage: 0,
        });

        // Stage 2: Creating directory structure
        progress_callback(InstallationProgress {
            stage: InstallationStage::CreatingStructure,
            message: "Creating directory structure...".to_string(),
            progress_percentage: 20,
        });

        if let Err(e) = directory::create_directory_structure(&self.config.app_data_path).await {
            return Ok(InstallationResult {
                success: false,
                config: self.config.clone(),
                claude_code_info: None,
                ollama_info: None,
                error_message: Some(format!("Failed to create directory structure: {}", e)),
            });
        }

        // Stage 3: Detecting dependencies
        progress_callback(InstallationProgress {
            stage: InstallationStage::DetectingDependencies,
            message: "Detecting dependencies...".to_string(),
            progress_percentage: 40,
        });

        let claude_code_info = detector::detect_claude_code().await?;
        let ollama_info = detector::detect_ollama().await?;

        self.config.claude_code_detected = claude_code_info.is_some();
        self.config.ollama_detected = ollama_info.is_some();

        // Stage 4: Installing Claude Code (if needed)
        if !self.config.claude_code_detected && self.config.is_first_install {
            progress_callback(InstallationProgress {
                stage: InstallationStage::InstallingClaudeCode,
                message: "Claude Code not detected. Installation required.".to_string(),
                progress_percentage: 60,
            });
            // Note: Actual installation will be handled by the frontend
        } else {
            progress_callback(InstallationProgress {
                stage: InstallationStage::InstallingClaudeCode,
                message: "Claude Code detected.".to_string(),
                progress_percentage: 60,
            });
        }

        // Stage 5: Finalizing
        progress_callback(InstallationProgress {
            stage: InstallationStage::Finalizing,
            message: "Finalizing installation...".to_string(),
            progress_percentage: 80,
        });

        // Create default files if first install
        if self.config.is_first_install {
            directory::create_default_files(&self.config.app_data_path).await?;
        }

        // Save installation state
        self.save_installation_state()?;

        // Stage 6: Complete
        progress_callback(InstallationProgress {
            stage: InstallationStage::Complete,
            message: "Installation complete!".to_string(),
            progress_percentage: 100,
        });

        Ok(InstallationResult {
            success: true,
            config: self.config.clone(),
            claude_code_info,
            ollama_info,
            error_message: None,
        })
    }

    /// Save installation state to a file
    fn save_installation_state(&self) -> Result<()> {
        let state_file = self.config.app_data_path.join(".installation_state.json");
        let state_json = serde_json::to_string_pretty(&self.config)
            .context("Failed to serialize installation state")?;

        std::fs::write(&state_file, state_json)
            .context("Failed to write installation state file")?;

        log::info!("Installation state saved to {:?}", state_file);
        Ok(())
    }

    /// Load installation state from file
    pub fn load_installation_state(app_data_path: &PathBuf) -> Result<InstallationConfig> {
        let state_file = app_data_path.join(".installation_state.json");

        if !state_file.exists() {
            return Ok(InstallationConfig {
                app_data_path: app_data_path.clone(),
                is_first_install: true,
                claude_code_detected: false,
                ollama_detected: false,
            });
        }

        let state_json = std::fs::read_to_string(&state_file)
            .context("Failed to read installation state file")?;

        let config: InstallationConfig = serde_json::from_str(&state_json)
            .context("Failed to parse installation state")?;

        Ok(config)
    }

    /// Re-detect dependencies (useful for updates)
    pub async fn redetect_dependencies(&mut self) -> Result<()> {
        let claude_code_info = detector::detect_claude_code().await?;
        let ollama_info = detector::detect_ollama().await?;

        self.config.claude_code_detected = claude_code_info.is_some();
        self.config.ollama_detected = ollama_info.is_some();

        self.save_installation_state()?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_installation_config_serialization() {
        let config = InstallationConfig {
            app_data_path: PathBuf::from("/test/path"),
            is_first_install: true,
            claude_code_detected: false,
            ollama_detected: false,
        };

        let json = serde_json::to_string(&config).unwrap();
        let deserialized: InstallationConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(config.is_first_install, deserialized.is_first_install);
        assert_eq!(config.claude_code_detected, deserialized.claude_code_detected);
        assert_eq!(config.ollama_detected, deserialized.ollama_detected);
    }

    #[test]
    fn test_installation_manager_creation() {
        let temp_dir = TempDir::new().unwrap();
        // Create a subdirectory that doesn't exist yet
        let non_existent_path = temp_dir.path().join("non_existent_dir");
        let manager = InstallationManager::new(non_existent_path);

        assert!(manager.is_first_install());
        assert!(!manager.config().claude_code_detected);
        assert!(!manager.config().ollama_detected);
    }

    #[test]
    fn test_save_and_load_installation_state() {
        let temp_dir = TempDir::new().unwrap();
        let mut manager = InstallationManager::new(temp_dir.path().to_path_buf());

        // Create the directory first
        std::fs::create_dir_all(temp_dir.path()).unwrap();

        manager.config.claude_code_detected = true;
        manager.save_installation_state().unwrap();

        let loaded_config = InstallationManager::load_installation_state(&temp_dir.path().to_path_buf()).unwrap();
        assert!(loaded_config.claude_code_detected);
    }
}
