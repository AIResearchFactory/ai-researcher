use crate::models::mcp::McpServerConfig;
use crate::services::settings_service::SettingsService;

#[tauri::command]
pub async fn get_mcp_servers() -> Result<Vec<McpServerConfig>, String> {
    let settings = SettingsService::load_global_settings()
        .map_err(|e| format!("Failed to load global settings: {}", e))?;
    Ok(settings.mcp_servers)
}

#[tauri::command]
pub async fn add_mcp_server(config: McpServerConfig) -> Result<(), String> {
    let mut settings = SettingsService::load_global_settings()
        .map_err(|e| format!("Failed to load global settings: {}", e))?;

    // Check if ID already exists
    if settings.mcp_servers.iter().any(|s| s.id == config.id) {
        return Err(format!("MCP server with ID '{}' already exists", config.id));
    }

    settings.mcp_servers.push(config);

    SettingsService::save_global_settings(&settings)
        .map_err(|e| format!("Failed to save global settings: {}", e))
}

#[tauri::command]
pub async fn remove_mcp_server(id: String) -> Result<(), String> {
    let mut settings = SettingsService::load_global_settings()
        .map_err(|e| format!("Failed to load global settings: {}", e))?;

    settings.mcp_servers.retain(|s| s.id != id);

    SettingsService::save_global_settings(&settings)
        .map_err(|e| format!("Failed to save global settings: {}", e))
}

#[tauri::command]
pub async fn toggle_mcp_server(id: String, enabled: bool) -> Result<(), String> {
    let mut settings = SettingsService::load_global_settings()
        .map_err(|e| format!("Failed to load global settings: {}", e))?;

    if let Some(server) = settings.mcp_servers.iter_mut().find(|s| s.id == id) {
        server.enabled = enabled;
    } else {
        return Err(format!("MCP server with ID '{}' not found", id));
    }

    SettingsService::save_global_settings(&settings)
        .map_err(|e| format!("Failed to save global settings: {}", e))
}

#[tauri::command]
pub async fn update_mcp_server(config: McpServerConfig) -> Result<(), String> {
    let mut settings = SettingsService::load_global_settings()
        .map_err(|e| format!("Failed to load global settings: {}", e))?;

    if let Some(index) = settings.mcp_servers.iter().position(|s| s.id == config.id) {
        settings.mcp_servers[index] = config;
    } else {
        return Err(format!("MCP server with ID '{}' not found", config.id));
    }

    SettingsService::save_global_settings(&settings)
        .map_err(|e| format!("Failed to save global settings: {}", e))
}
