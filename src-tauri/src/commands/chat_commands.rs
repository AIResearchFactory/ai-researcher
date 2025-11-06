use crate::services::claude_service::{ChatMessage, ChatRequest, ClaudeService};
use crate::services::secrets_service::SecretsService;
use futures::StreamExt;
use serde_json::json;

#[tauri::command]
pub async fn send_chat_message(
    request: ChatRequest,
    window: tauri::Window,
) -> Result<String, String> {
    // Get API key from secrets
    let api_key = SecretsService::get_claude_api_key()
        .map_err(|e| format!("Failed to get API key: {}", e))?
        .ok_or_else(|| "Claude API key not configured".to_string())?;

    // Create Claude service
    let service = ClaudeService::new(api_key);

    // Send message and stream response
    let mut stream = service
        .send_message(request.clone())
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
