use anyhow::{Context, Result};
use chrono::Utc;
use futures::stream::{Stream, StreamExt};
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::pin::Pin;
use async_trait::async_trait;
use crate::models::llm::LlmProvider;
use crate::models::chat::{ChatMessage, ChatRequest};

const CLAUDE_API_URL: &str = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_VERSION: &str = "2023-06-01";

#[derive(Debug, Serialize)]
struct ClaudeApiRequest {
    model: String,
    messages: Vec<ClaudeApiMessage>,
    max_tokens: u32,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
}

#[derive(Debug, Serialize)]
struct ClaudeApiMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ClaudeStreamEvent {
    #[serde(rename = "type")]
    event_type: String,
    delta: Option<ClaudeStreamDelta>,
}

#[derive(Debug, Deserialize)]
struct ClaudeStreamDelta {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ClaudeApiResponse {
    content: Vec<ClaudeContent>,
}

#[derive(Debug, Deserialize)]
struct ClaudeContent {
    text: Option<String>,
}

pub struct ClaudeService {
    api_key: String,
    model: String,
    client: reqwest::Client,
}

// ... (skipping structs that shouldn't change, but verify context)

impl ClaudeService {
    pub fn new(api_key: String, model: String) -> Self {
        let client = reqwest::Client::new();
        Self { api_key, model, client }
    }

    /// Send a message to Claude and stream the response
    pub async fn send_message(
        &self,
        request: ChatRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String>> + Send>>> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-api-key",
            HeaderValue::from_str(&self.api_key).context("Invalid API key format")?,
        );
        headers.insert(
            "anthropic-version",
            HeaderValue::from_static(CLAUDE_API_VERSION),
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        let api_messages: Vec<ClaudeApiMessage> = request
            .messages
            .iter()
            .map(|m| ClaudeApiMessage {
                role: m.role.clone(),
                content: m.content.clone(),
            })
            .collect();

        let api_request = ClaudeApiRequest {
            model: self.model.clone(),
            messages: api_messages,
            max_tokens: 4096,
            stream: true,
            system: request.system_prompt,
        };

        let response = self
            .client
            .post(CLAUDE_API_URL)
            .headers(headers)
            .json(&api_request)
            .send()
            .await
            .context("Failed to send request to Claude API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("Claude API error ({}): {}", status, error_text);
        }

        let stream = response.bytes_stream();

        let processed_stream = stream.map(|chunk_result| {
            let chunk = chunk_result.context("Failed to read chunk from stream")?;
            let text = String::from_utf8_lossy(&chunk);

            // Process Server-Sent Events (SSE) format
            let mut result_text = String::new();
            for line in text.lines() {
                if line.starts_with("data: ") {
                    let json_str = line.trim_start_matches("data: ");
                    if json_str == "[DONE]" {
                        continue;
                    }

                    match serde_json::from_str::<ClaudeStreamEvent>(json_str) {
                        Ok(event) => {
                            if event.event_type == "content_block_delta" {
                                if let Some(delta) = event.delta {
                                    if let Some(text) = delta.text {
                                        result_text.push_str(&text);
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            log::warn!("Failed to parse SSE event: {} - JSON: {}", e, json_str);
                        }
                    }
                }
            }

            Ok(result_text)
        });

        Ok(Box::pin(processed_stream))
    }
}

#[async_trait]
impl LlmProvider for ClaudeService {
    fn id(&self) -> String {
        "anthropic".to_string()
    }

    async fn chat_stream(
        &self,
        request: ChatRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String>> + Send>>> {
        self.send_message(request).await
    }

    async fn chat_sync(&self, request: ChatRequest) -> Result<String> {
        self.send_message_sync(request.messages, request.system_prompt).await
    }
}

impl ClaudeService {

    /// Send a message to Claude and get the complete response (non-streaming)
    /// This is used for workflow execution where we need the complete response at once
    pub async fn send_message_sync(
        &self,
        messages: Vec<ChatMessage>,
        system_prompt: Option<String>,
    ) -> Result<String, anyhow::Error> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-api-key",
            HeaderValue::from_str(&self.api_key).context("Invalid API key format")?,
        );
        headers.insert(
            "anthropic-version",
            HeaderValue::from_static(CLAUDE_API_VERSION),
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        let api_messages: Vec<ClaudeApiMessage> = messages
            .iter()
            .map(|m| ClaudeApiMessage {
                role: m.role.clone(),
                content: m.content.clone(),
            })
            .collect();

        let api_request = ClaudeApiRequest {
            model: self.model.clone(),
            messages: api_messages,
            max_tokens: 4096,
            stream: false, // Non-streaming request
            system: system_prompt,
        };

        let response = self
            .client
            .post(CLAUDE_API_URL)
            .headers(headers)
            .json(&api_request)
            .send()
            .await
            .context("Failed to send request to Claude API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("Claude API error ({}): {}", status, error_text);
        }

        // Parse the complete response
        let api_response: ClaudeApiResponse = response
            .json()
            .await
            .context("Failed to parse Claude API response")?;

        // Extract text from the first content block
        let text = api_response
            .content
            .get(0)
            .and_then(|c| c.text.clone())
            .ok_or_else(|| anyhow::anyhow!("No text content in response"))?;

        Ok(text)
    }

    /// Build a comprehensive system prompt combining project goal, base prompt, and skill prompt
    /// This is used for workflow execution to provide complete context to Claude
    pub fn build_system_prompt_with_skill(
        base_prompt: Option<String>,
        skill_id: Option<String>,
        skill_params: Option<HashMap<String, String>>,
        project_goal: Option<String>,
    ) -> Result<String, anyhow::Error> {
        let mut system_prompt = String::new();

        // Add project goal if provided
        if let Some(goal) = project_goal {
            system_prompt.push_str("# Project Goal\n\n");
            system_prompt.push_str(&goal);
            system_prompt.push_str("\n\n");
        }

        // Add base prompt if provided
        if let Some(base) = base_prompt {
            system_prompt.push_str(&base);
            system_prompt.push_str("\n\n");
        }

        // Add skill-specific instructions if skill_id is provided
        if let Some(skill_id) = skill_id {
            // Load the skill
            use crate::services::skill_service::SkillService;
            let skill = SkillService::load_skill(&skill_id)
                .map_err(|e| anyhow::anyhow!("Failed to load skill '{}': {}", skill_id, e))?;

            system_prompt.push_str("# Skill Instructions\n\n");

            // Add skill description
            system_prompt.push_str(&format!("**Skill**: {}\n\n", skill.name));
            system_prompt.push_str(&format!("{}\n\n", skill.description));

            // Render the skill's prompt template with parameters
            let rendered_prompt = if let Some(params) = skill_params {
                skill.render_prompt(params)
                    .map_err(|e| anyhow::anyhow!("Failed to render skill prompt: {}", e))?
            } else {
                skill.prompt_template.clone()
            };

            system_prompt.push_str(&rendered_prompt);
            system_prompt.push_str("\n");
        }

        // Ensure we have at least some content
        if system_prompt.trim().is_empty() {
            system_prompt = "You are a helpful AI assistant.".to_string();
        }

        Ok(system_prompt)
    }

}

#[cfg(test)]
mod tests {
    use super::*;

}
