use crate::models::ai::{Message, ChatResponse, Tool, ProviderType, MCPServerConfig};
use crate::services::ai_service::AIService;
use crate::services::agent_orchestrator::AgentOrchestrator;
use crate::services::project_service::ProjectService;
use std::sync::Arc;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub async fn send_message(
    _ai_service: State<'_, Arc<AIService>>,
    orchestrator: State<'_, Arc<AgentOrchestrator>>,
    messages: Vec<Message>,
    project_id: Option<String>,
    skill_id: Option<String>,
    skill_params: Option<HashMap<String, String>>,
) -> Result<ChatResponse, String> {
    // 1. Context Construction (Hoisted from God Method)
    let system_prompt = build_system_prompt(&project_id);

    // 2. Delegate to Orchestrator (The Lifecycle Manager)
    orchestrator.run_agent_loop(messages, Some(system_prompt), project_id, skill_id, skill_params)
        .await
        .map_err(|e| e.to_string())
}

/// Helper to build the system prompt based on project context
fn build_system_prompt(project_id: &Option<String>) -> String {
    let mut prompt = String::from("You are a helpful AI research assistant.");

    if let Some(pid) = project_id {
        if let Ok(project) = ProjectService::load_project_by_id(pid) {
             prompt.push_str(&format!("\n\nYou are working on the project: {}\nProject Goal: {}\n", project.name, project.goal));
             
             if !project.skills.is_empty() {
                 prompt.push_str("\nAvailable Skills in this project:\n");
                 for skill in &project.skills {
                     prompt.push_str(&format!("- {}\n", skill));
                 }
             }
        }
        
        if let Ok(files) = ProjectService::list_project_files(pid) {
            if !files.is_empty() {
                prompt.push_str("\nThe project contains the following files:\n");
                for file in files {
                    prompt.push_str(&format!("- {}\n", file));
                }
                prompt.push_str("\nYou can read these files if you have the appropriate tools enabled via MCP.");
            }
        }
    }
    prompt
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
    use crate::services::chat_service::ChatService;
    let old_messages = ChatService::load_chat_from_file(&project_id, &chat_file)
        .await
        .map_err(|e| format!("Failed to load chat history: {}", e))?;
    
    Ok(old_messages.into_iter().map(|m| Message {
        role: m.role,
        content: m.content,
    }).collect())
}

#[tauri::command]
pub async fn get_chat_files(project_id: String) -> Result<Vec<String>, String> {
    use crate::services::chat_service::ChatService;
    ChatService::get_chat_files(&project_id)
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
pub async fn get_mcp_server_tools(
    _state: State<'_, Arc<AIService>>,
    _server_id: String,
) -> Result<Vec<Tool>, String> {
    Err("Not implemented yet".to_string())
}
