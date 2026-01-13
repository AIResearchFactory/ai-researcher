use anyhow::{Result, anyhow};
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;

use crate::models::ai::{Message, ChatResponse, Tool, ProviderType, MCPServerConfig};
use crate::services::ai_provider::AIProvider;
use crate::services::mcp_service::MCPClient;
use crate::services::settings_service::SettingsService;

// Import our new decoupled providers
use crate::services::providers::hosted::HostedAPIProvider;
use crate::services::providers::ollama_mcp::OllamaMCPProvider;
use crate::services::providers::claude_code::ClaudeCodeProvider;
use crate::services::providers::gemini_cli::GeminiCliProvider;

pub struct AIService {
    active_provider: RwLock<Box<dyn AIProvider>>,
    mcp_client: Arc<MCPClient>,
}

impl AIService {
    pub async fn new() -> Result<Self> {
        let settings = SettingsService::load_global_settings()
            .map_err(|e| anyhow!("Failed to load settings: {}", e))?;
        
        let mcp_client = Arc::new(MCPClient::new());
        
        // Spawn MCP server loading in background to avoid blocking startup
        let mcp_client_clone = mcp_client.clone();
        let settings_clone = settings.clone();
        
        tauri::async_runtime::spawn(async move {
            // Load configured MCP servers
            for server_config in &settings_clone.mcp_servers {
                log::info!("Initializing MCP server: {}", server_config.id);
                if let Err(e) = mcp_client_clone.add_server(server_config.clone()).await {
                    log::error!("Failed to add MCP server {}: {}", server_config.id, e);
                }
            }

            // If no MCP servers configured, try to auto-detect Ollama
            if settings_clone.mcp_servers.is_empty() {
                if let Ok(Some(_info)) = crate::detector::detect_ollama().await {
                    let ollama_mcp = MCPServerConfig {
                        id: "ollama".to_string(),
                        name: "Ollama (Auto-detected)".to_string(),
                        command: "npx".to_string(),
                        args: vec!["-y".to_string(), "ollama-mcp@latest".to_string()],
                        env: HashMap::new(),
                        enabled: true,
                    };
                    if let Err(e) = mcp_client_clone.add_server(ollama_mcp).await {
                         log::error!("Failed to add auto-detected Ollama MCP server: {}", e);
                    }
                }
            }
        });

        let provider: Box<dyn AIProvider> = match settings.active_provider {
            ProviderType::OllamaViaMcp => Box::new(OllamaMCPProvider {
                config: settings.ollama,
                mcp_client: mcp_client.clone(),
            }),
            ProviderType::ClaudeCode => Box::new(ClaudeCodeProvider {
                mcp_client: mcp_client.clone(),
            }),
            ProviderType::HostedApi => Box::new(HostedAPIProvider {
                config: settings.hosted,
                mcp_client: mcp_client.clone(),
            }),
            ProviderType::GeminiCli => Box::new(GeminiCliProvider {
                config: settings.gemini_cli,
            }),
        };

        Ok(Self {
            active_provider: RwLock::new(provider),
            mcp_client,
        })
    }

    pub async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>) -> Result<ChatResponse> {
        let provider = self.active_provider.read().await;
        let tools = if provider.supports_mcp() {
            Some(self.mcp_client.get_all_tools().await?)
        } else {
            None
        };
        provider.chat(messages, system_prompt, tools).await
    }

    pub async fn switch_provider(&self, provider_type: ProviderType) -> Result<()> {
        let settings = SettingsService::load_global_settings()
            .map_err(|e| anyhow!("Failed to load settings: {}", e))?;
        
        let new_provider: Box<dyn AIProvider> = match provider_type {
            ProviderType::OllamaViaMcp => Box::new(OllamaMCPProvider {
                config: settings.ollama,
                mcp_client: self.mcp_client.clone(),
            }),
            ProviderType::ClaudeCode => Box::new(ClaudeCodeProvider {
                mcp_client: self.mcp_client.clone(),
            }),
            ProviderType::HostedApi => Box::new(HostedAPIProvider {
                config: settings.hosted,
                mcp_client: self.mcp_client.clone(),
            }),
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

    pub fn get_mcp_client(&self) -> Arc<MCPClient> {
        self.mcp_client.clone()
    }

    pub async fn get_active_provider_type(&self) -> ProviderType {
        let provider = self.active_provider.read().await;
        provider.provider_type()
    }
}
