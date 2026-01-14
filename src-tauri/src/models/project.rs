use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProjectError {
    #[error("Failed to read project file: {0}")]
    ReadError(#[from] std::io::Error),

    #[error("Failed to parse project metadata: {0}")]
    ParseError(String),

    #[error("Invalid project structure: {0}")]
    InvalidStructure(String),

    #[error("Settings error: {0}")]
    SettingsError(String),
}

impl From<crate::models::settings::SettingsError> for ProjectError {
    fn from(err: crate::models::settings::SettingsError) -> Self {
        ProjectError::SettingsError(format!("{}", err))
    }
}

/// Represents a project with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub goal: String,
    pub skills: Vec<String>,
    pub auto_save: bool,
    pub encryption_enabled: bool,
    pub custom_prompt: Option<String>,
    #[serde(rename = "created_at")]
    pub created: DateTime<Utc>,
    pub path: PathBuf,
}

/// Frontmatter from .project.md matching the YAML frontmatter structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub id: String,
    pub name: String,
    pub goal: String,
    pub skills: Vec<String>,
    pub created: String,
    #[serde(default = "default_true")]
    pub auto_save: bool,
    #[serde(default = "default_true")]
    pub encryption_enabled: bool,
    pub custom_prompt: Option<String>,
}

fn default_true() -> bool {
    true
}

impl Project {
    /// Load a project from its metadata file
    pub fn load<P: AsRef<Path>>(project_path: P) -> Result<Self, ProjectError> {
        let project_path = project_path.as_ref().to_path_buf();
        let metadata_path = project_path.join(".metadata").join("project.json");
        let legacy_settings_path = project_path.join(".researcher").join("settings.json");

        if !metadata_path.exists() && !legacy_settings_path.exists() {
            return Err(ProjectError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Project metadata not found at {:?}", project_path),
            )));
        }

        let mut metadata = if metadata_path.exists() {
            let content = fs::read_to_string(&metadata_path)?;
            serde_json::from_str::<ProjectMetadata>(&content)
                .map_err(|e| ProjectError::ParseError(format!("Failed to parse project JSON: {}", e)))?
        } else {
            // Should not happen if we are disciplined, but for safety:
            ProjectMetadata {
                id: project_path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                name: project_path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                goal: String::new(),
                skills: Vec::new(),
                created: Utc::now().to_rfc3339(),
                auto_save: true,
                encryption_enabled: true,
                custom_prompt: None,
            }
        };

        // Check for legacy settings to migrate
        if legacy_settings_path.exists() {
            log::info!("Found legacy settings at {:?}, migrating...", legacy_settings_path);
            let settings_content = fs::read_to_string(&legacy_settings_path)?;
            if let Ok(settings_json) = serde_json::from_str::<serde_json::Value>(&settings_content) {
                if let Some(auto_save) = settings_json.get("auto_save").and_then(|v| v.as_bool()) {
                    metadata.auto_save = auto_save;
                }
                if let Some(encryption_enabled) = settings_json.get("encryption_enabled").and_then(|v| v.as_bool()) {
                    metadata.encryption_enabled = encryption_enabled;
                }
                if let Some(custom_prompt) = settings_json.get("custom_prompt").and_then(|v| v.as_str()) {
                    metadata.custom_prompt = Some(custom_prompt.to_string());
                }
                if let Some(preferred_skills) = settings_json.get("preferred_skills").and_then(|v| v.as_array()) {
                    for skill in preferred_skills {
                        if let Some(skill_name) = skill.as_str() {
                            if !metadata.skills.contains(&skill_name.to_string()) {
                                metadata.skills.push(skill_name.to_string());
                            }
                        }
                    }
                }
                
                // Also check for goal/name if they were only in settings (unlikely but possible)
                if metadata.goal.is_empty() {
                    if let Some(goal) = settings_json.get("goal").and_then(|v| v.as_str()) {
                        metadata.goal = goal.to_string();
                    }
                }
            }

            // Save migrated metadata
            let mut project = Project {
                id: metadata.id.clone(),
                name: metadata.name.clone(),
                goal: metadata.goal.clone(),
                skills: metadata.skills.clone(),
                auto_save: metadata.auto_save,
                encryption_enabled: metadata.encryption_enabled,
                custom_prompt: metadata.custom_prompt.clone(),
                created: DateTime::parse_from_rfc3339(&metadata.created)
                    .map_err(|e| ProjectError::ParseError(format!("Invalid date format: {}", e)))?
                    .with_timezone(&Utc),
                path: project_path.clone(),
            };
            project.save()?;

            // Cleanup legacy files
            let _ = fs::remove_file(&legacy_settings_path);
            let legacy_dir = project_path.join(".researcher");
            if let Ok(entries) = fs::read_dir(&legacy_dir) {
                if entries.count() == 0 {
                    let _ = fs::remove_dir(legacy_dir);
                }
            }
        }

        // Parse created date
        let created = DateTime::parse_from_rfc3339(&metadata.created)
            .map_err(|e| ProjectError::ParseError(format!("Invalid date format: {}", e)))?
            .with_timezone(&Utc);

        Ok(Project {
            id: metadata.id,
            name: metadata.name,
            goal: metadata.goal,
            skills: metadata.skills,
            auto_save: metadata.auto_save,
            encryption_enabled: metadata.encryption_enabled,
            custom_prompt: metadata.custom_prompt,
            created,
            path: project_path,
        })
    }

    /// Save project metadata to its JSON file
    pub fn save(&self) -> Result<(), ProjectError> {
        let metadata_dir = self.path.join(".metadata");
        let metadata_path = metadata_dir.join("project.json");

        // Ensure .metadata directory exists
        if !metadata_dir.exists() {
            fs::create_dir_all(&metadata_dir)?;
        }

        let metadata = ProjectMetadata {
            id: self.id.clone(),
            name: self.name.clone(),
            goal: self.goal.clone(),
            skills: self.skills.clone(),
            created: self.created.to_rfc3339(),
            auto_save: self.auto_save,
            encryption_enabled: self.encryption_enabled,
            custom_prompt: self.custom_prompt.clone(),
        };

        let content = serde_json::to_string_pretty(&metadata)
            .map_err(|e| ProjectError::ParseError(format!("Failed to serialize project: {}", e)))?;

        fs::write(metadata_path, content)?;

        Ok(())
    }


    /// Validate that the project structure is correct
    pub fn validate_structure(&self) -> Result<(), ProjectError> {
        let metadata_file = self.path.join(".metadata").join("project.json");

        if !metadata_file.exists() {
            return Err(ProjectError::InvalidStructure(
                format!("Project metadata not found at {:?}", metadata_file)
            ));
        }

        if !self.path.exists() {
            return Err(ProjectError::InvalidStructure(
                format!("Project directory not found at {:?}", self.path)
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // No legacy migration tests needed as YAML/MD frontmatter support is removed.
}
