use crate::models::settings::{GlobalSettings, ProjectSettings};
use crate::services::settings_service::SettingsService;

#[tauri::command]
pub async fn get_global_settings() -> Result<GlobalSettings, String> {
    SettingsService::load_global_settings()
        .map_err(|e| format!("Failed to load global settings: {}", e))
}

#[tauri::command]
pub async fn save_global_settings(settings: GlobalSettings) -> Result<(), String> {
    SettingsService::save_global_settings(&settings)
        .map_err(|e| format!("Failed to save global settings: {}", e))
}

#[tauri::command]
pub async fn get_project_settings(project_id: String) -> Result<Option<ProjectSettings>, String> {
    let projects_path = SettingsService::get_projects_path()
        .map_err(|e| format!("Failed to get projects path: {}", e))?;

    let project_path = projects_path.join(&project_id);

    SettingsService::load_project_settings(&project_path)
        .map_err(|e| format!("Failed to load project settings: {}", e))
}

#[tauri::command]
pub async fn save_project_settings(project_id: String, settings: ProjectSettings) -> Result<(), String> {
    let projects_path = SettingsService::get_projects_path()
        .map_err(|e| format!("Failed to get projects path: {}", e))?;

    let project_path = projects_path.join(&project_id);

    SettingsService::save_project_settings(&project_path, &settings)
        .map_err(|e| format!("Failed to save project settings: {}", e))
}
