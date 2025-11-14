// Modules
mod commands;
mod models;
mod services;
mod utils;

use tauri::Emitter;
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
        let base_path = paths::get_projects_dir().unwrap();
        let mut watcher = services::file_watcher::FileWatcherService::new();

        if let Err(e) = watcher.start_watching(&base_path, move |event| {
          // Emit events to frontend
          match event {
            services::file_watcher::WatchEvent::ProjectAdded(id) => {
              let _ = app_handle.emit("project-added", id);
            }
            services::file_watcher::WatchEvent::ProjectRemoved(id) => {
              let _ = app_handle.emit("project-removed", id);
            }
            services::file_watcher::WatchEvent::FileChanged(project_id, file_name) => {
              let _ = app_handle.emit("file-changed", (project_id, file_name));
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
      commands::skill_commands::get_all_skills,
      commands::skill_commands::get_skill,
      commands::skill_commands::save_skill,
      commands::skill_commands::delete_skill,
      commands::skill_commands::create_skill_template,
      commands::skill_commands::get_skills_by_category,
      commands::skill_commands::render_skill_prompt,
      commands::skill_commands::validate_skill,
      commands::skill_commands::create_skill,
      commands::skill_commands::update_skill,
      commands::workflow_commands::get_project_workflows,
      commands::workflow_commands::get_workflow,
      commands::workflow_commands::create_workflow,
      commands::workflow_commands::save_workflow,
      commands::workflow_commands::delete_workflow,
      commands::workflow_commands::execute_workflow,
      commands::workflow_commands::validate_workflow,
      commands::workflow_commands::add_workflow_step,
      commands::workflow_commands::remove_workflow_step,
      commands::markdown_commands::render_markdown_to_html,
      commands::markdown_commands::extract_markdown_frontmatter,
      commands::markdown_commands::extract_markdown_links,
      commands::markdown_commands::generate_markdown_toc,
    ])
    .plugin(tauri_plugin_shell::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
