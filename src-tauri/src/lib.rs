// Modules
mod commands;
pub mod models;
pub mod services;
mod utils;
pub mod config;

// New installation modules
pub mod detector;
pub mod directory;
pub mod installer;
pub mod updater;

use tauri::Emitter;
use tauri::Manager;
use std::sync::Arc;
use utils::paths;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Fix macOS environment before doing anything else
  utils::env::fix_macos_env();

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

      // Encryption initialization will happen on demand when secrets are accessed
      log::info!("Encryption service ready (lazy initialization)");

      // Set up file watcher
      let app_handle = app.handle().clone();
      std::thread::spawn(move || {
        // Initialize file watcher
        let base_path = match paths::get_projects_dir() {
          Ok(path) => path,
          Err(e) => {
            log::error!("Failed to get projects directory for file watcher: {}", e);
            return;
          }
        };
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

      // Initialize AI Service
      let ai_service = tauri::async_runtime::block_on(async {
        services::ai_service::AIService::new().await
      }).map_err(|e| {
          log::error!("Failed to initialize AI Service: {}", e);
          e
      })?;
      let ai_service = Arc::new(ai_service);
      let orchestrator = services::agent_orchestrator::AgentOrchestrator::new(ai_service.clone(), app.handle().clone());
      app.manage(ai_service);
      app.manage(Arc::new(orchestrator));

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::settings_commands::get_app_data_directory,
      commands::settings_commands::get_global_settings,
      commands::settings_commands::save_global_settings,
      commands::settings_commands::get_project_settings,
      commands::settings_commands::save_project_settings,
      commands::project_commands::get_all_projects,
      commands::project_commands::get_project,
      commands::project_commands::create_project,
      commands::project_commands::get_project_files,
      commands::project_commands::delete_project,
      commands::project_commands::rename_project,
      commands::file_commands::read_markdown_file,
      commands::file_commands::write_markdown_file,
      commands::file_commands::delete_markdown_file,
      commands::file_commands::search_in_files,
      commands::file_commands::replace_in_files,
      commands::chat_commands::send_message,
      commands::chat_commands::switch_provider,
      commands::chat_commands::load_chat_history,
      commands::chat_commands::get_chat_files,
      commands::chat_commands::save_chat,
      commands::chat_commands::get_ollama_models,
      commands::secrets_commands::get_secrets,
      commands::secrets_commands::save_secrets,
      commands::secrets_commands::has_claude_api_key,
      commands::secrets_commands::has_gemini_api_key,
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
      commands::skill_commands::import_skill,
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
      commands::markdown_commands::extract_markdown_links,
      commands::markdown_commands::generate_markdown_toc,
      commands::installation_commands::check_installation_status,
      commands::installation_commands::detect_claude_code,
      commands::installation_commands::detect_ollama,
      commands::installation_commands::detect_gemini,
      commands::installation_commands::detect_all_cli_tools,
      commands::installation_commands::get_claude_code_install_instructions,
      commands::installation_commands::get_ollama_install_instructions,
      commands::installation_commands::get_gemini_install_instructions,
      commands::installation_commands::clear_cli_detection_cache,
      commands::installation_commands::clear_all_cli_detection_caches,
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
      commands::config_commands::get_app_config,
      commands::config_commands::save_app_config,
      commands::config_commands::config_exists,
      commands::config_commands::update_claude_code_config,
      commands::config_commands::update_ollama_config,
      commands::config_commands::update_last_check,
      commands::config_commands::reset_config,
      commands::settings_commands::authenticate_gemini,
      commands::settings_commands::add_custom_cli,
      commands::settings_commands::remove_custom_cli,
      commands::settings_commands::list_available_providers,
    ])
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .run(tauri::generate_context!())
    .unwrap_or_else(|e| {
      log::error!("Fatal error while running Tauri application: {}", e);
      std::process::exit(1);
    });
}
