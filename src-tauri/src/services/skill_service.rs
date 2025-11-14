//! Skill Service - Manages skill files in the application
//!
//! This service provides functionality for:
//! - Discovering and loading skills from the skills directory
//! - Creating new skills with templates
//! - Saving and validating skills
//! - Filtering skills by category
//! - Managing skill lifecycle (create, read, update, delete)
//!
//! Task 3.6 Implementation: Skills Service
//! All skills are stored as markdown files in {APP_DATA}/skills/

use crate::models::skill::{Skill, SkillError};
use crate::utils::paths;
use anyhow::Result;
use std::fs;
use walkdir::WalkDir;

pub struct SkillService;

impl SkillService {
    /// Scan skills directory and load all .md files (max depth 1)
    /// Skip files starting with .
    /// Parse each using Skill::from_markdown_file()
    /// Return list of all valid skills
    pub fn discover_skills() -> Result<Vec<Skill>, SkillError> {
        let skills_dir = paths::get_skills_dir()
            .map_err(|e| SkillError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get skills directory: {}", e),
            )))?;

        // Ensure skills directory exists
        if !skills_dir.exists() {
            fs::create_dir_all(&skills_dir)?;
            return Ok(Vec::new());
        }

        let mut skills = Vec::new();

        // Use WalkDir with max_depth(1) to scan only the immediate directory
        for entry in WalkDir::new(&skills_dir)
            .max_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();

            // Skip if it's a directory
            if !path.is_file() {
                continue;
            }

            // Skip files starting with .
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                if file_name.starts_with('.') {
                    continue;
                }
            }

            // Only process .md files
            if path.extension().and_then(|s| s.to_str()) != Some("md") {
                continue;
            }

            // Try to parse the skill
            match Skill::from_markdown_file(&path.to_path_buf()) {
                Ok(skill) => skills.push(skill),
                Err(e) => {
                    eprintln!("Warning: Failed to load skill at {:?}: {}", path, e);
                    continue;
                }
            }
        }

        // Sort by name for consistent ordering
        skills.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(skills)
    }

    /// Load a specific skill by ID
    /// Construct path: {skills_dir}/{skill_id}.md
    /// Check if file exists
    /// Parse and return skill
    /// Return error if not found
    pub fn load_skill(skill_id: &str) -> Result<Skill, SkillError> {
        let skills_dir = paths::get_skills_dir()
            .map_err(|e| SkillError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get skills directory: {}", e),
            )))?;

        let skill_path = skills_dir.join(format!("{}.md", skill_id));

        if !skill_path.exists() {
            return Err(SkillError::InvalidStructure(format!(
                "Skill not found: {}",
                skill_id
            )));
        }

        Skill::from_markdown_file(&skill_path)
    }

    /// Save a skill to disk
    /// Validate skill using skill.validate()
    /// Convert to markdown using skill.to_markdown()
    /// Write to {skills_dir}/{skill.id}.md
    pub fn save_skill(skill: &Skill) -> Result<(), SkillError> {
        // Validate skill first
        skill.validate().map_err(|errors| {
            SkillError::ValidationError(errors)
        })?;

        let skills_dir = paths::get_skills_dir()
            .map_err(|e| SkillError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get skills directory: {}", e),
            )))?;

        // Ensure skills directory exists
        if !skills_dir.exists() {
            fs::create_dir_all(&skills_dir)?;
        }

        let skill_path = skills_dir.join(format!("{}.md", skill.id));
        let content = skill.to_markdown();

        fs::write(&skill_path, content)?;

        Ok(())
    }

    /// Delete a skill by ID
    /// Check if file exists
    /// Delete the file
    /// Return error if not found
    pub fn delete_skill(skill_id: &str) -> Result<(), SkillError> {
        let skills_dir = paths::get_skills_dir()
            .map_err(|e| SkillError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get skills directory: {}", e),
            )))?;

        let skill_path = skills_dir.join(format!("{}.md", skill_id));

        if !skill_path.exists() {
            return Err(SkillError::InvalidStructure(format!(
                "Skill not found: {}",
                skill_id
            )));
        }

        fs::remove_file(&skill_path)?;

        Ok(())
    }

    /// Get skills filtered by category
    /// Note: SkillCategory is not currently defined in the Skill model.
    /// This method is provided for future compatibility when categories are added.
    /// Currently, this filters by checking if the category string appears in capabilities.
    pub fn get_skills_by_category(category: &str) -> Result<Vec<Skill>, SkillError> {
        let all_skills = Self::discover_skills()?;

        let filtered_skills: Vec<Skill> = all_skills
            .into_iter()
            .filter(|skill| {
                // Check if the category appears in capabilities
                skill.capabilities.iter().any(|cap| {
                    cap.to_lowercase().contains(&category.to_lowercase())
                })
            })
            .collect();

        Ok(filtered_skills)
    }

    /// Create a skill template with default values
    /// Generate a new Skill with default values
    /// Use provided id, name, description, category
    /// Set default prompt template
    /// Return the Skill (don't save yet)
    pub fn create_skill_template(
        id: String,
        name: String,
        description: String,
        capabilities: Vec<String>,
    ) -> Skill {
        let now = chrono::Utc::now().to_rfc3339();

        Skill {
            id: id.clone(),
            name,
            description,
            capabilities,
            prompt_template: format!(
                "You are an AI assistant with the following skill: {}\n\nPlease help the user with their request.",
                id
            ),
            examples: vec![],
            parameters: vec![],
            version: "1.0.0".to_string(),
            created: now.clone(),
            updated: now,
            file_path: std::path::PathBuf::from(format!("{}.md", id)),
        }
    }

    // ===== Backward Compatibility Methods =====
    // These methods maintain backward compatibility with existing commands

    /// Alias for discover_skills() - for backward compatibility
    pub fn get_all_skills() -> Result<Vec<Skill>, SkillError> {
        Self::discover_skills()
    }

    /// Alias for load_skill() - for backward compatibility
    pub fn get_skill(skill_id: &str) -> Result<Skill, SkillError> {
        Self::load_skill(skill_id)
    }

    /// Create a new skill and save it immediately
    /// This is a convenience method that combines create_skill_template and save_skill
    pub fn create_skill(
        name: &str,
        description: &str,
        prompt_template: &str,
        capabilities: Vec<String>,
    ) -> Result<Skill, SkillError> {
        // Generate skill ID from name
        let skill_id = name
            .to_lowercase()
            .replace(' ', "-")
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
            .collect::<String>();

        // Check if skill already exists
        let skills_dir = paths::get_skills_dir()
            .map_err(|e| SkillError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get skills directory: {}", e),
            )))?;

        let skill_path = skills_dir.join(format!("{}.md", skill_id));
        if skill_path.exists() {
            return Err(SkillError::InvalidStructure(format!(
                "Skill already exists: {}",
                skill_id
            )));
        }

        // Create skill template
        let mut skill = Self::create_skill_template(
            skill_id,
            name.to_string(),
            description.to_string(),
            capabilities,
        );

        // Override the prompt template if provided
        if !prompt_template.is_empty() {
            skill.prompt_template = prompt_template.to_string();
        }

        // Save the skill
        Self::save_skill(&skill)?;

        Ok(skill)
    }

    /// Update an existing skill - for backward compatibility
    pub fn update_skill(skill: &Skill) -> Result<(), SkillError> {
        // Check if skill exists
        let skills_dir = paths::get_skills_dir()
            .map_err(|e| SkillError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get skills directory: {}", e),
            )))?;

        let skill_path = skills_dir.join(format!("{}.md", skill.id));
        if !skill_path.exists() {
            return Err(SkillError::InvalidStructure(format!(
                "Skill not found: {}",
                skill.id
            )));
        }

        // Update the updated timestamp
        let mut updated_skill = skill.clone();
        updated_skill.updated = chrono::Utc::now().to_rfc3339();

        // Save the skill
        Self::save_skill(&updated_skill)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_create_skill_template() {
        let skill = SkillService::create_skill_template(
            "test-skill".to_string(),
            "Test Skill".to_string(),
            "A test skill for testing".to_string(),
            vec!["testing".to_string(), "automation".to_string()],
        );

        assert_eq!(skill.id, "test-skill");
        assert_eq!(skill.name, "Test Skill");
        assert_eq!(skill.description, "A test skill for testing");
        assert_eq!(skill.capabilities.len(), 2);
        assert!(!skill.prompt_template.is_empty());
        assert_eq!(skill.version, "1.0.0");
    }

    #[test]
    fn test_save_and_load_skill() {
        // Create a temporary skills directory
        let temp_dir = env::temp_dir().join("ai-researcher-test-skills");
        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).ok();
        }
        fs::create_dir_all(&temp_dir).unwrap();

        // Create a test skill
        let mut skill = SkillService::create_skill_template(
            "test-save-load".to_string(),
            "Test Save Load".to_string(),
            "Testing save and load".to_string(),
            vec!["testing".to_string()],
        );

        // Update file_path to use temp directory
        skill.file_path = temp_dir.join("test-save-load.md");

        // Write the skill directly to temp directory for testing
        let content = skill.to_markdown();
        fs::write(&skill.file_path, content).unwrap();

        // Load and verify
        let loaded_skill = Skill::from_markdown_file(&skill.file_path).unwrap();
        assert_eq!(loaded_skill.id, skill.id);
        assert_eq!(loaded_skill.name, skill.name);
        assert_eq!(loaded_skill.description, skill.description);

        // Cleanup
        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_validate_skill() {
        let mut skill = SkillService::create_skill_template(
            "test-validate".to_string(),
            "Test Validate".to_string(),
            "Testing validation".to_string(),
            vec!["testing".to_string()],
        );

        // Should be valid
        assert!(skill.validate().is_ok());

        // Make it invalid
        skill.id = "invalid id with spaces!".to_string();
        assert!(skill.validate().is_err());
    }

    #[test]
    fn test_get_skills_by_category() {
        // This test would require setting up test skills
        // For now, we just verify the method exists and returns a result
        let result = SkillService::get_skills_by_category("research");
        assert!(result.is_ok());
    }
}
