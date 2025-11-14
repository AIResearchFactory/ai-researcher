use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum WorkflowError {
    #[error("Failed to read workflow file: {0}")]
    ReadError(#[from] std::io::Error),

    #[error("Failed to parse workflow: {0}")]
    ParseError(String),

    #[error("Invalid workflow structure: {0}")]
    InvalidStructure(String),

    #[error("Validation failed")]
    ValidationError(Vec<String>),

    #[error("Workflow not found: {0}")]
    NotFound(String),
}

/// Represents a workflow with steps and configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub description: String,
    pub steps: Vec<WorkflowStep>,
    pub version: String,
    pub created: String,
    pub updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: String,
    pub name: String,
    pub step_type: StepType,
    pub config: StepConfig,
    pub depends_on: Vec<String>, // IDs of steps that must complete before this one
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StepType {
    #[serde(rename = "skill")]
    Skill,
    #[serde(rename = "api_call")]
    ApiCall,
    #[serde(rename = "script")]
    Script,
    #[serde(rename = "condition")]
    Condition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepConfig {
    pub skill_id: Option<String>,
    pub parameters: serde_json::Value,
    pub timeout: Option<u64>,
}

impl Workflow {
    /// Validate workflow structure
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        // Check required fields are present
        if self.id.is_empty() {
            errors.push("workflow id cannot be empty".to_string());
        }

        if self.project_id.is_empty() {
            errors.push("project_id cannot be empty".to_string());
        }

        if self.name.is_empty() {
            errors.push("name cannot be empty".to_string());
        }

        // Validate workflow_id format (alphanumeric + hyphens + underscores)
        let valid_id = self
            .id
            .chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_');
        if !valid_id {
            errors.push(format!(
                "workflow id '{}' contains invalid characters (only alphanumeric, hyphens, and underscores allowed)",
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

        // Validate steps
        if self.steps.is_empty() {
            errors.push("workflow must have at least one step".to_string());
        }

        // Validate step dependencies
        let step_ids: std::collections::HashSet<_> = self.steps.iter().map(|s| &s.id).collect();
        for step in &self.steps {
            for dep_id in &step.depends_on {
                if !step_ids.contains(dep_id) {
                    errors.push(format!(
                        "step '{}' depends on non-existent step '{}'",
                        step.id, dep_id
                    ));
                }
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_valid_workflow() {
        let workflow = Workflow {
            id: "test-workflow".to_string(),
            project_id: "test-project".to_string(),
            name: "Test Workflow".to_string(),
            description: "A test workflow".to_string(),
            steps: vec![WorkflowStep {
                id: "step1".to_string(),
                name: "Step 1".to_string(),
                step_type: StepType::Skill,
                config: StepConfig {
                    skill_id: Some("skill-1".to_string()),
                    parameters: serde_json::json!({}),
                    timeout: None,
                },
                depends_on: vec![],
            }],
            version: "1.0.0".to_string(),
            created: "2024-11-13".to_string(),
            updated: "2024-11-13".to_string(),
        };

        assert!(workflow.validate().is_ok());
    }

    #[test]
    fn test_validate_invalid_id() {
        let workflow = Workflow {
            id: "test workflow!".to_string(),
            project_id: "test-project".to_string(),
            name: "Test Workflow".to_string(),
            description: "A test workflow".to_string(),
            steps: vec![],
            version: "1.0.0".to_string(),
            created: "".to_string(),
            updated: "".to_string(),
        };

        let result = workflow.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("invalid characters")));
    }

    #[test]
    fn test_validate_empty_steps() {
        let workflow = Workflow {
            id: "test-workflow".to_string(),
            project_id: "test-project".to_string(),
            name: "Test Workflow".to_string(),
            description: "A test workflow".to_string(),
            steps: vec![],
            version: "1.0.0".to_string(),
            created: "2024-11-13".to_string(),
            updated: "2024-11-13".to_string(),
        };

        let result = workflow.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.contains("at least one step")));
    }
}
