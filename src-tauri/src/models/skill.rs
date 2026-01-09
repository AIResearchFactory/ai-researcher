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
    pub prompt_template: String,
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
    /// Parse skill from markdown file
    pub fn from_markdown_file(path: &PathBuf) -> Result<Self, SkillError> {
        // 1. Read file content
        let content = fs::read_to_string(path)?;

        // 2. Parse YAML frontmatter and markdown body
        let (frontmatter, body) = Self::extract_frontmatter(&content)?;

        // 3. Parse frontmatter YAML
        let metadata = Self::parse_frontmatter(&frontmatter)?;

        // 4. Parse markdown body for examples, parameters, and prompt template
        let (prompt_template, examples, parameters) = Self::parse_body(&body)?;

        // 5. Return populated Skill struct
        Ok(Skill {
            id: metadata.skill_id,
            name: metadata.name,
            description: metadata.description,
            capabilities: metadata.capabilities,
            prompt_template,
            examples,
            parameters,
            version: metadata.version,
            created: metadata.created,
            updated: metadata.updated,
            file_path: path.clone(),
        })
    }

    /// Convert skill to markdown format
    pub fn to_markdown(&self) -> String {
        let mut markdown = String::new();

        // 1. Generate YAML frontmatter with metadata
        markdown.push_str("---\n");
        markdown.push_str(&format!("skill_id: {}\n", self.id));
        markdown.push_str(&format!("name: {}\n", self.name));
        markdown.push_str(&format!("description: {}\n", self.description));
        markdown.push_str("capabilities:\n");
        for cap in &self.capabilities {
            markdown.push_str(&format!("  - {}\n", cap));
        }
        markdown.push_str(&format!("version: {}\n", self.version));
        markdown.push_str(&format!("created: {}\n", self.created));
        markdown.push_str(&format!("updated: {}\n", self.updated));
        markdown.push_str("---\n\n");

        // 2. Generate markdown body
        markdown.push_str(&format!("# {} Skill\n\n", self.name));

        // Description section
        markdown.push_str("## Overview\n");
        markdown.push_str(&format!("{}\n\n", self.description));

        // Prompt Template section
        markdown.push_str("## Prompt Template\n");
        markdown.push_str(&format!("{}\n\n", self.prompt_template));

        // Parameters section
        if !self.parameters.is_empty() {
            markdown.push_str("## Parameters\n\n");
            for param in &self.parameters {
                let required_str = if param.required { "required" } else { "optional" };
                markdown.push_str(&format!("### {} ({}, {})\n", param.name, param.param_type, required_str));
                markdown.push_str(&format!("{}\n", param.description));
                if let Some(default) = &param.default_value {
                    markdown.push_str(&format!("\nDefault: \"{}\"\n", default));
                }
                markdown.push_str("\n");
            }
        }

        // Examples section
        if !self.examples.is_empty() {
            markdown.push_str("## Examples\n\n");
            for (i, example) in self.examples.iter().enumerate() {
                markdown.push_str(&format!("### Example {}: {}\n", i + 1, example.title));
                markdown.push_str("**Input:**\n");
                markdown.push_str("```json\n");
                markdown.push_str(&example.input);
                markdown.push_str("\n```\n\n");
                markdown.push_str("**Expected Output:**\n");
                markdown.push_str(&format!("{}\n\n", example.expected_output));
            }
        }

        // Usage guidelines
        markdown.push_str("## Usage Guidelines\n\n");
        markdown.push_str("- Best used for: Complex tasks requiring specialized capabilities\n");
        markdown.push_str("- Typical conversation length: Multiple exchanges for thorough completion\n");

        markdown
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

    /// Extract YAML frontmatter and body from markdown content
    fn extract_frontmatter(content: &str) -> Result<(String, String), SkillError> {
        let lines: Vec<&str> = content.lines().collect();

        // Check if file starts with ---
        if lines.is_empty() || lines[0].trim() != "---" {
            return Err(SkillError::ParseError(
                "No frontmatter found (missing opening ---)".to_string(),
            ));
        }

        // Find closing ---
        let end_index = lines[1..]
            .iter()
            .position(|&line| line.trim() == "---")
            .ok_or_else(|| SkillError::ParseError("No closing --- found".to_string()))?
            + 1;

        // Extract frontmatter and body
        let frontmatter_lines = &lines[1..end_index];
        let body_lines = &lines[end_index + 1..];

        let frontmatter = frontmatter_lines.join("\n");
        let body = body_lines.join("\n");

        Ok((frontmatter, body))
    }

    /// Parse YAML frontmatter into SkillMetadata
    fn parse_frontmatter(yaml: &str) -> Result<SkillMetadata, SkillError> {
        // Simple YAML parser for the frontmatter
        let mut skill_id = String::new();
        let mut name = String::new();
        let mut description = String::new();
        let mut capabilities = Vec::new();
        let mut version = String::from("1.0.0");
        let mut created = String::new();
        let mut updated = String::new();

        let mut in_capabilities = false;

        for line in yaml.lines() {
            let trimmed = line.trim();

            if trimmed.is_empty() {
                continue;
            }

            // Handle list items
            if trimmed.starts_with("- ") {
                if in_capabilities {
                    capabilities.push(trimmed[2..].trim().to_string());
                }
                continue;
            }

            // Handle key-value pairs
            if let Some(colon_pos) = trimmed.find(':') {
                let key = trimmed[..colon_pos].trim();
                let value = trimmed[colon_pos + 1..].trim().to_string();

                match key {
                    "skill_id" => skill_id = value,
                    "name" => name = value,
                    "description" => description = value,
                    "version" => version = value,
                    "created" => created = value,
                    "updated" => updated = value,
                    "capabilities" => {
                        in_capabilities = true;
                        // If value is provided on same line
                        if !value.is_empty() {
                            capabilities.push(value);
                        }
                    }
                    _ => {
                        in_capabilities = false;
                    }
                }
            }
        }

        if skill_id.is_empty() {
            return Err(SkillError::ParseError(
                "skill_id not found in frontmatter".to_string(),
            ));
        }

        Ok(SkillMetadata {
            skill_id,
            name,
            description,
            capabilities,
            version,
            created,
            updated,
        })
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

    /// Save skill to a markdown file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), SkillError> {
        let content = self.to_markdown();
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
            prompt_template: "Test prompt".to_string(),
            examples: vec![],
            parameters: vec![],
            version: "1.0.0".to_string(),
            created: "2024-11-13".to_string(),
            updated: "2024-11-13".to_string(),
            file_path: PathBuf::from("test.md"),
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
            prompt_template: "Test prompt".to_string(),
            examples: vec![],
            parameters: vec![],
            version: "1.0.0".to_string(),
            created: "".to_string(),
            updated: "".to_string(),
            file_path: PathBuf::from("test.md"),
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
            file_path: PathBuf::from("test.md"),
        };

        let mut params = HashMap::new();
        params.insert("name".to_string(), "Alice".to_string());

        let result = skill.render_prompt(params).unwrap();
        assert_eq!(result, "Hello Alice, you are 25 years old.");
    }

    #[test]
    fn test_parse_and_serialize_roundtrip() {
        use std::fs;
        use std::env;

        let markdown_content = r#"---
skill_id: test-researcher
name: Test Research Assistant
description: A test research skill
capabilities:
  - web_search
  - analysis
version: 1.0.0
created: 2024-11-13T10:00:00Z
updated: 2024-11-13T10:00:00Z
---

# Test Research Assistant Skill

## Overview
This is a test skill for research.

## Prompt Template
You are a researcher focusing on {{topic}}.
Please research: {{query}}

## Parameters

### topic (string, required)
The research topic or domain

### query (string, required)
The specific research query

## Examples

### Example 1: Basic Research
**Input:**
```json
{
  "topic": "AI",
  "query": "Latest trends in machine learning"
}
```

**Expected Output:**
A comprehensive report on ML trends.

## Usage Guidelines

- Best used for: Research tasks
"#;

        // Create a temporary file
        let temp_dir = env::temp_dir();
        let test_file = temp_dir.join("test_skill.md");
        fs::write(&test_file, markdown_content).unwrap();

        // Parse the skill
        let skill = Skill::from_markdown_file(&test_file).unwrap();

        // Verify parsed data
        assert_eq!(skill.id, "test-researcher");
        assert_eq!(skill.name, "Test Research Assistant");
        assert_eq!(skill.description, "A test research skill");
        assert_eq!(skill.capabilities, vec!["web_search", "analysis"]);
        assert_eq!(skill.version, "1.0.0");

        // Debug: Print what was parsed
        eprintln!("Parsed {} parameters:", skill.parameters.len());
        for param in &skill.parameters {
            eprintln!("  - {} ({}, required: {})", param.name, param.param_type, param.required);
        }
        eprintln!("Parsed {} examples:", skill.examples.len());
        for example in &skill.examples {
            eprintln!("  - {}", example.title);
        }

        assert_eq!(skill.parameters.len(), 2);
        assert_eq!(skill.parameters[0].name, "topic");
        assert_eq!(skill.parameters[0].required, true);
        assert_eq!(skill.parameters[1].name, "query");
        assert_eq!(skill.examples.len(), 1);
        assert_eq!(skill.examples[0].title, "Basic Research");

        // Validate the skill
        assert!(skill.validate().is_ok());

        // Test render_prompt
        let mut params = HashMap::new();
        params.insert("topic".to_string(), "Machine Learning".to_string());
        params.insert("query".to_string(), "Compare PyTorch vs TensorFlow".to_string());

        let rendered = skill.render_prompt(params).unwrap();
        assert!(rendered.contains("Machine Learning"));
        assert!(rendered.contains("Compare PyTorch vs TensorFlow"));

        // Serialize back to markdown
        let serialized = skill.to_markdown();
        assert!(serialized.contains("skill_id: test-researcher"));
        assert!(serialized.contains("Test Research Assistant"));
        assert!(serialized.contains("web_search"));

        // Cleanup
        fs::remove_file(&test_file).ok();
    }
}
