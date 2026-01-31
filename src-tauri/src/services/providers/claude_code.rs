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
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, _tools: Option<Vec<Tool>>, project_path: Option<String>) -> Result<ChatResponse> {
        let last_user_message = messages.iter().rev().find(|m| m.role == "user").map(|m| &m.content);
        
        let mut args = Vec::new();
        
        if let Some(content) = last_user_message {
            args.push("-p".to_string());
            args.push(content.clone());
        } else {
             return Err(anyhow::anyhow!("No user message provided"));
        }
        
        if let Some(system) = system_prompt {
            args.push("--system-prompt".to_string());
            args.push(system);
        }

        // Add flags for non-interactive use
        args.push("--dangerously-skip-permissions".to_string());

        let mut command = tokio::process::Command::new("claude");
        command.args(&args);
        
        if let Some(path) = project_path {
            command.current_dir(path);
        }

        let output = command.output().await?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            if stderr.is_empty() {
                return Err(anyhow::anyhow!("Claude Code CLI failed with exit code {}", output.status.code().unwrap_or(-1)));
            }
            return Err(anyhow::anyhow!("Claude Code CLI failed: {}", stderr));
        }

        let content = String::from_utf8_lossy(&output.stdout).to_string();
        if content.is_empty() {
             return Err(anyhow::anyhow!("Claude Code CLI returned empty output"));
        }
        
        Ok(ChatResponse { content })
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec!["claude-3-5-sonnet".to_string()])
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::ClaudeCode
    }
}
