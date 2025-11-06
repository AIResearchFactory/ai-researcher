use crate::services::file_service::FileService;

#[tauri::command]
pub async fn read_markdown_file(project_id: String, file_name: String) -> Result<String, String> {
    FileService::read_file(&project_id, &file_name)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn write_markdown_file(project_id: String, file_name: String, content: String) -> Result<(), String> {
    FileService::write_file(&project_id, &file_name, &content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub async fn delete_markdown_file(project_id: String, file_name: String) -> Result<(), String> {
    FileService::delete_file(&project_id, &file_name)
        .map_err(|e| format!("Failed to delete file: {}", e))
}
