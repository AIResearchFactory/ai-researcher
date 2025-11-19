// Modules
mod commands;
mod models;
mod services;
mod utils;

// New installation modules
mod detector;
mod directory;
mod installer;
mod updater;

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

      // Test encryption on startup
      match services::encryption_service::EncryptionService::get_or_create_master_key() {
        Ok(_) => log::info!("Encryption initialized successfully"),
        Err(e) => log::warn!("Warning: Encryption initialization failed: {}", e),
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
      commands::secrets_commands::test_encryption,
      commands::secrets_commands::reset_encryption_key,
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
      commands::installation_commands::check_installation_status,
      commands::installation_commands::detect_claude_code,
      commands::installation_commands::detect_ollama,
      commands::installation_commands::get_claude_code_install_instructions,
      commands::installation_commands::get_ollama_install_instructions,
      commands::installation_commands::run_installation,
      commands::installation_commands::verify_directory_structure,
      commands::installation_commands::redetect_dependencies,
      commands::installation_commands::backup_installation,
      commands::installation_commands::cleanup_old_backups,
      commands::installation_commands::is_first_install,
      commands::update_commands::run_update_process,
      commands::update_commands::check_and_preserve_structure,
      commands::update_commands::backup_user_data,
      commands::update_commands::verify_installation_integrity,
      commands::update_commands::restore_from_backup,
      commands::update_commands::list_backups,
    ])
    .plugin(tauri_plugin_shell::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
