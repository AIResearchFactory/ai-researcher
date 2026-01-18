use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

pub struct FileService;

use crate::services::settings_service::SettingsService;

impl FileService {
    /// Get the path to a project's file
    fn get_file_path(project_id: &str, file_name: &str) -> Result<PathBuf> {
        let projects_path = SettingsService::get_projects_path()
            .context("Failed to get projects path")?;
        Ok(projects_path.join(project_id).join(file_name))
    }

    /// Read a file from a project
    pub fn read_file(project_id: &str, file_name: &str) -> Result<String> {
        let file_path = Self::get_file_path(project_id, file_name)?;

        if !file_path.exists() {
            anyhow::bail!("File does not exist: {}", file_name);
        }

        fs::read_to_string(&file_path)
            .context("Failed to read file")
    }

    /// Write content to a file in a project
    pub fn write_file(project_id: &str, file_name: &str, content: &str) -> Result<()> {
        let file_path = Self::get_file_path(project_id, file_name)?;

        // Ensure parent directory exists
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).context("Failed to create directory")?;
        }

        fs::write(&file_path, content)
            .context("Failed to write file")
    }

    /// Delete a file from a project
    pub fn delete_file(project_id: &str, file_name: &str) -> Result<()> {
        let file_path = Self::get_file_path(project_id, file_name)?;

        if !file_path.exists() {
            anyhow::bail!("File does not exist: {}", file_name);
        }

        fs::remove_file(&file_path)
            .context("Failed to delete file")
    }
}

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    #[test]
    fn test_write_and_read_file() {
        let _temp_dir = TempDir::new().unwrap();
        let _project_id = "test-project";
        let _file_name = "test.md";
        let _content = "Test content";

        // This test would need to mock the home directory
        // For now, it's a placeholder
    }
}
