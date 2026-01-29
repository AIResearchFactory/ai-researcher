use async_trait::async_trait;
use anyhow::{Result, anyhow};
use std::process::Stdio;

use crate::models::ai::{Message, ChatResponse, Tool, ProviderType, CustomCliConfig};
use crate::services::ai_provider::AIProvider;
use crate::services::secrets_service::SecretsService;

pub struct CustomCliProvider {
    pub config: CustomCliConfig,
}

#[async_trait]
impl AIProvider for CustomCliProvider {
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, _tools: Option<Vec<Tool>>, project_path: Option<String>) -> Result<ChatResponse> {
        let mut prompt = String::new();
        if let Some(system) = system_prompt {
            prompt.push_str(&system);
            prompt.push_str("\n\n");
        }
        for msg in &messages {
            prompt.push_str(&format!("{}: {}\n", msg.role, msg.content));
        }

        let mut command = tokio::process::Command::new(&self.config.command);
        
        if let Some(path) = project_path {
            command.current_dir(path);
        }
        
        // Add API key if configured
        if let Some(secret_id) = &self.config.api_key_secret_id {
            if let Ok(Some(key)) = SecretsService::get_secret(secret_id) {
                command.env("API_KEY", &key);
                // Also common names
                command.env("OPENAI_API_KEY", &key);
                command.env("ANTHROPIC_API_KEY", &key);
                command.env("GEMINI_API_KEY", &key);
            }
        }

        let output = command
            .arg(&prompt)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await?;

        if output.status.success() {
            Ok(ChatResponse {
                content: String::from_utf8_lossy(&output.stdout).to_string(),
            })
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            Err(anyhow!("Custom CLI '{}' error: {}", self.config.name, err))
        }
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec!["default".to_string()])
    }

    fn supports_mcp(&self) -> bool {
        false
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::Custom(format!("custom-{}", self.config.id))
    }
}
