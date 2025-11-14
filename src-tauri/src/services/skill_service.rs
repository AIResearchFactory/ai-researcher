use crate::models::skill::{Skill, SkillError};
use std::fs;
use std::path::PathBuf;

pub struct SkillService;

impl SkillService {
    /// Get the skills directory path
    pub fn get_skills_path() -> Result<PathBuf, SkillError> {
        let home_dir = dirs::home_dir()
            .ok_or_else(|| SkillError::InvalidStructure("Could not determine home directory".to_string()))?;

        let skills_path = home_dir.join(".ai-researcher").join("skills");

        // Create skills directory if it doesn't exist
        if !skills_path.exists() {
            fs::create_dir_all(&skills_path)?;
        }

        Ok(skills_path)
    }

    /// List all available skills
    pub fn get_all_skills() -> Result<Vec<Skill>, SkillError> {
        let skills_path = Self::get_skills_path()?;

        let mut skills = Vec::new();

        for entry in fs::read_dir(&skills_path)? {
            let entry = entry?;
            let path = entry.path();

            // Only process .md files
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                match Skill::from_markdown_file(&path) {
                    Ok(skill) => skills.push(skill),
                    Err(e) => {
                        eprintln!("Warning: Failed to load skill at {:?}: {}", path, e);
                        continue;
                    }
                }
            }
        }

        // Sort by name
        skills.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(skills)
    }

    /// Get a specific skill by ID
    pub fn get_skill(skill_id: &str) -> Result<Skill, SkillError> {
        let skills_path = Self::get_skills_path()?;
        let skill_file = skills_path.join(format!("{}.md", skill_id));

        if !skill_file.exists() {
            return Err(SkillError::InvalidStructure(
                format!("Skill not found: {}", skill_id)
            ));
        }

        Skill::from_markdown_file(&skill_file)
    }

    /// Create a new skill
    pub fn create_skill(
        name: &str,
        description: &str,
        prompt_template: &str,
        capabilities: Vec<String>,
    ) -> Result<Skill, SkillError> {
        let skills_path = Self::get_skills_path()?;

        // Generate skill ID from name
        let skill_id = name
            .to_lowercase()
            .replace(' ', "-")
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
            .collect::<String>();

        let skill_file = skills_path.join(format!("{}.md", skill_id));

        // Check if skill already exists
        if skill_file.exists() {
            return Err(SkillError::InvalidStructure(
                format!("Skill already exists: {}", skill_id)
            ));
        }

        // Get current timestamp
        let now = chrono::Utc::now().to_rfc3339();

        let skill = Skill {
            id: skill_id,
            name: name.to_string(),
            description: description.to_string(),
            capabilities,
            prompt_template: prompt_template.to_string(),
            examples: vec![],
            parameters: vec![],
            version: "1.0.0".to_string(),
            created: now.clone(),
            updated: now,
            file_path: skill_file.clone(),
        };

        // Validate before saving
        skill.validate().map_err(|errors| {
            SkillError::InvalidStructure(format!("Validation failed: {:?}", errors))
        })?;

        skill.save(&skill_file)?;

        Ok(skill)
    }

    /// Update an existing skill
    pub fn update_skill(skill: &Skill) -> Result<(), SkillError> {
        let skills_path = Self::get_skills_path()?;
        let skill_file = skills_path.join(format!("{}.md", skill.id));

        if !skill_file.exists() {
            return Err(SkillError::InvalidStructure(
                format!("Skill not found: {}", skill.id)
            ));
        }

        skill.save(&skill_file)?;

        Ok(())
    }

    /// Delete a skill
    pub fn delete_skill(skill_id: &str) -> Result<(), SkillError> {
        let skills_path = Self::get_skills_path()?;
        let skill_file = skills_path.join(format!("{}.md", skill_id));

        if !skill_file.exists() {
            return Err(SkillError::InvalidStructure(
                format!("Skill not found: {}", skill_id)
            ));
        }

        fs::remove_file(&skill_file)?;

        Ok(())
    }
}
