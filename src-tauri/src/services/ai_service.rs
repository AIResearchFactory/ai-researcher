use anyhow::{Result, anyhow};
use tokio::sync::RwLock;

use crate::models::ai::{Message, ChatResponse, ProviderType};
use crate::services::ai_provider::AIProvider;
use crate::services::settings_service::SettingsService;

// Import our new decoupled providers
use crate::services::providers::hosted::HostedAPIProvider;
use crate::services::providers::ollama::OllamaProvider;
use crate::services::providers::claude_code::ClaudeCodeProvider;
use crate::services::providers::gemini_cli::GeminiCliProvider;
use crate::services::providers::custom_cli::CustomCliProvider;

pub struct AIService {
    active_provider: RwLock<Box<dyn AIProvider>>,
}

impl AIService {
    pub async fn new() -> Result<Self> {
        let settings = SettingsService::load_global_settings()
            .map_err(|e| anyhow!("Failed to load settings: {}", e))?;

        let provider: Box<dyn AIProvider> = match settings.active_provider {
            ProviderType::Ollama => Box::new(OllamaProvider::new(settings.ollama)),
            ProviderType::ClaudeCode => Box::new(ClaudeCodeProvider::new()),
            ProviderType::HostedApi => Box::new(HostedAPIProvider::new(settings.hosted)),
            ProviderType::GeminiCli => Box::new(GeminiCliProvider {
                config: settings.gemini_cli,
            }),
            ProviderType::Custom(id) => {
                let id_to_find = if id.starts_with("custom-") {
                    &id[7..]
                } else {
                    &id
                };
                if let Some(config) = settings.custom_clis.iter().find(|c| c.id == id_to_find) {
                    Box::new(CustomCliProvider { config: config.clone() })
                } else if let Some(config) = settings.custom_clis.first() {
                    Box::new(CustomCliProvider { config: config.clone() })
                } else {
                    Box::new(HostedAPIProvider::new(settings.hosted))
                }
            }
        };

        Ok(Self {
            active_provider: RwLock::new(provider),
        })
    }

    pub async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>) -> Result<ChatResponse> {
        let provider = self.active_provider.read().await;
        provider.chat(messages, system_prompt, None).await
    }

    pub async fn switch_provider(&self, provider_type: ProviderType) -> Result<()> {
        let settings = SettingsService::load_global_settings()
            .map_err(|e| anyhow!("Failed to load settings: {}", e))?;
        
        let new_provider: Box<dyn AIProvider> = match &provider_type {
            ProviderType::Ollama => Box::new(OllamaProvider::new(settings.ollama)),
            ProviderType::ClaudeCode => Box::new(ClaudeCodeProvider::new()),
            ProviderType::HostedApi => Box::new(HostedAPIProvider::new(settings.hosted)),
            ProviderType::GeminiCli => Box::new(GeminiCliProvider {
                config: settings.gemini_cli,
            }),
            ProviderType::Custom(id) => {
                let id_to_find = if id.starts_with("custom-") {
                    &id[7..]
                } else {
                    id
                };
                if let Some(config) = settings.custom_clis.iter().find(|c| c.id == id_to_find) {
                    Box::new(CustomCliProvider { config: config.clone() })
                } else {
                    return Err(anyhow!("Custom CLI '{}' not found", id));
                }
            }
        };

        let mut active = self.active_provider.write().await;
        *active = new_provider;

        // Persist to settings
        let mut settings = SettingsService::load_global_settings()
            .map_err(|e| anyhow!("Failed to load settings: {}", e))?;
        settings.active_provider = provider_type;
        SettingsService::save_global_settings(&settings)
            .map_err(|e| anyhow!("Failed to save settings: {}", e))?;

        Ok(())
    }

    pub async fn get_active_provider_type(&self) -> ProviderType {
        let provider = self.active_provider.read().await;
        provider.provider_type()
    }

    pub async fn list_available_providers() -> Result<Vec<ProviderType>> {
        let settings = SettingsService::load_global_settings()
            .map_err(|e| anyhow!("Failed to load settings: {}", e))?;
        
        let mut available = Vec::new();
        
        // Always include hosted if model is set (API key checked elsewhere)
        available.push(ProviderType::HostedApi);
        
        // Only include CLI tools if detected
        if settings.ollama.detected_path.is_some() {
            available.push(ProviderType::Ollama);
        }
        if settings.claude.detected_path.is_some() {
            available.push(ProviderType::ClaudeCode);
        }
        if settings.gemini_cli.detected_path.is_some() {
            available.push(ProviderType::GeminiCli);
        }
        
        // Add individual custom ones
        for cli in settings.custom_clis {
            if cli.is_configured {
                available.push(ProviderType::Custom(format!("custom-{}", cli.id)));
            }
        }
        
        Ok(available)
    }
}
