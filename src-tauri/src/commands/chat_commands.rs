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
