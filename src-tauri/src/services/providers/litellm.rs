use anyhow::{anyhow, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;

use crate::models::ai::{ChatResponse, LiteLlmConfig, Message, ProviderType, TaskIntent, Tool};
use crate::services::ai_provider::AIProvider;
use crate::services::secrets_service::SecretsService;

pub struct LiteLlmProvider {
    pub config: LiteLlmConfig,
}

impl LiteLlmProvider {
    pub fn new(config: LiteLlmConfig) -> Self {
        Self { config }
    }

    pub fn classify_intent(messages: &[Message]) -> TaskIntent {
        let latest_user = messages
            .iter()
            .rev()
            .find(|m| m.role.eq_ignore_ascii_case("user"))
            .map(|m| m.content.to_lowercase())
            .unwrap_or_default();

        let coding_markers = [
            "code",
            "bug",
            "rust",
            "typescript",
            "javascript",
            "python",
            "refactor",
            "function",
            "compile",
            "test",
            "fix",
        ];
        if coding_markers.iter().any(|m| latest_user.contains(m)) {
            return TaskIntent::Coding;
        }

        let research_markers = [
            "analyze",
            "analysis",
            "research",
            "compare",
            "tradeoff",
            "architecture",
            "deep dive",
            "investigate",
            "benchmark",
        ];
        if research_markers.iter().any(|m| latest_user.contains(m)) {
            return TaskIntent::Research;
        }

        let editing_markers = [
            "edit",
            "rewrite",
            "grammar",
            "format",
            "markdown",
            "shorten",
            "rephrase",
            "proofread",
        ];
        if editing_markers.iter().any(|m| latest_user.contains(m)) {
            return TaskIntent::Editing;
        }

        TaskIntent::General
    }

    pub fn model_for_intent(&self, intent: &TaskIntent) -> String {
        match intent {
            TaskIntent::Research => self.config.strategy.research_model.clone(),
            TaskIntent::Coding => self.config.strategy.coding_model.clone(),
            TaskIntent::Editing => self.config.strategy.editing_model.clone(),
            TaskIntent::General => self.config.strategy.default_model.clone(),
        }
    }
}

#[async_trait]
impl AIProvider for LiteLlmProvider {
    async fn chat(
        &self,
        messages: Vec<Message>,
        system_prompt: Option<String>,
        _tools: Option<Vec<Tool>>,
        _project_path: Option<String>,
    ) -> Result<ChatResponse> {
        let api_key = SecretsService::get_secret(&self.config.api_key_secret_id)?
            .or_else(|| SecretsService::get_secret("LITELLM_API_KEY").ok().flatten())
            .ok_or_else(|| {
                anyhow!("LiteLLM API key not found. Please set it in Settings -> API Keys.")
            })?;

        let client = Client::new();
        let mut wire_messages = Vec::new();

        if let Some(system) = system_prompt {
            wire_messages.push(json!({ "role": "system", "content": system }));
        }

        let intent = Self::classify_intent(&messages);

        for msg in &messages {
            wire_messages.push(json!({
                "role": msg.role,
                "content": msg.content,
            }));
        }
        let selected_model = self.model_for_intent(&intent);

        let body = json!({
            "model": selected_model,
            "messages": wire_messages,
            "stream": false,
            "metadata": {
                "intent": format!("{:?}", intent).to_lowercase(),
            }
        });

        let base = self.config.base_url.trim_end_matches('/');
        let url = format!("{}/chat/completions", base);

        let response = client
            .post(url)
            .bearer_auth(api_key)
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow!("LiteLLM error ({}): {}", status, text));
        }

        let json: serde_json::Value = response.json().await?;
        let content = json
            .get("choices")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|c| c.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_str())
            .ok_or_else(|| anyhow!("LiteLLM response missing choices[0].message.content"))?
            .to_string();

        Ok(ChatResponse { content })
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec![
            self.config.strategy.default_model.clone(),
            self.config.strategy.research_model.clone(),
            self.config.strategy.coding_model.clone(),
            self.config.strategy.editing_model.clone(),
        ])
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::LiteLlm
    }
}
