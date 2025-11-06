use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

pub struct FileService;

impl FileService {
    /// Get the path to a project's file
    fn get_file_path(project_id: &str, file_name: &str) -> Result<PathBuf> {
        let home_dir = dirs::home_dir().context("Failed to get home directory")?;
        let base_dir = home_dir.join(".ai-researcher");
        Ok(base_dir.join(project_id).join(file_name))
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
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_write_and_read_file() {
        let temp_dir = TempDir::new().unwrap();
        let project_id = "test-project";
        let file_name = "test.md";
        let content = "Test content";

        // This test would need to mock the home directory
        // For now, it's a placeholder
    }
}
