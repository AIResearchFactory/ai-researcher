use async_trait::async_trait;
use anyhow::{Result, anyhow};

use crate::models::ai::{Message, ChatResponse, Tool, ProviderType, GeminiCliConfig};
use crate::services::ai_provider::AIProvider;
use crate::services::secrets_service::SecretsService;

pub struct GeminiCliProvider {
    pub config: GeminiCliConfig,
}

#[async_trait]
impl AIProvider for GeminiCliProvider {
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, _tools: Option<Vec<Tool>>) -> Result<ChatResponse> {
        let mut prompt = String::new();
        if let Some(system) = system_prompt {
            prompt.push_str(&system);
            prompt.push_str("\n\n");
        }
        for msg in &messages {
            prompt.push_str(&format!("{}: {}\n", msg.role, msg.content));
        }

        let api_key = match SecretsService::get_secret(&self.config.api_key_secret_id)? {
            Some(key) => key,
            None => {
                SecretsService::get_secret("GEMINI_API_KEY")?
                    .ok_or_else(|| anyhow!("Gemini API key not found. Please ensure 'GEMINI_API_KEY' is set in Settings."))?
            }
        };

        let output = tokio::process::Command::new(&self.config.command)
            .env("GEMINI_API_KEY", api_key)
            .arg("--model")
            .arg(&self.config.model_alias)
            .arg(&prompt)
            .output()
            .await?;

        if output.status.success() {
            Ok(ChatResponse {
                content: String::from_utf8_lossy(&output.stdout).to_string(),
            })
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            Err(anyhow!("Gemini CLI error: {}", err))
        }
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec![self.config.model_alias.clone()])
    }

    fn supports_mcp(&self) -> bool {
        false
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::GeminiCli
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ai::{GeminiCliConfig, Message};

    #[tokio::test]
    async fn test_gemini_cli_provider_metadata() {
        let config = GeminiCliConfig {
            command: "echo".to_string(),
            model_alias: "test-model".to_string(),
            api_key_secret_id: "TEST_KEY".to_string(),
        };
        let provider = GeminiCliProvider { config: config.clone() };
        
        assert_eq!(provider.provider_type(), ProviderType::GeminiCli);
        assert_eq!(provider.supports_mcp(), false);
        
        let models = provider.list_models().await.unwrap();
        assert_eq!(models, vec!["test-model".to_string()]);
    }

    #[tokio::test]
    async fn test_gemini_cli_provider_chat_failure_no_key() {
        let config = GeminiCliConfig {
            command: "echo".to_string(),
            model_alias: "test-model".to_string(),
            api_key_secret_id: "NON_EXISTENT_KEY".to_string(),
        };
        let provider = GeminiCliProvider { config };
        let messages = vec![Message { role: "user".to_string(), content: "hello".to_string() }];
        
        let result = provider.chat(messages, None, None).await;
        if let Err(e) = result {
            assert!(e.to_string().contains("API key not found"));
        }
    }
}
