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
        let api_key = match SecretsService::get_secret(&self.config.api_key_secret_id)? {
            Some(key) => key,
            None => {
                // Secondary check for common aliases if the specific ID wasn't found
                SecretsService::get_secret("claude_api_key")?
                    .or(SecretsService::get_secret("ANTHROPIC_API_KEY")?)
                    .ok_or_else(|| anyhow!("API key not found. Please ensure 'Anthropic API Key' is set in Settings -> API Configuration."))?
            }
        };
        
        let claude_messages: Vec<ChatMessage> = messages.into_iter().map(|m| ChatMessage {
            role: m.role,
            content: m.content,
        }).collect();

        // Map model name if it's one of the user-friendly ones
        let model_id = match self.config.model.as_str() {
            "claude-3-opus" => "claude-3-opus-20240229",
            "claude-3-sonnet" => "claude-3-sonnet-20240229",
            "claude-3-haiku" => "claude-3-haiku-20240307",
            "claude-3-5-sonnet" => "claude-3-5-sonnet-20241022",
            m => m
        };

        let service = ClaudeService::new(api_key, model_id.to_string());
        match service.send_message_sync(claude_messages, system_prompt).await {
            Ok(response) => {
                Ok(ChatResponse {
                    content: response,
                })
            },
            Err(e) => {
                // Return the specific error message from ClaudeService which might include HTTP status codes
                Err(anyhow!("Hosted Claude API error: {}", e))
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
        let mut args = serde_json::json!({
            "model": self.config.model,
            "messages": messages,
            "system": system_prompt,
        });

        if let Some(t) = tools {
            if !t.is_empty() {
                // The Ollama MCP server expects 'tools' to be a JSON string, not a JSON object
                let tools_json = serde_json::to_string(&t).unwrap_or_default();
                args.as_object_mut().unwrap().insert("tools".to_string(), serde_json::Value::String(tools_json));
            }
        }

        // Common tool names for Ollama MCP servers
        let possible_tools = vec!["chat", "generate-chat-completion", "ollama_chat_completion", "ollama_chat", "generate_chat_completion", "prompt", "generate", "complete"];
        
        // 1. Try common names first
        for tool_name in &possible_tools {
            match self.mcp_client.call_tool(&self.config.mcp_server_id, tool_name, args.clone()).await {
                Ok(response) => {
                    let full_content = self.parse_mcp_response(&response);
                    if !full_content.is_empty() && full_content != "No content" && !full_content.to_lowercase().contains("unknown tool") {
                        return Ok(ChatResponse { content: full_content });
                    }
                    // If it contains "unknown tool", it's a false positive on a successful RPC call, continue to next tool
                },
                Err(_) => continue, // Try next one
            }
        }

        // 2. If common names fail, list all tools and try anything that looks relevant
        let mut tried_tools = Vec::new(); // Keep track for error reporting
        
        if let Ok(available_tools) = self.mcp_client.get_all_tools().await {
            // Log available tools for debugging
            println!("Ollama Chat: Available tools on server: {:?}", available_tools.iter().map(|t| &t.name).collect::<Vec<_>>());
            
            for tool in available_tools {
                let name = tool.name.to_lowercase();
                // Check if it looks like a chat tool and we haven't tried it yet
                if (name.contains("chat") || name.contains("gen") || name.contains("prompt") || name.contains("complet")) 
                    && !possible_tools.contains(&tool.name.as_str()) {
                    
                    tried_tools.push(tool.name.clone());
                    match self.mcp_client.call_tool(&self.config.mcp_server_id, &tool.name, args.clone()).await {
                        Ok(response) => {
                            let full_content = self.parse_mcp_response(&response);
                            if !full_content.is_empty() && full_content != "No content" && !full_content.to_lowercase().contains("unknown tool") {
                                return Ok(ChatResponse { content: full_content });
                            }
                        },
                        Err(e) => {
                            println!("Failed to call fallback tool '{}': {}", tool.name, e);
                        }
                    }
                }
            }
        }

        Err(anyhow!("Ollama MCP call failed. Checked common tools {:?} and discovered tools {:?}. \n\
            Please ensure your Ollama MCP server is running and exposes a compatible chat tool (e.g. 'chat' or 'generate').", 
            possible_tools, tried_tools))
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

impl OllamaMCPProvider {
    fn parse_mcp_response(&self, response: &serde_json::Value) -> String {
        // 1. Try 'content' array (standard MCP)
        if let Some(content_val) = response.get("content") {
            if content_val.is_array() {
                let mut text = String::new();
                for block in content_val.as_array().unwrap() {
                    if let Some(t) = block.get("text").and_then(|v| v.as_str()) {
                        text.push_str(t);
                    }
                }
                if !text.is_empty() { return text; }
            } else if let Some(t) = content_val.as_str() {
                return t.to_string();
            }
        }
        
        // 2. Try 'text' field
        if let Some(t) = response.get("text").and_then(|v| v.as_str()) {
            return t.to_string();
        }

        // 3. Try 'message' -> 'content' (Ollama API style)
        if let Some(m) = response.get("message") {
            if let Some(c) = m.get("content").and_then(|v| v.as_str()) {
                return c.to_string();
            }
        }

        // 4. Try raw string
        if let Some(t) = response.as_str() {
            return t.to_string();
        }

        "No content".to_string()
    }
}

pub struct ClaudeCodeProvider {
    mcp_client: Arc<MCPClient>,
}

#[async_trait]
impl AIProvider for ClaudeCodeProvider {
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, tools: Option<Vec<Tool>>) -> Result<ChatResponse> {
        let args = serde_json::json!({
            "messages": messages,
            "system": system_prompt,
            "tools": tools,
        });

        // Common server IDs and tool names
        for server_id in &["claude", "claude-code", "anthropic"] {
            for tool_name in &["chat", "ask", "prompt"] {
                if let Ok(response) = self.mcp_client.call_tool(server_id, tool_name, args.clone()).await {
                    let content = self.parse_mcp_response(&response);
                    if !content.is_empty() && content != "No content" {
                        return Ok(ChatResponse { content });
                    }
                }
            }
        }

        Ok(ChatResponse {
            content: "Claude Code MCP server not found. To use this, please go to Settings and add an MCP server with ID 'claude' or 'claude-code' that provides a 'chat' tool.".to_string(),
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

impl ClaudeCodeProvider {
    fn parse_mcp_response(&self, response: &serde_json::Value) -> String {
        // Use the same robust parsing logic as Ollama provider
        let ollama_temp = OllamaMCPProvider { 
            config: OllamaConfig { model: "".to_string(), mcp_server_id: "".to_string() },
            mcp_client: self.mcp_client.clone() 
        };
        ollama_temp.parse_mcp_response(response)
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
}
