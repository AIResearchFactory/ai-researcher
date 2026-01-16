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
    /// Parse a Project from a markdown file with frontmatter
    pub fn from_markdown_file<P: AsRef<Path>>(path: P) -> Result<Self, ProjectError> {
        let path = path.as_ref();
        let content = fs::read_to_string(path)?;

        Self::parse_from_markdown(&content, path.parent().unwrap_or(path).to_path_buf())
    }

    /// Parse project metadata from markdown content
    pub fn parse_from_markdown(content: &str, project_path: PathBuf) -> Result<Self, ProjectError> {
        // Extract YAML frontmatter between --- delimiters
        let frontmatter = Self::extract_frontmatter(content)
            .map_err(|e| {
                log::error!("Failed to extract frontmatter from project at {:?}: {}", project_path, e);
                e
            })?;

        // Parse YAML frontmatter using serde_yaml
        let metadata: ProjectMetadata = serde_yaml::from_str(&frontmatter)
            .map_err(|e| {
                log::error!("Failed to parse YAML frontmatter for project at {:?}: {}\nFrontmatter content:\n{}", project_path, e, frontmatter);
                ProjectError::ParseError(format!("Failed to parse YAML: {}", e))
            })?;

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

    /// Extract YAML frontmatter from markdown content
    fn extract_frontmatter(content: &str) -> Result<String, ProjectError> {
        let lines: Vec<&str> = content.lines().collect();

        // Check if file starts with ---
        if lines.is_empty() || lines[0].trim() != "---" {
            return Err(ProjectError::ParseError(
                "No frontmatter found (missing opening ---)".to_string()
            ));
        }

        // Find closing ---
        let end_index = lines[1..]
            .iter()
            .position(|&line| line.trim() == "---")
            .ok_or_else(|| ProjectError::ParseError("No closing --- found".to_string()))?
            + 1;

        // Extract frontmatter lines (between the --- delimiters)
        let frontmatter_lines = &lines[1..end_index];
        Ok(frontmatter_lines.join("\n"))
    }

    /// Validate that the project structure is correct
    pub fn validate_structure(&self) -> Result<(), ProjectError> {
        let project_file = self.path.join(".project.md");

        if !project_file.exists() {
            return Err(ProjectError::InvalidStructure(
                format!(".project.md not found at {:?}", project_file)
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
    use std::path::PathBuf;

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
