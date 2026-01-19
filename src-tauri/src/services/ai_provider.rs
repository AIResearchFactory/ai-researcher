use async_trait::async_trait;
use crate::models::ai::{Message, ChatResponse, Tool, ProviderType};
use anyhow::Result;

#[async_trait]
pub trait AIProvider: Send + Sync {
    async fn chat(&self, messages: Vec<Message>, system_prompt: Option<String>, tools: Option<Vec<Tool>>) -> Result<ChatResponse>;
    async fn list_models(&self) -> Result<Vec<String>>;
    fn supports_mcp(&self) -> bool { false }
    fn provider_type(&self) -> ProviderType;
}
