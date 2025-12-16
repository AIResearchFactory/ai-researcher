use crate::models::project::{Project, ProjectError};
use crate::services::settings_service::SettingsService;
use chrono::Utc;
use std::fs;
use std::path::Path;

/// Service for managing projects - discovery, validation, and creation
pub struct ProjectService;

impl ProjectService {
    /// Scan projects directory and return all valid projects
    pub fn discover_projects() -> Result<Vec<Project>, ProjectError> {
        let projects_path = SettingsService::get_projects_path()
            .map_err(|e| ProjectError::ReadError(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to get projects path: {}", e)
            )))?;

        // Create projects directory if it doesn't exist
        if !projects_path.exists() {
            fs::create_dir_all(&projects_path)?;
            return Ok(Vec::new());
        }

        let mut projects = Vec::new();

        // Read all entries in the projects directory
        for entry in fs::read_dir(&projects_path)? {
            let entry = entry?;
            let path = entry.path();

            // Skip if not a directory
            if !path.is_dir() {
                continue;
            }

            // Check if this is a valid project
            if Self::is_valid_project(&path) {
                match Self::load_project(&path) {
                    Ok(project) => projects.push(project),
                    Err(e) => {
                        eprintln!("Warning: Failed to load project at {:?}: {}", path, e);
                        continue;
                    }
                }
            }
        }

        Ok(projects)
    }

    /// Load a single project by path
    pub fn load_project(path: &Path) -> Result<Project, ProjectError> {
        let project_file = path.join(".project.md");

        if !project_file.exists() {
            return Err(ProjectError::InvalidStructure(
                format!(".project.md not found at {:?}", project_file)
            ));
        }

        Project::from_markdown_file(&project_file)
    }

    /// Validate if a directory is a valid project (has .project.md with required fields)
    pub fn is_valid_project(path: &Path) -> bool {
        let project_file = path.join(".project.md");

        // Check if .project.md exists
        if !project_file.exists() {
            return false;
        }

        // Try to load and parse the project
        match Project::from_markdown_file(&project_file) {
            Ok(project) => {
                // Validate that required fields are not empty
                !project.id.is_empty() &&
                !project.name.is_empty() &&
                !project.goal.is_empty()
            }
            Err(_) => false,
        }
    }

    /// Create a new project with metadata file
    pub fn create_project(
        name: &str,
        goal: &str,
        skills: Vec<String>,
    ) -> Result<Project, ProjectError> {
        let projects_path = SettingsService::get_projects_path()
            .map_err(|e| ProjectError::ReadError(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to get projects path: {}", e)
            )))?;
        log::info!("in create_project");
        // Create projects directory if it doesn't exist
        if !projects_path.exists() {
            fs::create_dir_all(&projects_path)?;
            log::info!("projects path created");
        }

        // Generate project ID from name (lowercase, replace spaces with hyphens)
        let project_id = name
            .to_lowercase()
            .replace(' ', "-")
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-')
            .collect::<String>();

        let project_path = projects_path.join(&project_id);

        // Check if project already exists
        if project_path.exists() {
            return Err(ProjectError::InvalidStructure(
                format!("Project directory already exists at {:?}", project_path)
            ));
        }

        // Create project directory
        fs::create_dir_all(&project_path)?;
        log::info!("project folder created");
        let created = Utc::now();

        // Safe YAML formatting helpers
        let escape_yaml_string = |s: &str| -> String {
            format!("\"{}\"", s.replace('"', "\\\"").replace('\n', "\\n"))
        };

        // Format skills as YAML list
        let skills_yaml = if skills.is_empty() {
            "[]".to_string()
        } else {
            let items: Vec<String> = skills.iter()
                .map(|s| format!("- {}", escape_yaml_string(s)))
                .collect();
            format!("\n{}", items.join("\n"))
        };

        // Create .project.md with safe frontmatter
        let project_content = format!(
            r#"---
id: {}
name: {}
goal: {}
skills: {}
created: {}
---

# {}

## Goal
{}

## Skills
{}

## Notes
Add your project notes here...
"#,
            project_id,
            escape_yaml_string(name),
            escape_yaml_string(goal),
            skills_yaml,
            created.to_rfc3339(),
            name,
            goal,
            if skills.is_empty() {
                "None".to_string()
            } else {
                skills.iter().map(|s| format!("- {}", s)).collect::<Vec<_>>().join("\n")
            },
        );

        let project_file = project_path.join(".project.md");
        fs::write(&project_file, project_content)?;

        // Create default project settings
        let settings = crate::models::settings::ProjectSettings::default();
        SettingsService::save_project_settings(&project_path, &settings)?;

        // Load and return the newly created project
        Self::load_project(&project_path)
    }

    /// List all markdown files in a project (excluding .project.md and .settings.md)
    pub fn list_project_files(project_id: &str) -> Result<Vec<String>, ProjectError> {
        let projects_path = SettingsService::get_projects_path()
            .map_err(|e| ProjectError::ReadError(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to get projects path: {}", e)
            )))?;

        let project_path = projects_path.join(project_id);

        if !project_path.exists() {
            return Err(ProjectError::InvalidStructure(
                format!("Project directory not found at {:?}", project_path)
            ));
        }

        let mut markdown_files = Vec::new();

        // Read all entries in the project directory
        for entry in fs::read_dir(&project_path)? {
            let entry = entry?;
            let path = entry.path();

            // Skip directories
            if path.is_dir() {
                continue;
            }

            // Check if it's a markdown file
            if let Some(extension) = path.extension() {
                if extension == "md" {
                    // Exclude .project.md and .settings.md
                    if let Some(filename) = path.file_name() {
                        let filename_str = filename.to_string_lossy();
                        if filename_str != ".project.md" && filename_str != ".settings.md" {
                            markdown_files.push(filename_str.to_string());
                        }
                    }
                }
            }
        }

        // Sort alphabetically
        markdown_files.sort();

        Ok(markdown_files)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_is_valid_project() {
        let temp_dir = TempDir::new().unwrap();
        let project_path = temp_dir.path().join("test-project");
        fs::create_dir(&project_path).unwrap();

        // Create a valid .project.md
        let project_content = r#"---
id: test-project
name: Test Project
goal: Test the project validation
skills:
- rust
- testing
created: 2025-01-01T00:00:00Z
---

# Test Project
"#;

        fs::write(project_path.join(".project.md"), project_content).unwrap();

        assert!(ProjectService::is_valid_project(&project_path));
    }

    #[test]
    fn test_is_invalid_project_no_file() {
        let temp_dir = TempDir::new().unwrap();
        let project_path = temp_dir.path().join("test-project");
        fs::create_dir(&project_path).unwrap();

        assert!(!ProjectService::is_valid_project(&project_path));
    }

    #[test]
    fn test_list_project_files() {
        let temp_dir = TempDir::new().unwrap();
        let project_path = temp_dir.path().join("test-project");
        fs::create_dir(&project_path).unwrap();

        // Create some markdown files
        fs::write(project_path.join(".project.md"), "# Project").unwrap();
        fs::write(project_path.join(".settings.md"), "# Settings").unwrap();
        fs::write(project_path.join("research.md"), "# Research").unwrap();
        fs::write(project_path.join("notes.md"), "# Notes").unwrap();
        fs::write(project_path.join("data.txt"), "Some data").unwrap();

        // Set up environment to use temp dir as projects path
        std::env::set_var("HOME", temp_dir.path());

        let files = ProjectService::list_project_files("test-project");

        // This test would need proper setup of SettingsService to work
        // For now, we're just demonstrating the structure
    }
}
