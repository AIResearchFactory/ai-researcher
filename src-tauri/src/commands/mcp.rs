use crate::models::mcp::{
    McpServerConfig, RegistryResponse, RegistryServer, 
    McpMarketSearchResponse, McpMarketTool
};
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
    
    // 1. Try fetching from mcpmarket.com for broader coverage and richer data
    let market_url = format!(
        "https://mcpmarket.com/api/search?query={}",
        query.as_deref().unwrap_or("")
    );
    
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("AI-Researcher-App/0.1"));
    
    if let Ok(res) = client.get(&market_url).headers(headers.clone()).send().await {
        if res.status().is_success() {
            if let Ok(market_data) = res.json::<McpMarketSearchResponse>().await {
                for tool in market_data.tools {
                    // mcpmarket doesn't always provide the npx command directly in the top-level tool object
                    // but we can infer it if it has a github repo and it's a common pattern
                    // or we can use it just for metadata and fallback to official registry for install details
                    
                    let id = tool.github.clone().unwrap_or(tool.name.clone()).replace("/", "-");
                    
                    // We assume that if it's on mcpmarket and has a github, we might be able to run it
                    // but for installation we still prefer NPM packages.
                    // Let's create a placeholder config that we'll enrich if we find it in the official registry too.
                    
                    let config = McpServerConfig {
                        id: id.clone(),
                        name: {
                            // Sanitise technical names like "io.github.owner/repo" or "owner/repo"
                            let raw = tool.name.clone();
                            let base = if raw.contains('/') {
                                raw.split('/').last().unwrap_or(&raw).to_string()
                            } else {
                                raw
                            };
                            // Title case or replace dashes/dots with spaces
                            base.replace('-', " ").replace('.', " ").replace('_', " ")
                                .split_whitespace()
                                .map(|word| {
                                    let mut chars = word.chars();
                                    match chars.next() {
                                        None => String::new(),
                                        Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
                                    }
                                })
                                .collect::<Vec<String>>()
                                .join(" ")
                        },
                        description: tool.description.clone(),
                        command: "npx".to_string(), // Default to npx
                        args: vec!["-y".to_string(), tool.github.clone().unwrap_or_default()],
                        env: None,
                        enabled: false,
                        stars: tool.github_stars,
                        author: tool.owner.as_ref().map(|o| o.name.clone()),
                        source: Some("mcpmarket".to_string()),
                        categories: tool.categories.as_ref().map(|cats| cats.iter().map(|c| c.name.clone()).collect()),
                        icon_url: tool.owner.as_ref().and_then(|o| o.avatar.clone()),
                    };
                    all_servers.push(config);
                }
            }
        }
    }

    // 2. Fetch from official registry for concrete install instructions
    let mut next_cursor: Option<String> = None;
    let mut page_count = 0;
    
    let featured_identifiers: HashSet<&str> = [
        "@modelcontextprotocol/server-filesystem",
        "@modelcontextprotocol/server-github",
        "@modelcontextprotocol/server-git",
        "@modelcontextprotocol/server-postgres",
        "@modelcontextprotocol/server-brave-search",
        "@modelcontextprotocol/server-google-maps",
        "@modelcontextprotocol/server-memory",
        "@cedricziel/aha-mcp",
        "@modelcontextprotocol/server-jira",
        "@mondaydotcomorg/mcp-server",
        "productboard-mcp-server",
    ].iter().cloned().collect();

    loop {
        if page_count >= 3 { // Reduce depth since we have mcpmarket now
            break;
        }

        let mut url = "https://registry.modelcontextprotocol.io/v0.1/servers".to_string();
        let mut params = Vec::new();
        if let Some(q) = &query { params.push(format!("search={}", q)); }
        if let Some(cursor) = &next_cursor { params.push(format!("cursor={}", cursor)); }
        if !params.is_empty() {
            url.push_str("?");
            url.push_str(&params.join("&"));
        }
        
        let res = match client.get(&url).headers(headers.clone()).send().await {
            Ok(r) => r,
            Err(_) => break, // Fallback to what we have
        };

        if !res.status().is_success() { break; }

        if let Ok(registry_data) = res.json::<RegistryResponse>().await {
            for item in registry_data.servers {
                let server = item.server;
                if let Some(packages) = &server.packages {
                    for pkg in packages {
                        if pkg.registry_type == "npm" {
                            let id = pkg.identifier.replace("/", "-").replace("@", "");
                            
                            // Check if we already have this from mcpmarket (by name or id)
                            let mut exists = false;
                            for s in all_servers.iter_mut() {
                                if s.name.to_lowercase() == server.name.to_lowercase() || s.id == id {
                                    // Update with concrete install info
                                    s.command = "npx".to_string();
                                    s.args = vec!["-y".to_string(), pkg.identifier.clone()];
                                    s.source = Some("registry".to_string());
                                    exists = true;
                                    break;
                                }
                            }
                            
                            let display_name = server.title.clone().unwrap_or_else(|| {
                                // Sanitise technical names like "io.github.owner/repo" or "owner/repo"
                                let name = if server.name.contains('/') {
                                    server.name.split('/').last().unwrap_or(&server.name).to_string()
                                } else {
                                    server.name.clone()
                                };
                                // Title case or replace dashes/dots with spaces
                                name.replace('-', " ").replace('.', " ")
                                    .split_whitespace()
                                    .map(|word| {
                                        let mut chars = word.chars();
                                        match chars.next() {
                                            None => String::new(),
                                            Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
                                        }
                                    })
                                    .collect::<Vec<String>>()
                                    .join(" ")
                            });

                            if !exists {
                                let config = McpServerConfig {
                                    id: id.clone(),
                                    name: display_name,
                                    description: server.description.clone(),
                                    command: "npx".to_string(),
                                    args: vec!["-y".to_string(), pkg.identifier.clone()],
                                    env: None,
                                    enabled: false,
                                    stars: None,
                                    author: None,
                                    source: Some("registry".to_string()),
                                    categories: None,
                                    icon_url: None,
                                };
                                
                                if query.is_none() && featured_identifiers.contains(pkg.identifier.as_str()) {
                                    all_servers.insert(0, config);
                                } else {
                                    all_servers.push(config);
                                }
                            }
                            break;
                        }
                    }
                }
            }
            if let Some(meta) = registry_data.metadata { next_cursor = meta.next_cursor; } else { next_cursor = None; }
            if next_cursor.is_none() || query.is_some() { break; }
            page_count += 1;
        } else { break; }
    }

    Ok(all_servers)
}
