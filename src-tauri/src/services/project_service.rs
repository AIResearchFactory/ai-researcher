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

            log::info!("Checking directory for valid project: {:?}", path);

            // Check if this is a valid project
            if Self::is_valid_project(&path) {
                match Self::load_project(&path) {
                    Ok(project) => {
                        log::info!("Successfully loaded project: {} (ID: {})", project.name, project.id);
                        projects.push(project)
                    },
                    Err(e) => {
                        log::error!("Failed to load project at {:?}: {}", path, e);
                        continue;
                    }
                }
            } else {
                log::warn!("Directory is not a valid project (missing or invalid .project.md): {:?}", path);
            }
        }

        log::info!("Discovered {} valid projects in {:?}", projects.len(), projects_path);
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

    pub fn load_project_by_id(project_id: &str) -> Result<Project, ProjectError> {
        let projects_path = SettingsService::get_projects_path()
            .map_err(|e| ProjectError::ReadError(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to get projects path: {}", e)
            )))?;
        log::info!("Loading project by ID '{}' from projects path: {:?}", project_id, projects_path);
        
        let project_path = projects_path.join(project_id);
        Self::load_project(&project_path)
    }

    /// Validate if a directory is a valid project (has .project.md with required fields)
    pub fn is_valid_project(path: &Path) -> bool {
        let project_file = path.join(".project.md");

        // Check if .project.md exists
        if !project_file.exists() {
            log::debug!(".project.md missing in {:?}", path);
            return false;
        }

        // Try to load and parse the project
        match Project::from_markdown_file(&project_file) {
            Ok(project) => {
                // Validate that required fields are not empty
                let is_valid = !project.id.is_empty() &&
                               !project.name.is_empty() &&
                               !project.goal.is_empty();
                if !is_valid {
                    log::warn!("Project at {:?} has empty required fields: id='{}', name='{}', goal='{}'", 
                               path, project.id, project.name, project.goal);
                }
                is_valid
            }
            Err(e) => {
                log::warn!("Failed to parse .project.md in {:?}: {}", path, e);
                false
            },
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

## Scope
{}

## Constraints
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
            // Scope and Constraints added for compliance
            "Define the scope of the project here...",
            "List any constraints or limitations...",
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

    /// Update project metadata in .project.md
    pub fn update_project_metadata(
        project_id: &str,
        name: Option<String>,
        goal: Option<String>,
    ) -> Result<(), ProjectError> {
        let project = Self::load_project_by_id(project_id)?;
        let project_file = project.path.join(".project.md");
        
        let content = fs::read_to_string(&project_file)?;
        
        // Find frontmatter
        let start_pos = content.find("---").ok_or(ProjectError::ParseError("No frontmatter".to_string()))?;
        let end_pos = content[start_pos + 3..].find("---").ok_or(ProjectError::ParseError("No closing frontmatter".to_string()))? + start_pos + 3;
        
        let frontmatter = &content[start_pos + 3..end_pos];
        let mut metadata: serde_yaml::Value = serde_yaml::from_str(frontmatter)
            .map_err(|e| ProjectError::ParseError(format!("Failed to parse YAML: {}", e)))?;
        
        if let Some(new_name) = name {
            metadata["name"] = serde_yaml::Value::String(new_name.clone());
        }
        
        if let Some(new_goal) = goal {
            metadata["goal"] = serde_yaml::Value::String(new_goal);
        }
        
        let new_frontmatter = serde_yaml::to_string(&metadata)
            .map_err(|e| ProjectError::ParseError(format!("Failed to serialize YAML: {}", e)))?;
            
        let new_content = format!("---\n{}---{}", new_frontmatter, &content[end_pos + 3..]);
        
        fs::write(&project_file, new_content)?;
        
        Ok(())
    }

    /// List all markdown files in a project (excluding .project.md and .settings.md)
    pub fn list_project_files(project_id: &str) -> Result<Vec<String>, ProjectError> {
        let project_id = project_id.trim();
        let projects_path = SettingsService::get_projects_path()
            .map_err(|e| ProjectError::ReadError(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to get projects path: {}", e)
            )))?;

        let mut project_path = projects_path.join(project_id);
        log::info!("Attempting to list files for project: {:?} at path: {:?}", project_id, project_path);

        // If path doesn't exist, it might be because the folder name is different from project_id
        // Try to find the project by scanning
        if !project_path.exists() {
            log::warn!("Project path {:?} not found, scanning projects directory for ID: {}", project_path, project_id);
            let projects = Self::discover_projects()?;
            if let Some(found_project) = projects.into_iter().find(|p| p.id == project_id) {
                project_path = found_project.path;
                log::info!("Found project folder via scan: {:?}", project_path);
            } else {
                log::error!("Project with ID '{}' not found in {:?}", project_id, projects_path);
                return Err(ProjectError::InvalidStructure(
                    format!("Project directory not found for ID '{}' at {:?}. Make sure the .project.md file has the correct ID.", project_id, projects_path)
                ));
            }
        }

        let mut markdown_files = Vec::new();

        // Read all entries in the project directory
        let entries = fs::read_dir(&project_path)
            .map_err(|e| {
                log::error!("Failed to read directory {:?}: {}", project_path, e);
                ProjectError::ReadError(e)
            })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                log::error!("Failed to read directory entry in {:?}: {}", project_path, e);
                ProjectError::ReadError(e)
            })?;
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

        let _files = ProjectService::list_project_files("test-project");

        // This test would need proper setup of SettingsService to work
        // For now, we're just demonstrating the structure
    }
}
