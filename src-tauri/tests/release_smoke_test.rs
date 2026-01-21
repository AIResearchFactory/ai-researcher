use app_lib::models::llm::LlmFactory;
use app_lib::models::settings::GlobalSettings;
use app_lib::models::ai::ProviderType;
use tempfile::TempDir;

#[tokio::test]
async fn test_release_chat_persistence() {
    let temp_dir = TempDir::new().unwrap();
    // ...
    
    // 1. Verify LlmFactory can create providers
    let provider = LlmFactory::create("claude", "test-key".to_string(), "claude-3-opus".to_string());
    assert!(provider.is_ok(), "LlmFactory should create claude provider");
    
    // 2. Verify GlobalSettings serialization (Critical for config)
    let settings = GlobalSettings {
        active_provider: ProviderType::HostedApi,
        default_model: "claude-3-sonnet".to_string(),
        ..GlobalSettings::default()
    };
    
    let settings_path = temp_dir.path().join("settings.json");
    let save_res = settings.save(&settings_path);
    assert!(save_res.is_ok(), "Should save settings to JSON");
    
    let loaded = GlobalSettings::load(&settings_path);
    assert!(loaded.is_ok(), "Should load settings from JSON");
    assert_eq!(loaded.unwrap().active_provider, ProviderType::HostedApi);
}

#[test]
fn test_release_configuration_defaults() {
    // Ensure defaults are sane for a release
    let default_settings = GlobalSettings::default();
    assert_eq!(default_settings.active_provider, ProviderType::HostedApi); 
    assert!(default_settings.notifications_enabled);
}
