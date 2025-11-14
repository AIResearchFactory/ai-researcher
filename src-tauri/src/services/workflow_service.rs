use crate::models::workflow::*;
use crate::utils::paths;
use std::fs;

pub struct WorkflowService;

impl WorkflowService {
    /// Load all workflows for a project
    /// Reads all .json files from {projects}/{project_id}/.workflows/
    pub fn load_project_workflows(project_id: &str) -> Result<Vec<Workflow>, WorkflowError> {
        // Get project path: {projects}/{project_id}/.workflows/
        let project_path = paths::get_projects_dir()
            .map_err(|e| WorkflowError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get projects directory: {}", e)
            )))?;

        let workflows_dir = project_path.join(project_id).join(".workflows");

        // If directory doesn't exist, return empty list
        if !workflows_dir.exists() {
            return Ok(Vec::new());
        }

        let mut workflows = Vec::new();

        // Read all .json files
        let entries = fs::read_dir(&workflows_dir)
            .map_err(|e| WorkflowError::ReadError(e))?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            // Only process .json files
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                // Read and deserialize each workflow
                let content = fs::read_to_string(&path)?;
                let workflow: Workflow = serde_json::from_str(&content)
                    .map_err(|e| WorkflowError::ParseError(format!(
                        "Failed to parse workflow from {:?}: {}",
                        path, e
                    )))?;

                workflows.push(workflow);
            }
        }

        Ok(workflows)
    }

    /// Load a specific workflow by ID
    /// Path: {project}/.workflows/{workflow_id}.json
    pub fn load_workflow(project_id: &str, workflow_id: &str) -> Result<Workflow, WorkflowError> {
        // Get workflow file path
        let project_path = paths::get_projects_dir()
            .map_err(|e| WorkflowError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get projects directory: {}", e)
            )))?;

        let workflow_path = project_path
            .join(project_id)
            .join(".workflows")
            .join(format!("{}.json", workflow_id));

        // Check if file exists
        if !workflow_path.exists() {
            return Err(WorkflowError::NotFound(format!(
                "Workflow {} not found in project {}",
                workflow_id, project_id
            )));
        }

        // Read and deserialize
        let content = fs::read_to_string(&workflow_path)?;
        let workflow: Workflow = serde_json::from_str(&content)
            .map_err(|e| WorkflowError::ParseError(format!(
                "Failed to parse workflow: {}",
                e
            )))?;

        Ok(workflow)
    }

    /// Save a workflow to disk
    /// Validates, creates directory if needed, and saves as JSON
    pub fn save_workflow(workflow: &Workflow) -> Result<(), WorkflowError> {
        // Validate workflow first
        workflow.validate()
            .map_err(|errors| WorkflowError::ValidationError(errors))?;

        // Get project path
        let project_path = paths::get_projects_dir()
            .map_err(|e| WorkflowError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get projects directory: {}", e)
            )))?;

        let workflows_dir = project_path
            .join(&workflow.project_id)
            .join(".workflows");

        // Create .workflows/ directory if it doesn't exist
        if !workflows_dir.exists() {
            fs::create_dir_all(&workflows_dir)?;
        }

        // Serialize to pretty JSON
        let json_content = serde_json::to_string_pretty(workflow)
            .map_err(|e| WorkflowError::ParseError(format!(
                "Failed to serialize workflow: {}",
                e
            )))?;

        // Write to file
        let workflow_path = workflows_dir.join(format!("{}.json", workflow.id));
        fs::write(&workflow_path, json_content)?;

        Ok(())
    }

    /// Delete a workflow
    /// Removes the JSON file, returns Ok even if file doesn't exist
    pub fn delete_workflow(project_id: &str, workflow_id: &str) -> Result<(), WorkflowError> {
        // Get workflow file path
        let project_path = paths::get_projects_dir()
            .map_err(|e| WorkflowError::ReadError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Failed to get projects directory: {}", e)
            )))?;

        let workflow_path = project_path
            .join(project_id)
            .join(".workflows")
            .join(format!("{}.json", workflow_id));

        // Remove file if it exists (ignore error if file doesn't exist)
        if workflow_path.exists() {
            fs::remove_file(&workflow_path)?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::workflow::{StepConfig, StepType, WorkflowStep};
    use tempfile::TempDir;
    use std::env;

    fn setup_test_env() -> (TempDir, String) {
        let temp_dir = TempDir::new().unwrap();
        let project_id = "test-project";

        // Set the projects directory to temp dir
        env::set_var("PROJECTS_DIR", temp_dir.path().to_str().unwrap());

        // Create project directory
        let project_dir = temp_dir.path().join(project_id);
        fs::create_dir_all(&project_dir).unwrap();

        (temp_dir, project_id.to_string())
    }

    fn create_test_workflow(project_id: &str, workflow_id: &str) -> Workflow {
        Workflow {
            id: workflow_id.to_string(),
            project_id: project_id.to_string(),
            name: "Test Workflow".to_string(),
            description: "A test workflow".to_string(),
            steps: vec![WorkflowStep {
                id: "step1".to_string(),
                name: "Step 1".to_string(),
                step_type: StepType::Skill,
                config: StepConfig {
                    skill_id: Some("skill-1".to_string()),
                    parameters: serde_json::json!({"key": "value"}),
                    timeout: None,
                },
                depends_on: vec![],
            }],
            version: "1.0.0".to_string(),
            created: "2024-11-13T10:00:00Z".to_string(),
            updated: "2024-11-13T10:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_save_and_load_workflow() {
        let (_temp_dir, project_id) = setup_test_env();
        let workflow = create_test_workflow(&project_id, "workflow-001");

        // Save workflow
        let result = WorkflowService::save_workflow(&workflow);
        assert!(result.is_ok());

        // Load workflow
        let loaded = WorkflowService::load_workflow(&project_id, "workflow-001");
        assert!(loaded.is_ok());

        let loaded_workflow = loaded.unwrap();
        assert_eq!(loaded_workflow.id, "workflow-001");
        assert_eq!(loaded_workflow.name, "Test Workflow");
        assert_eq!(loaded_workflow.steps.len(), 1);
    }

    #[test]
    fn test_load_project_workflows() {
        let (_temp_dir, project_id) = setup_test_env();

        // Save multiple workflows
        let workflow1 = create_test_workflow(&project_id, "workflow-001");
        let workflow2 = create_test_workflow(&project_id, "workflow-002");

        WorkflowService::save_workflow(&workflow1).unwrap();
        WorkflowService::save_workflow(&workflow2).unwrap();

        // Load all workflows
        let workflows = WorkflowService::load_project_workflows(&project_id);
        assert!(workflows.is_ok());

        let workflows = workflows.unwrap();
        assert_eq!(workflows.len(), 2);
    }

    #[test]
    fn test_delete_workflow() {
        let (_temp_dir, project_id) = setup_test_env();
        let workflow = create_test_workflow(&project_id, "workflow-001");

        // Save and then delete
        WorkflowService::save_workflow(&workflow).unwrap();
        let result = WorkflowService::delete_workflow(&project_id, "workflow-001");
        assert!(result.is_ok());

        // Verify it's deleted
        let loaded = WorkflowService::load_workflow(&project_id, "workflow-001");
        assert!(loaded.is_err());
    }

    #[test]
    fn test_delete_nonexistent_workflow() {
        let (_temp_dir, project_id) = setup_test_env();

        // Delete non-existent workflow (should succeed)
        let result = WorkflowService::delete_workflow(&project_id, "nonexistent");
        assert!(result.is_ok());
    }

    #[test]
    fn test_load_nonexistent_workflow() {
        let (_temp_dir, project_id) = setup_test_env();

        let result = WorkflowService::load_workflow(&project_id, "nonexistent");
        assert!(result.is_err());

        if let Err(WorkflowError::NotFound(_)) = result {
            // Expected error
        } else {
            panic!("Expected NotFound error");
        }
    }

    #[test]
    fn test_save_invalid_workflow() {
        let (_temp_dir, project_id) = setup_test_env();

        // Create invalid workflow (empty steps)
        let mut workflow = create_test_workflow(&project_id, "workflow-001");
        workflow.steps.clear();

        let result = WorkflowService::save_workflow(&workflow);
        assert!(result.is_err());

        if let Err(WorkflowError::ValidationError(_)) = result {
            // Expected error
        } else {
            panic!("Expected ValidationError");
        }
    }
}
