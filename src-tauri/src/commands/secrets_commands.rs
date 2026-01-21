use crate::services::secrets_service::{Secrets, SecretsService};
use crate::services::encryption_service::EncryptionService;

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
        .map_err(|e| format!("Failed to check for API key: {}", e))?;
    Ok(api_key.is_some_and(|key| !key.is_empty()))
}

#[tauri::command]
pub async fn test_encryption() -> Result<bool, String> {
    let test_data = "test_encryption";
    let encrypted = EncryptionService::encrypt(test_data)
        .map_err(|e| e.to_string())?;
    let decrypted = EncryptionService::decrypt(&encrypted)
        .map_err(|e| e.to_string())?;

    Ok(test_data == decrypted)
}

#[tauri::command]
pub async fn reset_encryption_key() -> Result<(), String> {
    EncryptionService::delete_master_key()
        .map_err(|e| e.to_string())
}
