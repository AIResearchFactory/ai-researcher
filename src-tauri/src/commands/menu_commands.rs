use tauri::{AppHandle, Emitter};

/// Menu command handlers that emit events to the frontend
/// These are triggered by native menu items on macOS

#[tauri::command]
pub async fn trigger_new_project(app: AppHandle) -> Result<(), String> {
    app.emit("menu:new-project", ())
        .map_err(|e| format!("Failed to emit new-project event: {}", e))
}

#[tauri::command]
pub async fn trigger_new_file(app: AppHandle) -> Result<(), String> {
    app.emit("menu:new-file", ())
        .map_err(|e| format!("Failed to emit new-file event: {}", e))
}

#[tauri::command]
pub async fn trigger_close_file(app: AppHandle) -> Result<(), String> {
    app.emit("menu:close-file", ())
        .map_err(|e| format!("Failed to emit close-file event: {}", e))
}

#[tauri::command]
pub async fn trigger_close_project(app: AppHandle) -> Result<(), String> {
    app.emit("menu:close-project", ())
        .map_err(|e| format!("Failed to emit close-project event: {}", e))
}

#[tauri::command]
pub async fn trigger_find(app: AppHandle) -> Result<(), String> {
    app.emit("menu:find", ())
        .map_err(|e| format!("Failed to emit find event: {}", e))
}

#[tauri::command]
pub async fn trigger_replace(app: AppHandle) -> Result<(), String> {
    app.emit("menu:replace", ())
        .map_err(|e| format!("Failed to emit replace event: {}", e))
}

#[tauri::command]
pub async fn trigger_find_in_files(app: AppHandle) -> Result<(), String> {
    app.emit("menu:find-in-files", ())
        .map_err(|e| format!("Failed to emit find-in-files event: {}", e))
}

#[tauri::command]
pub async fn trigger_replace_in_files(app: AppHandle) -> Result<(), String> {
    app.emit("menu:replace-in-files", ())
        .map_err(|e| format!("Failed to emit replace-in-files event: {}", e))
}

#[tauri::command]
pub async fn trigger_select_all(app: AppHandle) -> Result<(), String> {
    app.emit("menu:select-all", ())
        .map_err(|e| format!("Failed to emit select-all event: {}", e))
}

#[tauri::command]
pub async fn trigger_expand_selection(app: AppHandle) -> Result<(), String> {
    app.emit("menu:expand-selection", ())
        .map_err(|e| format!("Failed to emit expand-selection event: {}", e))
}

#[tauri::command]
pub async fn trigger_copy_as_markdown(app: AppHandle) -> Result<(), String> {
    app.emit("menu:copy-as-markdown", ())
        .map_err(|e| format!("Failed to emit copy-as-markdown event: {}", e))
}

#[tauri::command]
pub async fn trigger_welcome(app: AppHandle) -> Result<(), String> {
    app.emit("menu:welcome", ())
        .map_err(|e| format!("Failed to emit welcome event: {}", e))
}

#[tauri::command]
pub async fn trigger_release_notes(app: AppHandle) -> Result<(), String> {
    app.emit("menu:release-notes", ())
        .map_err(|e| format!("Failed to emit release-notes event: {}", e))
}

#[tauri::command]
pub async fn trigger_documentation(app: AppHandle) -> Result<(), String> {
    app.emit("menu:documentation", ())
        .map_err(|e| format!("Failed to emit documentation event: {}", e))
}

#[tauri::command]
pub async fn trigger_check_for_updates(app: AppHandle) -> Result<(), String> {
    app.emit("menu:check-for-updates", ())
        .map_err(|e| format!("Failed to emit check-for-updates event: {}", e))
}

#[tauri::command]
pub async fn trigger_settings(app: AppHandle) -> Result<(), String> {
    app.emit("menu:settings", ())
        .map_err(|e| format!("Failed to emit settings event: {}", e))
}
