use async_trait::async_trait;
use futures::stream::Stream;
use std::pin::Pin;
use anyhow::Result;
use crate::models::chat::ChatRequest;

#[async_trait]
pub trait LlmProvider: Send + Sync {
    /// uniquely identify the provider (e.g. "anthropic", "openai")
    fn id(&self) -> String;

    /// Send a chat request and get a streaming response
    async fn chat_stream(
        &self,
        request: ChatRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String>> + Send>>>;
    
    // We might need a non-streaming version too for internal tools
    async fn chat_sync(&self, request: ChatRequest) -> Result<String>;
}

pub struct LlmFactory;

impl LlmFactory {
    pub fn create(
        provider_id: &str,
        api_key: String,
        model: String,
    ) -> Result<Box<dyn LlmProvider>> {
        match provider_id {
            "anthropic" | "claude" => {
                // Ensure we import ClaudeService
                use crate::services::claude_service::ClaudeService;
                Ok(Box::new(ClaudeService::new(api_key, model)))
            }
            _ => {
                // Return descriptive error
                anyhow::bail!("Unsupported LLM provider: {}", provider_id)
            }
        }
    }
}
