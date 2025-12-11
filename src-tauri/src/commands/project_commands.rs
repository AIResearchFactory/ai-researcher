use crate::models::project::Project;
use crate::services::project_service::ProjectService;
use crate::services::settings_service::SettingsService;

#[tauri::command]
pub async fn get_all_projects() -> Result<Vec<Project>, String> {
    ProjectService::discover_projects()
        .map_err(|e| format!("Failed to load all projects: {}", e))
}

#[tauri::command]
pub async fn get_project(project_id: String) -> Result<Project, String> {
    let projects_path = SettingsService::get_projects_path()
        .map_err(|e| format!("Failed to get projects path: {}", e))?;

    let project_path = projects_path.join(&project_id);

    ProjectService::load_project(&project_path)
        .map_err(|e| format!("Failed to load project: {}", e))
}

#[tauri::command]
pub async fn create_project(name: String, goal: String, skills: Vec<String>) -> Result<Project, String> {
    log::info!("Creating project: {}", name);
    match ProjectService::create_project(&name, &goal, skills) {
        Ok(project) => {
            log::info!("Project created successfully: {:?}", project.id);
            Ok(project)
        },
        Err(e) => {
            log::error!("Failed to create project: {}", e);
            Err(format!("Failed to create project: {}", e))
        }
    }
}

#[tauri::command]
pub async fn get_project_files(project_id: String) -> Result<Vec<String>, String> {
    ProjectService::list_project_files(&project_id)
        .map_err(|e| format!("Failed to list project files: {}", e))
}
