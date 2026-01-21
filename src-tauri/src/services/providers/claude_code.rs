use async_trait::async_trait;
use anyhow::Result;

use crate::models::ai::{Message, ChatResponse, Tool, ProviderType};
use crate::services::ai_provider::AIProvider;

pub struct ClaudeCodeProvider;

impl ClaudeCodeProvider {
    pub fn new() -> Self {
        Self
    }
}

impl Default for ClaudeCodeProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AIProvider for ClaudeCodeProvider {
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, _tools: Option<Vec<Tool>>) -> Result<ChatResponse> {
        let mut args = vec!["chat".to_string()];
        
        if let Some(system) = system_prompt {
            args.push("--system".to_string());
            args.push(system);
        }

        for msg in &messages {
            args.push(format!("--{}", msg.role));
            args.push(msg.content.clone());
        }

        match tokio::process::Command::new("claude")
            .args(&args)
            .output()
            .await {
            Ok(output) => {
                let content = String::from_utf8_lossy(&output.stdout).to_string();
                if content.is_empty() {
                     // Try stderr or assume it's just a stub for now
                     return Ok(ChatResponse { content: "Claude Code CLI response pending implementation (Command executed but no output)".to_string() });
                }
                Ok(ChatResponse { content })
            },
            Err(e) => Err(anyhow::anyhow!("Failed to execute claude: {}", e))
        }
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec!["claude-3-5-sonnet".to_string()])
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::ClaudeCode
    }
}
