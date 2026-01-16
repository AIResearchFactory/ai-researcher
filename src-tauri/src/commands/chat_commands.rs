use crate::models::ai::{Message, ChatResponse, Tool, ProviderType, MCPServerConfig};
use crate::services::ai_service::AIService;
use crate::services::claude_service::{ClaudeService, ChatMessage};
use crate::services::project_service::ProjectService;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn send_message(
    state: State<'_, Arc<AIService>>,
    messages: Vec<Message>,
    project_id: Option<String>,
) -> Result<ChatResponse, String> {
    let mut system_prompt = String::from("You are a helpful AI research assistant.");

    if let Some(pid) = &project_id {
        // Load project context
        if let Ok(project) = ProjectService::load_project_by_id(pid) {
             system_prompt.push_str(&format!("\n\nYou are working on the project: {}\nProject Goal: {}\n", project.name, project.goal));
             
             if !project.skills.is_empty() {
                 system_prompt.push_str("\nAvailable Skills in this project:\n");
                 for skill in &project.skills {
                     system_prompt.push_str(&format!("- {}\n", skill));
                 }
             }
        }
        
        if let Ok(files) = ProjectService::list_project_files(pid) {
            if !files.is_empty() {
                system_prompt.push_str("\nThe project contains the following files:\n");
                for file in files {
                    system_prompt.push_str(&format!("- {}\n", file));
                }
                system_prompt.push_str("\nYou can read these files if you have the appropriate tools enabled via MCP.");
            }
        }
    }

    let response = state.chat(messages.clone(), Some(system_prompt))
        .await
        .map_err(|e| e.to_string())?;

    // Save to history if project is active
    if let Some(pid) = project_id {
        let mut all_messages = messages;
        all_messages.push(Message {
            role: "assistant".to_string(),
            content: response.content.clone(),
        });
        
        let chat_messages: Vec<ChatMessage> = all_messages.into_iter().map(|m| ChatMessage {
            role: m.role,
            content: m.content,
        }).collect();

        // Use a generic model name for the history file if we don't have the specific one easily
        let _ = ClaudeService::save_chat_to_file(&pid, chat_messages, "UnifiedAI").await;
    }

    Ok(response)
}

#[tauri::command]
pub async fn list_mcp_tools(
    state: State<'_, Arc<AIService>>,
) -> Result<Vec<Tool>, String> {
    state.get_mcp_client().get_all_tools()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn switch_provider(
    state: State<'_, Arc<AIService>>,
    provider_type: ProviderType,
) -> Result<(), String> {
    state.switch_provider(provider_type)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_mcp_server(
    state: State<'_, Arc<AIService>>,
    config: MCPServerConfig,
) -> Result<(), String> {
    state.get_mcp_client().add_server(config)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_chat_history(
    project_id: String,
    chat_file: String,
) -> Result<Vec<Message>, String> {
    let old_messages = ClaudeService::load_chat_from_file(&project_id, &chat_file)
        .await
        .map_err(|e| format!("Failed to load chat history: {}", e))?;
    
    Ok(old_messages.into_iter().map(|m| Message {
        role: m.role,
        content: m.content,
    }).collect())
}

#[tauri::command]
pub async fn get_chat_files(project_id: String) -> Result<Vec<String>, String> {
    ClaudeService::get_chat_files(&project_id)
        .await
        .map_err(|e| format!("Failed to get chat files: {}", e))
}

#[tauri::command]
pub async fn get_ollama_models() -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let res = client.get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;
    
    if !res.status().is_success() {
        return Err(format!("Ollama API returned detailed error: {}", res.status()));
    }

    let body = res.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut models = Vec::new();
    if let Some(models_arr) = json.get("models").and_then(|v| v.as_array()) {
        for model in models_arr {
            if let Some(name) = model.get("name").and_then(|v| v.as_str()) {
                models.push(name.to_string());
            }
        }
    }

    Ok(models)
}

#[tauri::command]
#[allow(dead_code)]
pub async fn get_mcp_server_tools(
    _state: State<'_, Arc<AIService>>,
    _server_id: String,
) -> Result<Vec<Tool>, String> {
    // This requires exposing a method on AIService/MCPClient to get tools for a specific server
    // For now, we can filter the all_tools list if MCPClient attaches server_id source
    // But MCPClient returns a flat list of Tools.
    // Let's rely on list_mcp_tools for now which returns all tools.
    // However, for debugging Claude Code specifically, we want to know if it's even connected.
    // We can try to call 'list_tools' on the specific server via the client if we expose it.
    
    // Instead, let's just return all tools, but user might want to filter.
    // Actually, let's implement a proper server-specific tool fetch if possible.
    // But MCPClient::get_all_tools() aggregates them. 
    // Let's just stick to get_ollama_models for now and use the existing list_mcp_tools.
    
    // Wait, I can try to use state.get_mcp_client().call_tool to call "list_tools" if it were a tool, but it's an RPC method.
    // The MCPClient doesn't expose `get_tools_for_server`.
    
    // Minimal implementation:
    Err("Not implemented yet".to_string())
}
