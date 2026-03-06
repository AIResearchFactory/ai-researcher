use crate::services::encryption_service::EncryptionService;
use crate::services::secrets_service::{Secrets, SecretsService};

fn mask_secret(value: &str) -> String {
    if value.is_empty() {
        return String::new();
    }
    let keep = value.chars().count().min(4);
    let suffix: String = value
        .chars()
        .rev()
        .take(keep)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    format!("••••{}", suffix)
}

fn redact_secrets(mut secrets: Secrets) -> Secrets {
    if let Some(v) = secrets.claude_api_key.as_ref() {
        secrets.claude_api_key = Some(mask_secret(v));
    }
    if let Some(v) = secrets.gemini_api_key.as_ref() {
        secrets.gemini_api_key = Some(mask_secret(v));
    }
    if let Some(v) = secrets.n8n_webhook_url.as_ref() {
        secrets.n8n_webhook_url = Some(mask_secret(v));
    }
    for value in secrets.custom_api_keys.values_mut() {
        *value = mask_secret(value);
    }
    secrets
}

#[tauri::command]
pub async fn get_secrets() -> Result<Secrets, String> {
    let secrets = SecretsService::load_secrets().map_err(|e| format!("Failed to load secrets: {}", e))?;
    // Security hardening: never return raw secret values to renderer.
    Ok(redact_secrets(secrets))
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
pub async fn has_gemini_api_key() -> Result<bool, String> {
    let secrets =
        SecretsService::load_secrets().map_err(|e| format!("Failed to load secrets: {}", e))?;
    Ok(secrets.gemini_api_key.map_or(false, |key| !key.is_empty()))
}

#[tauri::command]
pub async fn test_encryption() -> Result<bool, String> {
    let test_data = "test_encryption";
    let encrypted = EncryptionService::encrypt(test_data).map_err(|e| e.to_string())?;
    let decrypted = EncryptionService::decrypt(&encrypted).map_err(|e| e.to_string())?;

    Ok(test_data == decrypted)
}

#[tauri::command]
pub async fn reset_encryption_key() -> Result<(), String> {
    EncryptionService::delete_master_key().map_err(|e| e.to_string())
}
