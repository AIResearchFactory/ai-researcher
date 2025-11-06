use crate::services::secrets_service::{Secrets, SecretsService};

#[tauri::command]
pub async fn get_secrets() -> Result<Secrets, String> {
    SecretsService::load_secrets().map_err(|e| format!("Failed to load secrets: {}", e))
}

#[tauri::command]
pub async fn save_secrets(secrets: Secrets) -> Result<(), String> {
    SecretsService::save_secrets(&secrets).map_err(|e| format!("Failed to save secrets: {}", e))
}

#[tauri::command]
pub async fn has_claude_api_key() -> Result<bool, String> {
    let api_key = SecretsService::get_claude_api_key()
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    Ok(api_key.is_some() && !api_key.unwrap().is_empty())
}
