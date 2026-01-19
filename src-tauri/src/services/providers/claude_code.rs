use async_trait::async_trait;
use anyhow::Result;
use std::sync::Arc;

use crate::models::ai::{Message, ChatResponse, Tool, ProviderType};
use crate::services::ai_provider::AIProvider;
use crate::services::mcp_service::MCPClient;
use crate::services::providers::parse_mcp_response;

pub struct ClaudeCodeProvider {
    pub mcp_client: Arc<MCPClient>,
}

#[async_trait]
impl AIProvider for ClaudeCodeProvider {
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, tools: Option<Vec<Tool>>) -> Result<ChatResponse> {
        let args = serde_json::json!({
            "messages": messages,
            "system": system_prompt,
            "tools": tools,
        });

        for server_id in &["claude", "claude-code", "anthropic"] {
            for tool_name in &["chat", "ask", "prompt"] {
                if let Ok(response) = self.mcp_client.call_tool(server_id, tool_name, args.clone()).await {
                    let content = parse_mcp_response(&response);
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
