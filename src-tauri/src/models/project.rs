use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;
use crate::utils::migration_utils::strip_quotes;

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
}

impl Project {
    /// Load a project from its metadata file
    pub fn load<P: AsRef<Path>>(project_path: P) -> Result<Self, ProjectError> {
        let project_path = project_path.as_ref().to_path_buf();
        let metadata_path = project_path.join(".researcher").join("project.json");

        if !metadata_path.exists() {
            // Check for legacy .project.md for migration
            let legacy_path = project_path.join(".project.md");
            if legacy_path.exists() {
                if let Ok(content) = fs::read_to_string(&legacy_path) {
                    if let Ok(project) = Self::parse_from_markdown(&content, project_path.clone()) {
                        // Migration success
                        return Ok(project);
                    }
                }
            }
            return Err(ProjectError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Project metadata not found at {:?}", metadata_path),
            )));
        }

        let content = fs::read_to_string(&metadata_path)?;
        let metadata: ProjectMetadata = serde_json::from_str(&content)
            .map_err(|e| ProjectError::ParseError(format!("Failed to parse project JSON: {}", e)))?;

        // Parse created date
        let created = DateTime::parse_from_rfc3339(&metadata.created)
            .map_err(|e| ProjectError::ParseError(format!("Invalid date format: {}", e)))?
            .with_timezone(&Utc);

        Ok(Project {
            id: metadata.id,
            name: metadata.name,
            goal: metadata.goal,
            skills: metadata.skills,
            created,
            path: project_path,
        })
    }

    /// Save project metadata to its JSON file
    pub fn save(&self) -> Result<(), ProjectError> {
        let metadata_dir = self.path.join(".researcher");
        let metadata_path = metadata_dir.join("project.json");

        // Ensure .researcher directory exists
        if !metadata_dir.exists() {
            fs::create_dir_all(&metadata_dir)?;
        }

        let metadata = ProjectMetadata {
            id: self.id.clone(),
            name: self.name.clone(),
            goal: self.goal.clone(),
            skills: self.skills.clone(),
            created: self.created.to_rfc3339(),
        };

        let content = serde_json::to_string_pretty(&metadata)
            .map_err(|e| ProjectError::ParseError(format!("Failed to serialize project: {}", e)))?;

        fs::write(metadata_path, content)?;

        Ok(())
    }

    /// Parse project metadata from markdown content (Legacy migration)
    pub fn parse_from_markdown(content: &str, project_path: PathBuf) -> Result<Self, ProjectError> {
        let (frontmatter_yml, _) = crate::models::settings::GlobalSettings::extract_frontmatter_raw(content);
        if frontmatter_yml.is_empty() {
            return Err(ProjectError::ParseError("No frontmatter found".to_string()));
        }

        let json_str = Self::legacy_yaml_to_json(&frontmatter_yml)?;
        let metadata: ProjectMetadata = serde_json::from_str(&json_str)
            .map_err(|e| ProjectError::ParseError(format!("Failed to parse YAML: {}", e)))?;

        let created = if let Ok(dt) = DateTime::parse_from_rfc3339(&metadata.created) {
            dt.with_timezone(&Utc)
        } else {
            Utc::now()
        };

        Ok(Project {
            id: metadata.id,
            name: metadata.name,
            goal: metadata.goal,
            skills: metadata.skills,
            created,
            path: project_path,
        })
    }

    /// Simple YAML to JSON converter (Legacy migration)
    fn legacy_yaml_to_json(legacy_yaml: &str) -> Result<String, ProjectError> {
        let mut json_map = std::collections::HashMap::new();
        let mut current_key: Option<String> = None;
        let mut array_items: Vec<String> = Vec::new();

        for line in legacy_yaml.lines() {
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
                } else if value == "[]" {
                     json_map.insert(key, serde_json::json!(Vec::<String>::new()));
                } else {
                    json_map.insert(key, serde_json::json!(strip_quotes(value)));
                }
            }
        }

        if let Some(key) = current_key {
            if !array_items.is_empty() {
                json_map.insert(key, serde_json::json!(array_items));
            } else {
                json_map.insert(key, serde_json::json!(""));
            }
        }

        serde_json::to_string(&json_map)
            .map_err(|e| ProjectError::ParseError(format!("Failed to convert to JSON: {}", e)))
    }

    /// Validate that the project structure is correct
    pub fn validate_structure(&self) -> Result<(), ProjectError> {
        let metadata_file = self.path.join(".researcher").join("project.json");

        if !metadata_file.exists() {
            // Check legacy for validation if needed
            if !self.path.join(".project.md").exists() {
                return Err(ProjectError::InvalidStructure(
                    format!("Project metadata not found at {:?}", metadata_file)
                ));
            }
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

    #[test]
    fn test_parse_frontmatter() {
        let markdown = r#"---
id: test-project
name: Test Project
goal: A test project for validation
skills:
- skill1
- skill2
created: 2025-01-01T00:00:00Z
---

# Project Content

This is the project description.
"#;

        let project = Project::parse_from_markdown(markdown, PathBuf::from("/tmp/test"));
        assert!(project.is_ok());

        let project = project.unwrap();
        assert_eq!(project.id, "test-project");
        assert_eq!(project.name, "Test Project");
        assert_eq!(project.skills.len(), 2);
    }

    #[test]
    fn test_parse_empty_skills() {
        let markdown = r#"---
id: test-empty
name: Test Empty
goal: Test empty skills
skills: []
created: 2025-01-01T00:00:00Z
---

# Content
"#;
        let project = Project::parse_from_markdown(markdown, PathBuf::from("/tmp/test"));
        assert!(project.is_ok(), "Failed to parse empty skills: {:?}", project.err());
        let project = project.unwrap();
        assert!(project.skills.is_empty());
    }
}
