use app_lib::models::project::Project;
use app_lib::models::settings::{GlobalSettings, ProjectSettings};
use app_lib::services::project_service::ProjectService;
use app_lib::services::settings_service::SettingsService;
use std::fs;
use tempfile::TempDir;

#[test]
fn test_settings_service_workflow() {
    let temp_dir = TempDir::new().unwrap();
    let project_path = temp_dir.path().join("test-project");
    fs::create_dir(&project_path).unwrap();

    // Create and save project settings
    let settings = ProjectSettings {
        custom_prompt: Some("Test prompt for AI".to_string()),
        preferred_skills: vec!["rust".to_string(), "testing".to_string()],
    };

    let save_result = SettingsService::save_project_settings(&project_path, &settings);
    assert!(save_result.is_ok(), "Failed to save project settings");

    // Load project settings
    let loaded = SettingsService::load_project_settings(&project_path).unwrap();
    assert!(loaded.is_some(), "Settings should exist");

    let loaded_settings = loaded.unwrap();
    assert_eq!(
        loaded_settings.custom_prompt,
        Some("Test prompt for AI".to_string())
    );
    assert_eq!(loaded_settings.preferred_skills.len(), 2);
    assert_eq!(loaded_settings.preferred_skills[0], "rust");
}

#[test]
fn test_project_service_workflow() {
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

This is a test project for validation purposes.
"#;

    fs::write(project_path.join(".project.md"), project_content).unwrap();

    // Validate the project
    assert!(
        ProjectService::is_valid_project(&project_path),
        "Project should be valid"
    );

    // Load the project
    let project = ProjectService::load_project(&project_path);
    assert!(project.is_ok(), "Failed to load project");

    let project = project.unwrap();
    assert_eq!(project.id, "test-project");
    assert_eq!(project.name, "Test Project");
    assert_eq!(project.goal, "Test the project validation");
    assert_eq!(project.skills.len(), 2);
}

#[test]
fn test_project_files_listing() {
    let temp_dir = TempDir::new().unwrap();

    // Set temporary projects directory
    std::env::set_var("HOME", temp_dir.path().to_str().unwrap());

    let projects_path = temp_dir.path().join(".ai-researcher").join("projects");
    fs::create_dir_all(&projects_path).unwrap();

    let project_path = projects_path.join("test-project");
    fs::create_dir(&project_path).unwrap();

    // Create project metadata
    let project_content = r#"---
id: test-project
name: Test Project
goal: Test file listing
skills:
- rust
created: 2025-01-01T00:00:00Z
---

# Test Project
"#;

    fs::write(project_path.join(".project.md"), project_content).unwrap();

    // Create various files
    fs::write(project_path.join(".settings.md"), "# Settings").unwrap();
    fs::write(project_path.join("research.md"), "# Research").unwrap();
    fs::write(project_path.join("notes.md"), "# Notes").unwrap();
    fs::write(project_path.join("data.txt"), "Some data").unwrap();

    // List project files
    let files = ProjectService::list_project_files("test-project");
    assert!(files.is_ok(), "Failed to list project files");

    let files = files.unwrap();
    assert_eq!(files.len(), 2, "Should have 2 markdown files");
    assert!(files.contains(&"notes.md".to_string()));
    assert!(files.contains(&"research.md".to_string()));
    assert!(!files.contains(&".project.md".to_string()));
    assert!(!files.contains(&".settings.md".to_string()));
    assert!(!files.contains(&"data.txt".to_string()));

    // Clean up env var
    std::env::remove_var("HOME");
}

#[test]
fn test_invalid_project_detection() {
    let temp_dir = TempDir::new().unwrap();
    let project_path = temp_dir.path().join("invalid-project");
    fs::create_dir(&project_path).unwrap();

    // No .project.md file
    assert!(
        !ProjectService::is_valid_project(&project_path),
        "Should be invalid without .project.md"
    );

    // Create invalid .project.md (missing frontmatter)
    fs::write(project_path.join(".project.md"), "# Just a heading").unwrap();

    assert!(
        !ProjectService::is_valid_project(&project_path),
        "Should be invalid without proper frontmatter"
    );
}
