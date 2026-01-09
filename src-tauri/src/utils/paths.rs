use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

/// Get the app data directory (OS-specific)
/// Returns:
/// - macOS: ~/Library/Application Support/ai-researcher
/// - Linux: ~/.local/share/ai-researcher
/// - Windows: C:\Users\{username}\AppData\Roaming\ai-researcher
pub fn get_app_data_dir() -> Result<PathBuf> {
    let app_name = "ai-researcher";

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").context("HOME environment variable not set")?;
        Ok(PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join(app_name))
    }

    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").context("HOME environment variable not set")?;
        Ok(PathBuf::from(home)
            .join(".local")
            .join("share")
            .join(app_name))
    }

    #[cfg(target_os = "windows")]
    {
        let app_data = std::env::var("APPDATA").context("APPDATA environment variable not set")?;
        Ok(PathBuf::from(app_data).join(app_name))
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        anyhow::bail!("Unsupported operating system")
    }
}

/// Get the projects directory
/// Returns: {APP_DATA}/projects
pub fn get_projects_dir() -> Result<PathBuf> {
    if let Ok(dir) = std::env::var("PROJECTS_DIR") {
        return Ok(PathBuf::from(dir));
    }
    let app_data = get_app_data_dir()?;
    Ok(app_data.join("projects"))
}

/// Get the skills directory
/// Returns: {APP_DATA}/skills
pub fn get_skills_dir() -> Result<PathBuf> {
    let app_data = get_app_data_dir()?;
    Ok(app_data.join("skills"))
}

/// Get the global settings file path
/// Returns: {APP_DATA}/settings.json
pub fn get_global_settings_path() -> Result<PathBuf> {
    let app_data = get_app_data_dir()?;
    Ok(app_data.join("settings.json"))
}

/// Get the secrets file path
/// Returns: {APP_DATA}/secrets.json
pub fn get_secrets_path() -> Result<PathBuf> {
    let app_data = get_app_data_dir()?;
    Ok(app_data.join("secrets.json"))
}

/// Ensure the complete directory structure exists
/// Creates:
/// - {APP_DATA}/
/// - {APP_DATA}/projects/
/// - {APP_DATA}/projects/
/// - {APP_DATA}/skills/
/// - {APP_DATA}/settings.json (if not exists)
pub fn initialize_directory_structure() -> Result<()> {
    // Get the app data directory
    let app_data = get_app_data_dir()?;

    // Create the main app data directory
    if !app_data.exists() {
        fs::create_dir_all(&app_data)
            .context(format!("Failed to create app data directory: {:?}", app_data))?;
        log::info!("Created app data directory: {:?}", app_data);
    }

    // Create projects directory
    let projects_dir = get_projects_dir()?;
    if !projects_dir.exists() {
        fs::create_dir_all(&projects_dir)
            .context(format!("Failed to create projects directory: {:?}", projects_dir))?;
        log::info!("Created projects directory: {:?}", projects_dir);
    }

    // Create skills directory
    let skills_dir = get_skills_dir()?;
    if !skills_dir.exists() {
        fs::create_dir_all(&skills_dir)
            .context(format!("Failed to create skills directory: {:?}", skills_dir))?;
        log::info!("Created skills directory: {:?}", skills_dir);
    }

    // Create default skill template if it doesn't exist
    let template_path = skills_dir.join("template.md");
    if !template_path.exists() {
        let default_template = r#"---
skill_id: {{id}}
name: {{name}}
version: 1.0.0
description: {{description}}
capabilities:
  - web_search
  - data_analysis
  - summarization
  - citation
created: {{created}}
updated: {{updated}}
---
# {{name}}

## Overview
{{overview}}

## Prompt Template
{{template}}

## Parameters

## Examples

## Usage Guidelines
"#;
        fs::write(&template_path, default_template)
            .context(format!("Failed to create skill template: {:?}", template_path))?;
        log::info!("Created default skill template: {:?}", template_path);
    }

    // Create default settings file if it doesn't exist
    let settings_path = get_global_settings_path()?;
    if !settings_path.exists() {
        let default_settings = r#"{
  "theme": "light",
  "default_model": "claude-sonnet-4",
  "notifications_enabled": true,
  "llm_provider": "claude"
}"#;
        fs::write(&settings_path, default_settings)
            .context(format!("Failed to create settings file: {:?}", settings_path))?;
        log::info!("Created default settings file: {:?}", settings_path);
    }

    log::info!("Directory structure initialized successfully");
    Ok(())
}

/// Get a specific project's directory path
pub fn get_project_dir(project_id: &str) -> Result<PathBuf> {
    let projects_dir = get_projects_dir()?;
    Ok(projects_dir.join(project_id))
}

/// Get a specific project's metadata file path
pub fn get_project_file_path(project_id: &str) -> Result<PathBuf> {
    let project_dir = get_project_dir(project_id)?;
    Ok(project_dir.join(".researcher").join("project.json"))
}

/// Get a specific project's settings file path
pub fn get_project_settings_path(project_id: &str) -> Result<PathBuf> {
    let project_dir = get_project_dir(project_id)?;
    Ok(project_dir.join(".researcher").join("settings.json"))
}

/// Check if a project exists
pub fn project_exists(project_id: &str) -> Result<bool> {
    let project_file = get_project_file_path(project_id)?;
    Ok(project_file.exists())
}

/// List all project directories
pub fn list_project_dirs() -> Result<Vec<PathBuf>> {
    let projects_dir = get_projects_dir()?;

    if !projects_dir.exists() {
        return Ok(Vec::new());
    }

    let mut project_dirs = Vec::new();

    for entry in fs::read_dir(&projects_dir)
        .context(format!("Failed to read projects directory: {:?}", projects_dir))?
    {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            // Check if it has a .researcher/project.json file
            let project_file = path.join(".researcher").join("project.json");
            if project_file.exists() {
                project_dirs.push(path);
            }
        }
    }

    Ok(project_dirs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_app_data_dir() {
        let result = get_app_data_dir();
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("ai-researcher"));
    }

    #[test]
    fn test_get_projects_dir() {
        let result = get_projects_dir();
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("projects"));
    }

    #[test]
    fn test_get_skills_dir() {
        let result = get_skills_dir();
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("skills"));
    }

    #[test]
    fn test_get_global_settings_path() {
        let result = get_global_settings_path();
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("settings.json"));
    }
}
