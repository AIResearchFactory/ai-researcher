// Modules
mod commands;
mod models;
mod services;
mod utils;

use tauri::Manager;
use utils::paths;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Initialize directory structure on app startup
      if let Err(e) = paths::initialize_directory_structure() {
        log::error!("Failed to initialize directory structure: {}", e);
        return Err(e.into());
      }

      // Set up file watcher
      let app_handle = app.handle().clone();
      std::thread::spawn(move || {
        // Initialize file watcher
        let base_path = paths::get_base_directory().unwrap();
        let mut watcher = services::file_watcher::FileWatcherService::new();

        if let Err(e) = watcher.start_watching(&base_path, move |event| {
          // Emit events to frontend
          match event {
            services::file_watcher::WatchEvent::ProjectAdded(id) => {
              let _ = app_handle.emit("project-added", id);
            }
            services::file_watcher::WatchEvent::ProjectModified(id) => {
              let _ = app_handle.emit("project-modified", id);
            }
            services::file_watcher::WatchEvent::ProjectDeleted(id) => {
              let _ = app_handle.emit("project-deleted", id);
            }
            services::file_watcher::WatchEvent::FileAdded(project_id, file_name) => {
              let _ = app_handle.emit("file-added", (project_id, file_name));
            }
            services::file_watcher::WatchEvent::FileModified(project_id, file_name) => {
              let _ = app_handle.emit("file-modified", (project_id, file_name));
            }
            services::file_watcher::WatchEvent::FileDeleted(project_id, file_name) => {
              let _ = app_handle.emit("file-deleted", (project_id, file_name));
            }
          }
        }) {
          log::error!("Failed to start file watcher: {}", e);
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::settings_commands::get_global_settings,
      commands::settings_commands::save_global_settings,
      commands::settings_commands::get_project_settings,
      commands::settings_commands::save_project_settings,
      commands::project_commands::get_all_projects,
      commands::project_commands::get_project,
      commands::project_commands::create_project,
      commands::project_commands::get_project_files,
      commands::file_commands::read_markdown_file,
      commands::file_commands::write_markdown_file,
      commands::file_commands::delete_markdown_file,
      commands::chat_commands::send_chat_message,
      commands::chat_commands::load_chat_history,
      commands::chat_commands::get_chat_files,
      commands::secrets_commands::get_secrets,
      commands::secrets_commands::save_secrets,
      commands::secrets_commands::has_claude_api_key,
    ])
    .plugin(tauri_plugin_shell::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
