use async_trait::async_trait;
use anyhow::{Result, anyhow};
use std::sync::Arc;

use crate::models::ai::{Message, ChatResponse, Tool, ProviderType, OllamaConfig};
use crate::services::ai_provider::AIProvider;
use crate::services::mcp_service::MCPClient;
use crate::services::providers::parse_mcp_response;

pub struct OllamaMCPProvider {
    pub config: OllamaConfig,
    pub mcp_client: Arc<MCPClient>,
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
                let tools_json = serde_json::to_string(&t).unwrap_or_default();
                args.as_object_mut().unwrap().insert("tools".to_string(), serde_json::Value::String(tools_json));
            }
        }

        let possible_tools = vec!["chat", "generate-chat-completion", "ollama_chat_completion", "ollama_chat", "generate_chat_completion", "prompt", "generate", "complete"];
        
        for tool_name in &possible_tools {
            match self.mcp_client.call_tool(&self.config.mcp_server_id, tool_name, args.clone()).await {
                Ok(response) => {
                    let full_content = parse_mcp_response(&response);
                    if !full_content.is_empty() && full_content != "No content" && !full_content.to_lowercase().contains("unknown tool") {
                        return Ok(ChatResponse { content: full_content });
                    }
                },
                Err(_) => continue,
            }
        }

        let mut tried_tools = Vec::new();
        if let Ok(available_tools) = self.mcp_client.get_all_tools().await {
            for tool in available_tools {
                let name = tool.name.to_lowercase();
                if (name.contains("chat") || name.contains("gen") || name.contains("prompt") || name.contains("complet")) 
                    && !possible_tools.contains(&tool.name.as_str()) {
                    
                    tried_tools.push(tool.name.clone());
                    match self.mcp_client.call_tool(&self.config.mcp_server_id, &tool.name, args.clone()).await {
                        Ok(response) => {
                            let full_content = parse_mcp_response(&response);
                            if !full_content.is_empty() && full_content != "No content" && !full_content.to_lowercase().contains("unknown tool") {
                                return Ok(ChatResponse { content: full_content });
                            }
                        },
                        Err(_) => continue,
                    }
                }
            }
        }

        Err(anyhow!("Ollama MCP call failed. Checked common tools {:?} and discovered tools {:?}.", possible_tools, tried_tools))
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
