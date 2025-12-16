use anyhow::{Context, Result};
use chrono::Utc;
use futures::stream::{Stream, StreamExt};
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::pin::Pin;

const CLAUDE_API_URL: &str = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_VERSION: &str = "2023-06-01";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
    pub system_prompt: Option<String>,
    pub project_id: Option<String>,
    pub skill_id: Option<String>,
    pub skill_params: Option<HashMap<String, String>>,
}

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

    /// Send a message to Claude and get the complete response (non-streaming)
    /// This is used for workflow execution where we need the complete response at once
    pub async fn send_message_sync(
        &self,
        messages: Vec<ChatMessage>,
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
            system: None,
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

    /// Save chat conversation to markdown file
    pub async fn save_chat_to_file(
        project_id: &str,
        messages: Vec<ChatMessage>,
        model: &str,
    ) -> Result<String> {
        let chat_dir = Self::get_chat_directory(project_id)?;
        fs::create_dir_all(&chat_dir).context("Failed to create chat directory")?;

        let timestamp = Utc::now();
        let file_name = format!("chat_{}.md", timestamp.format("%Y%m%d_%H%M%S"));
        let file_path = chat_dir.join(&file_name);

        let content = Self::format_chat_markdown(&messages, &timestamp.to_rfc3339(), model);
        fs::write(&file_path, content).context("Failed to write chat file")?;

        Ok(file_name)
    }

    /// Get the chat directory for a project
    fn get_chat_directory(project_id: &str) -> Result<PathBuf> {
        let home_dir = dirs::home_dir().context("Failed to get home directory")?;
        let base_dir = home_dir.join(".ai-researcher");
        Ok(base_dir.join(project_id).join("chats"))
    }

    /// Format chat messages as markdown
    fn format_chat_markdown(messages: &[ChatMessage], created: &str, model: &str) -> String {
        let mut content = String::from("---\n");
        content.push_str(&format!("created: {}\n", created));
        content.push_str(&format!("model: {}\n", model));
        content.push_str(&format!("message_count: {}\n", messages.len()));
        content.push_str("---\n\n");
        content.push_str("# Conversation\n\n");

        for message in messages {
            let role = if message.role == "user" {
                "User"
            } else {
                "Assistant"
            };
            content.push_str(&format!("## {}\n", role));
            content.push_str(&message.content);
            content.push_str("\n\n");
        }

        content
    }

    /// Load chat history from a file
    pub async fn load_chat_from_file(
        project_id: &str,
        file_name: &str,
    ) -> Result<Vec<ChatMessage>> {
        let chat_dir = Self::get_chat_directory(project_id)?;
        let file_path = chat_dir.join(file_name);

        let content = fs::read_to_string(&file_path)
            .context("Failed to read chat file")?;

        Self::parse_chat_markdown(&content)
    }

    /// Parse chat messages from markdown
    fn parse_chat_markdown(content: &str) -> Result<Vec<ChatMessage>> {
        let mut messages = Vec::new();
        let mut current_role: Option<String> = None;
        let mut current_content = String::new();
        let mut in_conversation = false;

        for line in content.lines() {
            // Skip frontmatter
            if line.trim() == "---" {
                continue;
            }

            // Start of conversation section
            if line.trim() == "# Conversation" {
                in_conversation = true;
                continue;
            }

            if !in_conversation {
                continue;
            }

            // Check for message headers
            if line.starts_with("## User") {
                // Save previous message if any
                if let Some(role) = current_role.take() {
                    messages.push(ChatMessage {
                        role,
                        content: current_content.trim().to_string(),
                    });
                    current_content.clear();
                }
                current_role = Some("user".to_string());
            } else if line.starts_with("## Assistant") {
                // Save previous message if any
                if let Some(role) = current_role.take() {
                    messages.push(ChatMessage {
                        role,
                        content: current_content.trim().to_string(),
                    });
                    current_content.clear();
                }
                current_role = Some("assistant".to_string());
            } else if current_role.is_some() {
                // Accumulate message content
                if !current_content.is_empty() {
                    current_content.push('\n');
                }
                current_content.push_str(line);
            }
        }

        // Save the last message
        if let Some(role) = current_role {
            messages.push(ChatMessage {
                role,
                content: current_content.trim().to_string(),
            });
        }

        Ok(messages)
    }

    /// Get list of chat files for a project
    pub async fn get_chat_files(project_id: &str) -> Result<Vec<String>> {
        let chat_dir = Self::get_chat_directory(project_id)?;

        if !chat_dir.exists() {
            return Ok(Vec::new());
        }

        let mut files = Vec::new();
        for entry in fs::read_dir(&chat_dir).context("Failed to read chat directory")? {
            let entry = entry.context("Failed to read directory entry")?;
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
                if let Some(file_name) = path.file_name() {
                    files.push(file_name.to_string_lossy().to_string());
                }
            }
        }

        // Sort files by name (newest first due to timestamp format)
        files.sort_by(|a, b| b.cmp(a));

        Ok(files)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_chat_markdown() {
        let messages = vec![
            ChatMessage {
                role: "user".to_string(),
                content: "Hello!".to_string(),
            },
            ChatMessage {
                role: "assistant".to_string(),
                content: "Hi there!".to_string(),
            },
        ];

        let content = ClaudeService::format_chat_markdown(&messages, "2024-11-06T10:30:00Z", "claude-sonnet-4-5");
        assert!(content.contains("## User"));
        assert!(content.contains("## Assistant"));
        assert!(content.contains("Hello!"));
        assert!(content.contains("Hi there!"));
    }

    #[test]
    fn test_parse_chat_markdown() {
        let content = r#"---
created: 2024-11-06T10:30:00Z
model: claude-sonnet-4-5
message_count: 2
---

# Conversation

## User
Hello!

## Assistant
Hi there!
"#;

        let messages = ClaudeService::parse_chat_markdown(content).unwrap();
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].role, "user");
        assert_eq!(messages[0].content, "Hello!");
        assert_eq!(messages[1].role, "assistant");
        assert_eq!(messages[1].content, "Hi there!");
    }
}
