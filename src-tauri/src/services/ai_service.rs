use async_trait::async_trait;
use anyhow::{Result, anyhow};
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;

use crate::models::ai::{Message, ChatResponse, Tool, ProviderType, HostedConfig, OllamaConfig, MCPServerConfig};
use crate::services::ai_provider::AIProvider;
use crate::services::mcp_service::MCPClient;
use crate::services::settings_service::SettingsService;
use crate::services::secrets_service::SecretsService;
use crate::services::claude_service::{ClaudeService, ChatMessage};

pub struct HostedAPIProvider {
    config: HostedConfig,
    mcp_client: Arc<MCPClient>,
}

#[async_trait]
impl AIProvider for HostedAPIProvider {
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, _tools: Option<Vec<Tool>>) -> Result<ChatResponse> {
        let api_key = SecretsService::get_claude_api_key()?
            .ok_or_else(|| anyhow!("Claude API key not found in secrets"))?;
        
        let claude_messages: Vec<ChatMessage> = messages.into_iter().map(|m| ChatMessage {
            role: m.role,
            content: m.content,
        }).collect();

        let service = ClaudeService::new(api_key, self.config.model.clone());
        let response = service.send_message_sync(claude_messages, system_prompt).await?;
        
        Ok(ChatResponse {
            content: response,
        })
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec![self.config.model.clone()])
    }

    fn supports_mcp(&self) -> bool {
        true
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::HostedApi
    }
}

pub struct OllamaMCPProvider {
    config: OllamaConfig,
    mcp_client: Arc<MCPClient>,
}

#[async_trait]
impl AIProvider for OllamaMCPProvider {
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, tools: Option<Vec<Tool>>) -> Result<ChatResponse> {
        let args = serde_json::json!({
            "model": self.config.model,
            "messages": messages,
            "system": system_prompt,
            "tools": tools,
        });

        // Try calling the 'chat' tool on the ollama MCP server
        match self.mcp_client.call_tool(&self.config.mcp_server_id, "chat", args).await {
            Ok(response) => {
                Ok(ChatResponse {
                    content: response.get("content").and_then(|c| c.as_str()).unwrap_or("No content").to_string(),
                })
            },
            Err(e) => {
                // Return original message with error if tool call fails
                Err(anyhow!("Ollama MCP tool call failed: {}. Make sure the Ollama MCP server is running and configured.", e))
            }
        }
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec![self.config.model.clone()])
    }

    fn supports_mcp(&self) -> bool {
        true
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::OllamaViaMcp
    }
}

pub struct ClaudeCodeProvider {
    mcp_client: Arc<MCPClient>,
}

#[async_trait]
impl AIProvider for ClaudeCodeProvider {
    async fn chat(&self, messages: Vec<Message>, _system_prompt: Option<String>, _tools: Option<Vec<Tool>>) -> Result<ChatResponse> {
        Ok(ChatResponse {
            content: format!("Claude Code integration is coming soon. Using messages: {:?}", messages.last().map(|m| &m.content)),
        })
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec!["claude-3-5-sonnet".to_string()])
    }

    fn supports_mcp(&self) -> bool {
        true
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::ClaudeCode
    }
}

pub struct AIService {
    active_provider: RwLock<Box<dyn AIProvider>>,
    mcp_client: Arc<MCPClient>,
}

impl AIService {
    pub async fn new() -> Result<Self> {
        let settings = SettingsService::load_global_settings()
            .map_err(|e| anyhow!("Failed to load settings: {}", e))?;
        
        let mcp_client = Arc::new(MCPClient::new());
        
        // Load configured MCP servers
        for server_config in &settings.mcp_servers {
            mcp_client.add_server(server_config.clone()).await?;
        }

        // If no MCP servers configured, try to auto-detect Ollama
        if settings.mcp_servers.is_empty() {
            if let Ok(Some(_info)) = crate::detector::detect_ollama().await {
                let ollama_mcp = MCPServerConfig {
                    id: "ollama".to_string(),
                    name: "Ollama (Auto-detected)".to_string(),
                    command: "npx".to_string(),
                    args: vec!["-y".to_string(), "ollama-mcp@latest".to_string()],
                    env: HashMap::new(),
                    enabled: true,
                };
                mcp_client.add_server(ollama_mcp).await?;
            }
        }

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
        };

        let mut active = self.active_provider.write().await;
        *active = new_provider;
        Ok(())
    }

    pub fn get_mcp_client(&self) -> Arc<MCPClient> {
        self.mcp_client.clone()
    }
}
