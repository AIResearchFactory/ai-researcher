use crate::services::claude_service::{ChatMessage, ChatRequest, ClaudeService};
use crate::services::secrets_service::SecretsService;
use crate::services::settings_service::SettingsService;
use crate::services::project_service::ProjectService;
use futures::StreamExt;
use serde_json::json;
use tauri::Emitter;

#[tauri::command]
pub async fn send_chat_message(
    request: ChatRequest,
    window: tauri::Window,
) -> Result<String, String> {
    // Get API key from secrets
    let api_key = SecretsService::get_claude_api_key()
        .map_err(|e| format!("Failed to get API key: {}", e))?
        .ok_or_else(|| "Claude API key not configured".to_string())?;

    // Create enhanced request with skill-based system prompt if needed
    let mut enhanced_request = request.clone();

    // If skill_id is provided, build enhanced system prompt
    if request.skill_id.is_some() || request.project_id.is_some() {
        // Get project goal if project_id is provided
        let project_goal = if let Some(ref project_id) = request.project_id {
            let projects_path = SettingsService::get_projects_path()
                .map_err(|e| format!("Failed to get projects path: {}", e))?;
            let project_path = projects_path.join(project_id);

            if project_path.exists() {
                ProjectService::load_project(&project_path)
                    .ok()
                    .map(|project| project.goal)
            } else {
                None
            }
        } else {
            None
        };

        // Build enhanced system prompt with skill if provided
        let enhanced_system_prompt = ClaudeService::build_system_prompt_with_skill(
            request.system_prompt.clone(),
            request.skill_id.clone(),
            request.skill_params.clone(),
            project_goal,
        )
        .map_err(|e| format!("Failed to build system prompt: {}", e))?;

        enhanced_request.system_prompt = Some(enhanced_system_prompt);
    }

    // Create Claude service
    let service = ClaudeService::new(api_key);

    // Send message and stream response
    let mut stream = service
        .send_message(enhanced_request)
        .await
        .map_err(|e| format!("Failed to send message: {}", e))?;

    let mut full_response = String::new();

    // Stream chunks to frontend
    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                if !chunk.is_empty() {
                    full_response.push_str(&chunk);
                    // Emit chunk event to frontend
                    let _ = window.emit("chat-chunk", json!({ "chunk": chunk }));
                }
            }
            Err(e) => {
                log::error!("Error streaming chunk: {}", e);
                return Err(format!("Streaming error: {}", e));
            }
        }
    }

    // Add assistant's response to messages
    let mut all_messages = request.messages.clone();
    all_messages.push(ChatMessage {
        role: "assistant".to_string(),
        content: full_response,
    });

    // Save complete conversation to file
    let project_id = request.project_id.as_deref().unwrap_or("default");
    let file_name = ClaudeService::save_chat_to_file(project_id, all_messages)
        .await
        .map_err(|e| format!("Failed to save chat: {}", e))?;

    // Emit completion event
    let _ = window.emit("chat-complete", json!({ "file": file_name }));

    Ok(file_name)
}

#[tauri::command]
pub async fn load_chat_history(
    project_id: String,
    chat_file: String,
) -> Result<Vec<ChatMessage>, String> {
    ClaudeService::load_chat_from_file(&project_id, &chat_file)
        .await
        .map_err(|e| format!("Failed to load chat history: {}", e))
}

#[tauri::command]
pub async fn get_chat_files(project_id: String) -> Result<Vec<String>, String> {
    ClaudeService::get_chat_files(&project_id)
        .await
        .map_err(|e| format!("Failed to get chat files: {}", e))
}
