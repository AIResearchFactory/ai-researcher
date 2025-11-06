use crate::models::project::Project;
use crate::services::project_service::ProjectService;

#[tauri::command]
pub async fn get_all_projects() -> Result<Vec<Project>, String> {
    ProjectService::load_all_projects()
        .map_err(|e| format!("Failed to load all projects: {}", e))
}

#[tauri::command]
pub async fn get_project(project_id: String) -> Result<Project, String> {
    ProjectService::load_project(&project_id)
        .map_err(|e| format!("Failed to load project: {}", e))
}

#[tauri::command]
pub async fn create_project(name: String, goal: String, skills: Vec<String>) -> Result<Project, String> {
    ProjectService::create_project(&name, &goal, skills)
        .map_err(|e| format!("Failed to create project: {}", e))
}

#[tauri::command]
pub async fn get_project_files(project_id: String) -> Result<Vec<String>, String> {
    ProjectService::list_project_files(&project_id)
        .map_err(|e| format!("Failed to list project files: {}", e))
}
