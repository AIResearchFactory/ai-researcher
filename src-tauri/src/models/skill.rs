use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SkillError {
    #[error("Failed to read skill file: {0}")]
    ReadError(#[from] std::io::Error),

    #[error("Failed to parse skill: {0}")]
    ParseError(String),

    #[error("Invalid skill structure: {0}")]
    InvalidStructure(String),
}

/// Represents a skill/prompt template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub template: String,
    pub category: String,
}

impl Skill {
    /// Load a skill from a markdown file
    pub fn from_markdown_file<P: AsRef<Path>>(path: P) -> Result<Self, SkillError> {
        let path = path.as_ref();
        let content = fs::read_to_string(path)?;

        // Extract filename as ID
        let id = path
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| SkillError::InvalidStructure("Invalid filename".to_string()))?
            .to_string();

        Self::parse_from_markdown(&content, &id)
    }

    /// Parse skill from markdown content
    pub fn parse_from_markdown(content: &str, id: &str) -> Result<Self, SkillError> {
        // Extract YAML frontmatter
        let (frontmatter, body) = Self::extract_frontmatter(content)?;

        // Parse frontmatter as JSON
        let mut skill_data: serde_json::Value = serde_json::from_str(&frontmatter)
            .map_err(|e| SkillError::ParseError(format!("Failed to parse frontmatter: {}", e)))?;

        // Get fields from frontmatter
        let name = skill_data
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or(id)
            .to_string();

        let description = skill_data
            .get("description")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let category = skill_data
            .get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("general")
            .to_string();

        Ok(Skill {
            id: id.to_string(),
            name,
            description,
            template: body,
            category,
        })
    }

    /// Extract YAML frontmatter and body from markdown content
    fn extract_frontmatter(content: &str) -> Result<(String, String), SkillError> {
        let lines: Vec<&str> = content.lines().collect();

        // Check if file starts with ---
        if lines.is_empty() || lines[0] != "---" {
            return Err(SkillError::ParseError(
                "No frontmatter found (missing opening ---)".to_string()
            ));
        }

        // Find closing ---
        let end_index = lines[1..]
            .iter()
            .position(|&line| line == "---")
            .ok_or_else(|| SkillError::ParseError("No closing --- found".to_string()))?
            + 1;

        // Extract frontmatter and body
        let frontmatter_lines = &lines[1..end_index];
        let body_lines = &lines[end_index + 1..];

        let yaml_content = frontmatter_lines.join("\n");
        let body = body_lines.join("\n");

        let json = Self::yaml_to_json(&yaml_content)?;

        Ok((json, body))
    }

    /// Simple YAML to JSON converter
    fn yaml_to_json(yaml: &str) -> Result<String, SkillError> {
        let mut json_map = std::collections::HashMap::new();

        for line in yaml.lines() {
            let trimmed = line.trim();

            if trimmed.is_empty() {
                continue;
            }

            if let Some(colon_pos) = trimmed.find(':') {
                let key = trimmed[..colon_pos].trim().to_string();
                let value = trimmed[colon_pos + 1..].trim().to_string();

                if !value.is_empty() {
                    json_map.insert(key, serde_json::json!(value));
                }
            }
        }

        serde_json::to_string(&json_map)
            .map_err(|e| SkillError::ParseError(format!("Failed to convert to JSON: {}", e)))
    }

    /// Convert skill to markdown format
    pub fn to_markdown(&self) -> String {
        format!(
            r#"---
name: {}
description: {}
category: {}
---

{}
"#,
            self.name, self.description, self.category, self.template
        )
    }

    /// Save skill to a markdown file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), SkillError> {
        let content = self.to_markdown();
        fs::write(path, content)?;
        Ok(())
    }
}
