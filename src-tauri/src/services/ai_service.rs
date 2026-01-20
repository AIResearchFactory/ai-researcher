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
        
        let new_provider: Box<dyn AIProvider> = match provider_type {
            ProviderType::Ollama => Box::new(OllamaProvider::new(settings.ollama)),
            ProviderType::ClaudeCode => Box::new(ClaudeCodeProvider::new()),
            ProviderType::HostedApi => Box::new(HostedAPIProvider::new(settings.hosted)),
            ProviderType::GeminiCli => Box::new(GeminiCliProvider {
                config: settings.gemini_cli,
            }),
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
}
