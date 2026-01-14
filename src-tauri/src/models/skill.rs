use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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

    #[error("Validation failed")]
    ValidationError(Vec<String>),

    #[error("Template rendering error: {0}")]
    RenderError(String),
}

/// Skill category enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SkillCategory {
    Research,
    Development,
    Writing,
    Analysis,
    Other,
}

/// Represents a comprehensive skill/prompt template with full metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub role: String,
    pub tasks: Vec<String>,
    pub output: String,
    pub additional_guidelines: String,
    pub prompt_template: String, // Kept for legacy compatibility and full-text rendering
    pub examples: Vec<SkillExample>,
    pub parameters: Vec<SkillParameter>,
    pub version: String,
    pub created: String,
    pub updated: String,
    pub file_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillExample {
    pub title: String,
    pub input: String,
    pub expected_output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillParameter {
    pub name: String,
    #[serde(rename = "type")]
    pub param_type: String, // "string", "number", "boolean", "array"
    pub description: String,
    pub required: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillMetadata {
    pub skill_id: String,
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub version: String,
    pub created: String,
    pub updated: String,
}

impl Skill {
    /// Parse skill from JSON file
    pub fn load_from_json(path: &PathBuf) -> Result<Self, SkillError> {
        let content = fs::read_to_string(path)?;
        let mut skill: Skill = serde_json::from_str(&content)
            .map_err(|e| SkillError::ParseError(format!("Failed to parse skill JSON: {}", e)))?;
        
        skill.file_path = path.clone();
        Ok(skill)
    }

    /// Convert skill to markdown format for display or LLM prompt
    pub fn render_full_prompt(&self) -> String {
        let mut prompt = String::new();

        if !self.name.is_empty() {
            prompt.push_str(&format!("# {}\n\n", self.name));
        }

        if !self.role.is_empty() {
            prompt.push_str("## Role\n");
            prompt.push_str(&format!("{}\n\n", self.role));
        }

        if !self.tasks.is_empty() {
            prompt.push_str("## Tasks\n");
            for task in &self.tasks {
                prompt.push_str(&format!("- {}\n", task));
            }
            prompt.push_str("\n");
        }

        if !self.output.is_empty() {
            prompt.push_str("## Output\n");
            prompt.push_str(&format!("{}\n\n", self.output));
        }

        if !self.additional_guidelines.is_empty() {
            prompt.push_str("## Additional Guidelines\n");
            prompt.push_str(&format!("{}\n\n", self.additional_guidelines));
        }

        prompt.trim().to_string()
    }

    /// Convert skill to markdown format (legacy display)
    pub fn to_markdown(&self) -> String {
        self.render_full_prompt()
    }

    /// Validate skill structure
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        // Check required fields are present
        if self.id.is_empty() {
            errors.push("skill_id cannot be empty".to_string());
        }

        if self.name.is_empty() {
            errors.push("name cannot be empty".to_string());
        }

        if self.prompt_template.is_empty() {
            errors.push("prompt_template cannot be empty".to_string());
        }

        // Validate skill_id format (alphanumeric + hyphens + underscores)
        let valid_id = self
            .id
            .chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_');
        if !valid_id {
            errors.push(format!(
                "skill_id '{}' contains invalid characters (only alphanumeric, hyphens, and underscores allowed)",
                self.id
            ));
        }

        // Validate version format
        if !self.version.is_empty() {
            let parts: Vec<&str> = self.version.split('.').collect();
            if parts.len() != 3 || parts.iter().any(|p| p.parse::<u32>().is_err()) {
                errors.push(format!(
                    "version '{}' is not in valid semver format (expected x.y.z)",
                    self.version
                ));
            }
        }

        // Validate parameters
        for param in &self.parameters {
            if param.name.is_empty() {
                errors.push("parameter name cannot be empty".to_string());
            }
            if !matches!(
                param.param_type.as_str(),
                "string" | "number" | "boolean" | "array"
            ) {
                errors.push(format!(
                    "parameter '{}' has invalid type '{}' (must be string, number, boolean, or array)",
                    param.name, param.param_type
                ));
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /// Apply skill parameters to prompt template
    pub fn render_prompt(&self, params: HashMap<String, String>) -> Result<String, SkillError> {
        let mut rendered = self.prompt_template.clone();

        // Check that all required parameters are provided
        for param in &self.parameters {
            if param.required && !params.contains_key(&param.name) {
                return Err(SkillError::RenderError(format!(
                    "Required parameter '{}' not provided",
                    param.name
                )));
            }
        }

        // Replace placeholders in prompt_template with actual values
        // Format: {{parameter_name}}
        for param in &self.parameters {
            let placeholder = format!("{{{{{}}}}}", param.name);
            let value = params
                .get(&param.name)
                .or(param.default_value.as_ref())
                .ok_or_else(|| {
                    SkillError::RenderError(format!(
                        "No value or default for parameter '{}'",
                        param.name
                    ))
                })?;

            rendered = rendered.replace(&placeholder, value);
        }

        // Check for any remaining unreplaced placeholders
        if rendered.contains("{{") && rendered.contains("}}") {
            let start = rendered.find("{{").unwrap();
            let end = rendered[start..].find("}}").unwrap() + start + 2;
            let unreplaced = &rendered[start..end];
            return Err(SkillError::RenderError(format!(
                "Unreplaced placeholder found: {}",
                unreplaced
            )));
        }

        Ok(rendered)
    }


    /// Parse markdown body for prompt template, examples, and parameters
    fn parse_body(body: &str) -> Result<(String, Vec<SkillExample>, Vec<SkillParameter>), SkillError> {
        #[cfg(test)]
        eprintln!("Parsing body with {} lines", body.lines().count());

        let mut prompt_template = String::new();
        let mut examples = Vec::new();
        let mut parameters = Vec::new();

        let mut in_prompt_section = false;
        let mut in_parameters_section = false;
        let mut in_examples_section = false;

        let mut current_example: Option<SkillExample> = None;
        let mut current_param: Option<SkillParameter> = None;
        let mut in_example_input = false;
        let mut in_example_output = false;
        let mut example_input_buffer = String::new();

        for line in body.lines() {
            let trimmed = line.trim();

            // Detect sections
            if trimmed.starts_with("## Prompt Template") {
                #[cfg(test)]
                eprintln!("Found Prompt Template section");
                // Save any pending parameter before switching sections
                if let Some(param) = current_param.take() {
                    parameters.push(param);
                }
                in_prompt_section = true;
                in_parameters_section = false;
                in_examples_section = false;
                continue;
            } else if trimmed.starts_with("## Parameters") {
                #[cfg(test)]
                eprintln!("Found Parameters section");
                // Save any pending parameter before switching sections
                if let Some(param) = current_param.take() {
                    parameters.push(param);
                }
                in_prompt_section = false;
                in_parameters_section = true;
                in_examples_section = false;
                continue;
            } else if trimmed.starts_with("## Examples") {
                #[cfg(test)]
                eprintln!("Found Examples section");
                // Save any pending parameter before switching sections
                if let Some(param) = current_param.take() {
                    parameters.push(param);
                }
                // Save any pending example
                if let Some(example) = current_example.take() {
                    examples.push(example);
                }
                in_prompt_section = false;
                in_parameters_section = false;
                in_examples_section = true;
                continue;
            } else if trimmed.starts_with("### ") {
                // This is a sub-section item, let section-specific logic handle it
            } else if trimmed.starts_with("## ") || (trimmed.starts_with("##") && !trimmed.starts_with("###")) {
                // Other section - reset all and save pending items
                if let Some(param) = current_param.take() {
                    parameters.push(param);
                }
                if let Some(example) = current_example.take() {
                    examples.push(example);
                }
                in_prompt_section = false;
                in_parameters_section = false;
                in_examples_section = false;
                continue;
            }

            // Parse prompt template section
            if in_prompt_section && !trimmed.is_empty() {
                if !prompt_template.is_empty() {
                    prompt_template.push('\n');
                }
                prompt_template.push_str(line);
            }

            // Parse parameters section
            if in_parameters_section {
                #[cfg(test)]
                if !trimmed.is_empty() {
                    eprintln!("In parameters section, line: '{}'", trimmed);
                }
                if trimmed.starts_with("### ") {
                    #[cfg(test)]
                    eprintln!("Found parameter header: {}", trimmed);
                    // Save previous parameter
                    if let Some(param) = current_param.take() {
                        parameters.push(param);
                    }

                    // Parse parameter header: ### name (type, required/optional)
                    let header = &trimmed[4..];
                    if let Some(paren_start) = header.find('(') {
                        let param_name = header[..paren_start].trim().to_string();
                        let rest = &header[paren_start + 1..];
                        if let Some(paren_end) = rest.find(')') {
                            let parts: Vec<&str> = rest[..paren_end].split(',').collect();
                            let param_type = parts.get(0).unwrap_or(&"string").trim().to_string();
                            let required = parts.get(1).map(|s| s.trim() == "required").unwrap_or(false);

                            current_param = Some(SkillParameter {
                                name: param_name,
                                param_type,
                                description: String::new(),
                                required,
                                default_value: None,
                            });
                        }
                    }
                } else if let Some(ref mut param) = current_param {
                    // Parse parameter description or default value
                    if trimmed.starts_with("Default:") {
                        let default = trimmed[8..].trim().trim_matches('"').to_string();
                        param.default_value = Some(default);
                    } else if !trimmed.is_empty() {
                        if !param.description.is_empty() {
                            param.description.push(' ');
                        }
                        param.description.push_str(trimmed);
                    }
                }
            }

            // Parse examples section
            if in_examples_section {
                if trimmed.starts_with("### Example") {
                    // Save previous example
                    if let Some(example) = current_example.take() {
                        examples.push(example);
                    }

                    // Extract example title
                    let title = if let Some(colon_pos) = trimmed.find(':') {
                        trimmed[colon_pos + 1..].trim().to_string()
                    } else {
                        trimmed[11..].trim().to_string()
                    };

                    current_example = Some(SkillExample {
                        title,
                        input: String::new(),
                        expected_output: String::new(),
                    });
                    in_example_input = false;
                    in_example_output = false;
                } else if trimmed == "**Input:**" {
                    in_example_input = true;
                    in_example_output = false;
                    example_input_buffer.clear();
                } else if trimmed == "**Expected Output:**" {
                    in_example_input = false;
                    in_example_output = true;
                } else if trimmed.starts_with("```") {
                    // Handle code blocks
                    if in_example_input && !example_input_buffer.is_empty() {
                        if let Some(ref mut example) = current_example {
                            example.input = example_input_buffer.clone();
                        }
                        example_input_buffer.clear();
                    }
                } else if in_example_input {
                    if !example_input_buffer.is_empty() {
                        example_input_buffer.push('\n');
                    }
                    example_input_buffer.push_str(line);
                } else if in_example_output {
                    if let Some(ref mut example) = current_example {
                        if !example.expected_output.is_empty() {
                            example.expected_output.push('\n');
                        }
                        example.expected_output.push_str(trimmed);
                    }
                }
            }
        }

        // Save last parameter and example
        if let Some(param) = current_param {
            parameters.push(param);
        }
        if let Some(example) = current_example {
            examples.push(example);
        }

        Ok((prompt_template, examples, parameters))
    }

    /// Get metadata summary of the skill
    pub fn metadata(&self) -> SkillMetadata {
        SkillMetadata {
            skill_id: self.id.clone(),
            name: self.name.clone(),
            description: self.description.clone(),
            capabilities: self.capabilities.clone(),
            version: self.version.clone(),
            created: self.created.clone(),
            updated: self.updated.clone(),
        }
    }

    /// Save skill to a JSON file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), SkillError> {
        let path = path.as_ref();
        
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| SkillError::ParseError(format!("Failed to serialize skill JSON: {}", e)))?;
        
        fs::write(path, content)?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_valid_skill() {
        let skill = Skill {
            id: "test-skill".to_string(),
            name: "Test Skill".to_string(),
            description: "A test skill".to_string(),
            capabilities: vec!["testing".to_string()],
            role: "Test role".to_string(),
            tasks: vec!["Task 1".to_string()],
            output: "Test output".to_string(),
            additional_guidelines: "None".to_string(),
            prompt_template: "Test prompt".to_string(),
            examples: vec![],
            parameters: vec![],
            version: "1.0.0".to_string(),
            created: "2024-11-13".to_string(),
            updated: "2024-11-13".to_string(),
            file_path: PathBuf::from("test.json"),
        };

        assert!(skill.validate().is_ok());
    }

    #[test]
    fn test_validate_invalid_id() {
        let skill = Skill {
            id: "test skill!".to_string(),
            name: "Test Skill".to_string(),
            description: "A test skill".to_string(),
            capabilities: vec![],
            role: "".to_string(),
            tasks: vec![],
            output: "".to_string(),
            additional_guidelines: "".to_string(),
            prompt_template: "Test prompt".to_string(),
            examples: vec![],
            parameters: vec![],
            version: "1.0.0".to_string(),
            created: "".to_string(),
            updated: "".to_string(),
            file_path: PathBuf::from("test.json"),
        };

        assert!(skill.validate().is_err());
    }

    #[test]
    fn test_render_prompt() {
        let skill = Skill {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: "Test".to_string(),
            capabilities: vec![],
            role: "".to_string(),
            tasks: vec![],
            output: "".to_string(),
            additional_guidelines: "".to_string(),
            prompt_template: "Hello {{name}}, you are {{age}} years old.".to_string(),
            examples: vec![],
            parameters: vec![
                SkillParameter {
                    name: "name".to_string(),
                    param_type: "string".to_string(),
                    description: "Name".to_string(),
                    required: true,
                    default_value: None,
                },
                SkillParameter {
                    name: "age".to_string(),
                    param_type: "number".to_string(),
                    description: "Age".to_string(),
                    required: false,
                    default_value: Some("25".to_string()),
                },
            ],
            version: "1.0.0".to_string(),
            created: "".to_string(),
            updated: "".to_string(),
            file_path: PathBuf::from("test.json"),
        };

        let mut params = HashMap::new();
        params.insert("name".to_string(), "Alice".to_string());

        let result = skill.render_prompt(params).unwrap();
        assert_eq!(result, "Hello Alice, you are 25 years old.");
    }

    #[test]
    fn test_json_roundtrip() {
        use std::fs;
        use std::env;

        let skill_id = "test-researcher";
        let temp_dir = env::temp_dir().join("skill_test_json");
        fs::create_dir_all(&temp_dir).unwrap();
        
        let test_file = temp_dir.join(format!("{}.json", skill_id));

        let skill = Skill {
            id: skill_id.to_string(),
            name: "Test Research Assistant".to_string(),
            description: "A test research skill".to_string(),
            capabilities: vec!["web_search".to_string(), "analysis".to_string()],
            role: "Expert Researcher".to_string(),
            tasks: vec!["Deep research".to_string()],
            output: "PDF".to_string(),
            additional_guidelines: "None".to_string(),
            prompt_template: "".to_string(),
            examples: vec![],
            parameters: vec![],
            version: "1.0.0".to_string(),
            created: "2024-11-13T10:00:00Z".to_string(),
            updated: "2024-11-13T10:00:00Z".to_string(),
            file_path: test_file.clone(),
        };

        // Save
        skill.save(&test_file).expect("Failed to save skill to JSON");

        // Load
        let loaded = Skill::load_from_json(&test_file).expect("Failed to load skill from JSON");

        // Verify
        assert_eq!(loaded.id, skill.id);
        assert_eq!(loaded.name, skill.name);
        assert_eq!(loaded.role, skill.role);
        assert_eq!(loaded.tasks, skill.tasks);
        
        // Cleanup
        fs::remove_dir_all(&temp_dir).ok();
    }
}
