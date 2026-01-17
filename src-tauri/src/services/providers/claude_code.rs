use async_trait::async_trait;
use anyhow::Result;

use crate::models::ai::{Message, ChatResponse, Tool, ProviderType};
use crate::services::ai_provider::AIProvider;

pub struct ClaudeCodeProvider {
    // maybe config if needed?
}

impl ClaudeCodeProvider {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl AIProvider for ClaudeCodeProvider {
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, _tools: Option<Vec<Tool>>) -> Result<ChatResponse> {
        // TODO: Implement actual CLI interaction. 
        // claude-code is typically interactive. We might need to look at how to drive it programmatically
        // or just send a message if it supports it.
        // For now, let's try a basic execution or return a placeholder if not fully researched.
        
        let last_msg = messages.last().map(|m| m.content.clone()).unwrap_or_default();
        let mut prompt = String::new();
        if let Some(sys) = system_prompt {
           prompt.push_str(&format!("System: {}\n", sys));
        }
        prompt.push_str(&last_msg);

        // Hypothetical CLI usage: claude -p "prompt"
        // Adjust command name based on what's detected usually? 
        // But for now let's assume 'claude' is in path.
        
        let output = tokio::process::Command::new("claude")
            .arg("-p")
            .arg(&prompt)
            .output()
            .await;

        match output {
            Ok(out) => {
                let content = String::from_utf8_lossy(&out.stdout).to_string();
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

    async fn validate_config(&self) -> Result<()> {
        // Check if `claude` is in path
        match tokio::process::Command::new("claude").arg("--version").output().await {
            Ok(out) => if out.status.success() { Ok(()) } else { Err(anyhow::anyhow!("claude command failed")) },
            Err(e) => Err(anyhow::anyhow!("claude command not found: {}", e))
        }
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::ClaudeCode
    }
}
