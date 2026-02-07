use crate::models::mcp::{McpServerConfig, RegistryResponse, RegistryServer};
use crate::services::settings_service::SettingsService;
use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};

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

#[tauri::command]
pub async fn fetch_mcp_marketplace() -> Result<Vec<McpServerConfig>, String> {
    let client = reqwest::Client::new();
    let mut all_servers = Vec::new();
    let mut next_cursor: Option<String> = None;
    let mut page_count = 0;
    
    // Fetch up to 5 pages to avoid excessive requests, but cover most popular servers
    loop {
        if page_count >= 5 {
            break;
        }

        let mut url = "https://registry.modelcontextprotocol.io/v0.1/servers".to_string();
        if let Some(cursor) = &next_cursor {
            url.push_str(&format!("?cursor={}", cursor));
        }

        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static("AI-Researcher-App/0.1"));
        
        // Handle potential errors gracefully
        let res = match client.get(&url).headers(headers).send().await {
            Ok(r) => r,
            Err(e) => return Err(format!("Failed to fetch marketplace: {}", e)),
        };

        if !res.status().is_success() {
             return Err(format!("Marketplace API error: {}", res.status()));
        }

        let registry_data: RegistryResponse = match res.json().await {
            Ok(d) => d,
            Err(e) => return Err(format!("Failed to parse marketplace JSON: {}", e)),
        };

        for item in registry_data.servers {
            let server = item.server;
            
            // Convert RegistryServer to McpServerConfig (disabled by default)
            // We prioritize NPM packages for now as 'npx' is our supported command
            if let Some(packages) = &server.packages {
                 for pkg in packages {
                     if pkg.registry_type == "npm" {
                         // Construct config
                         // Use package name as ID (sanitized)
                         let id = pkg.identifier.replace("/", "-").replace("@", "");
                         
                         let config = McpServerConfig {
                             id: id.clone(),
                             name: server.name.clone(), // or server.title if available? server.name seems to be an ID-like string in the JSON example, maybe I should check title?
                             description: server.description.clone(),
                             command: "npx".to_string(),
                             args: vec!["-y".to_string(), pkg.identifier.clone()],
                             env: None,
                             enabled: false,
                         };
                         all_servers.push(config);
                         // only take the first npm package for now
                         break;
                     }
                 }
            }
        }
        
        if let Some(meta) = registry_data.metadata {
             next_cursor = meta.next_cursor;
        } else {
             next_cursor = None;
        }

        if next_cursor.is_none() {
            break;
        }
        
        page_count += 1;
    }

    Ok(all_servers)
}
