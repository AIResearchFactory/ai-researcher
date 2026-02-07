use crate::models::mcp::{McpServerConfig, RegistryResponse, RegistryServer};
use crate::services::settings_service::SettingsService;
use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};
use std::collections::HashSet;

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
pub async fn fetch_mcp_marketplace(query: Option<String>) -> Result<Vec<McpServerConfig>, String> {
    let client = reqwest::Client::new();
    let mut all_servers = Vec::new();
    let mut next_cursor: Option<String> = None;
    let mut page_count = 0;
    
    // Featured server identifiers to prioritize
    let featured_identifiers: HashSet<&str> = [
        "@modelcontextprotocol/server-filesystem",
        "@modelcontextprotocol/server-github",
        "@modelcontextprotocol/server-git",
        "@modelcontextprotocol/server-postgres",
        "@modelcontextprotocol/server-brave-search",
        "@modelcontextprotocol/server-google-maps",
        "@modelcontextprotocol/server-memory",
    ].iter().cloned().collect();

    // Fetch up to 5 pages if no query, or just search if query exists
    loop {
        if page_count >= 5 {
            break;
        }

        let mut url = "https://registry.modelcontextprotocol.io/v0.1/servers".to_string();
        let mut params = Vec::new();

        if let Some(q) = &query {
            params.push(format!("search={}", q));
        }
        
        if let Some(cursor) = &next_cursor {
            params.push(format!("cursor={}", cursor));
        }

        if !params.is_empty() {
            url.push_str("?");
            url.push_str(&params.join("&"));
        }

        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static("AI-Researcher-App/0.1"));
        
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
            
            if let Some(packages) = &server.packages {
                 for pkg in packages {
                     if pkg.registry_type == "npm" {
                         let id = pkg.identifier.replace("/", "-").replace("@", "");
                         
                         let config = McpServerConfig {
                             id: id.clone(),
                             name: server.name.clone(),
                             description: server.description.clone(),
                             command: "npx".to_string(),
                             args: vec!["-y".to_string(), pkg.identifier.clone()],
                             env: None,
                             enabled: false,
                         };
                         
                         // Prioritize featured ones if no query
                         if query.is_none() && featured_identifiers.contains(pkg.identifier.as_str()) {
                             all_servers.insert(0, config);
                         } else {
                             all_servers.push(config);
                         }
                         break;
                     }
                 }
            }
        }
        
        // If searching, typically the first page is enough unless we want deep search
        if query.is_some() {
            break;
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
