use crate::models::workflow::*;
use crate::services::workflow_service::WorkflowService;
use tauri::{Emitter, Window};
use chrono::Utc;

#[tauri::command]
pub async fn get_project_workflows(project_id: String) -> Result<Vec<Workflow>, String> {
    WorkflowService::load_project_workflows(&project_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_workflow(project_id: String, workflow_id: String) -> Result<Workflow, String> {
    WorkflowService::load_workflow(&project_id, &workflow_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_workflow(
    project_id: String,
    name: String,
    description: String,
) -> Result<Workflow, String> {
    // Generate workflow ID from name
    let workflow_id = name
        .to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect::<String>();

    let now = Utc::now().to_rfc3339();

    let workflow = Workflow {
        id: workflow_id,
        project_id,
        name,
        description,
        steps: vec![],
        version: "1.0.0".to_string(),
        created: now.clone(),
        updated: now,
        status: None,
        last_run: None,
    };

    // Save the new workflow
    WorkflowService::save_workflow(&workflow)
        .map_err(|e| e.to_string())?;

    Ok(workflow)
}

#[tauri::command]
pub async fn save_workflow(workflow: Workflow) -> Result<(), String> {
    // Update the timestamp
    let mut workflow = workflow;
    workflow.updated = Utc::now().to_rfc3339();

    WorkflowService::save_workflow(&workflow)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_workflow(project_id: String, workflow_id: String) -> Result<(), String> {
    WorkflowService::delete_workflow(&project_id, &workflow_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn execute_workflow(
    project_id: String,
    workflow_id: String,
    parameters: Option<std::collections::HashMap<String, String>>,
    window: Window,
) -> Result<WorkflowExecution, String> {
    // Execute workflow with progress callback
    let result = WorkflowService::execute_workflow(
        &project_id,
        &workflow_id,
        parameters,
        move |progress| {
            // Emit progress event to the frontend
            let _ = window.emit("workflow-progress", &progress);
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn validate_workflow(workflow: Workflow) -> Result<Vec<String>, String> {
    match workflow.validate() {
        Ok(_) => Ok(Vec::new()),
        Err(errors) => Ok(errors),
    }
}

#[tauri::command]
pub async fn add_workflow_step(
    project_id: String,
    workflow_id: String,
    step: WorkflowStep,
) -> Result<Workflow, String> {
    // Load workflow
    let mut workflow = WorkflowService::load_workflow(&project_id, &workflow_id)
        .map_err(|e| e.to_string())?;

    // Add step to workflow
    workflow.steps.push(step);

    // Update timestamp
    workflow.updated = Utc::now().to_rfc3339();

    // Save workflow
    WorkflowService::save_workflow(&workflow)
        .map_err(|e| e.to_string())?;

    Ok(workflow)
}

#[tauri::command]
pub async fn remove_workflow_step(
    project_id: String,
    workflow_id: String,
    step_id: String,
) -> Result<Workflow, String> {
    // Load workflow
    let mut workflow = WorkflowService::load_workflow(&project_id, &workflow_id)
        .map_err(|e| e.to_string())?;

    // Remove step with matching ID
    workflow.steps.retain(|s| s.id != step_id);

    // Update timestamp
    workflow.updated = Utc::now().to_rfc3339();

    // Save workflow
    WorkflowService::save_workflow(&workflow)
        .map_err(|e| e.to_string())?;

    Ok(workflow)
}
