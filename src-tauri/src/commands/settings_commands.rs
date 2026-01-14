use crate::models::settings::{GlobalSettings, ProjectSettings};
use crate::services::settings_service::SettingsService;
use crate::utils::paths;

#[tauri::command]
pub async fn get_app_data_directory() -> Result<String, String> {
    paths::get_app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get app data directory: {}", e))
}

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
    let project = crate::services::project_service::ProjectService::load_project_by_id(&project_id)
        .map_err(|e| format!("Failed to load project: {}", e))?;

    Ok(Some(ProjectSettings {
        name: Some(project.name),
        goal: Some(project.goal),
        custom_prompt: project.custom_prompt,
        preferred_skills: project.skills,
        auto_save: Some(project.auto_save),
        encryption_enabled: Some(project.encryption_enabled),
    }))
}

#[tauri::command]
pub async fn save_project_settings(project_id: String, settings: ProjectSettings) -> Result<(), String> {
    let mut project = crate::services::project_service::ProjectService::load_project_by_id(&project_id)
        .map_err(|e| format!("Failed to load project: {}", e))?;

    if let Some(name) = settings.name {
        project.name = name;
    }
    if let Some(goal) = settings.goal {
        project.goal = goal;
    }
    if let Some(auto_save) = settings.auto_save {
        project.auto_save = auto_save;
    }
    if let Some(encryption_enabled) = settings.encryption_enabled {
        project.encryption_enabled = encryption_enabled;
    }
    if let Some(custom_prompt) = settings.custom_prompt {
        project.custom_prompt = Some(custom_prompt);
    }
    
    // skills/preferred_skills are the same
    project.skills = settings.preferred_skills;

    project.save().map_err(|e| format!("Failed to save project settings: {}", e))?;

    Ok(())
}
