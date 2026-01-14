use crate::models::settings::{GlobalSettings, ProjectSettings, SettingsError};
use crate::utils::paths;
use std::path::{Path, PathBuf};

/// Service for managing global and project-specific settings
pub struct SettingsService;

impl SettingsService {
    /// Get the default location for global settings file
    fn global_settings_path() -> Result<PathBuf, SettingsError> {
        paths::get_global_settings_path()
            .map_err(|e| {
                SettingsError::ReadError(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    format!("Could not find global settings path: {}", e),
                ))
            })
    }

    /// Load global settings from .settings.md in the user's home directory
    /// If the file doesn't exist, returns default settings
    pub fn load_global_settings() -> Result<GlobalSettings, SettingsError> {
        let path = Self::global_settings_path()?;
        GlobalSettings::load(&path)
    }

    /// Save global settings to .settings.md in the user's home directory
    /// Creates the directory if it doesn't exist
    pub fn save_global_settings(settings: &GlobalSettings) -> Result<(), SettingsError> {
        let path = Self::global_settings_path()?;

        // Ensure the parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                SettingsError::WriteError(format!("Failed to create settings directory: {}", e))
            })?;
        }

        settings.save(&path)
    }


    /// Get the projects directory path from global settings
    /// Falls back to a default location if not configured
    pub fn get_projects_path() -> Result<PathBuf, SettingsError> {
        let settings = Self::load_global_settings()?;

        if let Some(projects_path) = settings.projects_path {
            log::info!("Using custom projects path from settings: {:?}", projects_path);
            // First check if a 'projects' folder exists inside the custom path
            let internal_projects = projects_path.join("projects");
            if internal_projects.exists() && internal_projects.is_dir() {
                log::info!("Found internal 'projects' directory: {:?}", internal_projects);
                return Ok(internal_projects);
            }
            Ok(projects_path)
        } else {
            let default_path = paths::get_projects_dir()
                .map_err(|e| {
                    SettingsError::ReadError(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        format!("Could not find projects directory: {}", e),
                    ))
                })?;
            log::info!("Using default projects path: {:?}", default_path);
            Ok(default_path)
        }
    }

    /// Get the skills directory path from global settings
    /// If projects_path is custom, tries to place skills directory adjacent to it
    pub fn get_skills_path() -> Result<PathBuf, SettingsError> {
        let settings = Self::load_global_settings()?;

        if let Some(projects_path) = settings.projects_path {
            // First check if skills folder exists inside projects_path
            let internal_skills = projects_path.join("skills");
            if internal_skills.exists() {
                return Ok(internal_skills);
            }

            // If not found inside, try adjacent (old behavior for /path/to/projects)
            if let Some(parent) = projects_path.parent() {
                let adjacent_skills = parent.join("skills");
                if adjacent_skills.exists() {
                    return Ok(adjacent_skills);
                }
            }

            // Both failed - create skills folder in projects_path as per user requirement
            // This ensures the directory exists before returning the path
            if let Err(e) = std::fs::create_dir_all(&internal_skills) {
                log::error!("Failed to create skills directory in projects path: {}", e);
            }
            
            Ok(internal_skills)
        } else {
            // Default to the standard skills directory from utils::paths
            paths::get_skills_dir()
                .map_err(|e| {
                    SettingsError::ReadError(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        format!("Could not find skills directory: {}", e),
                    ))
                })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

}
