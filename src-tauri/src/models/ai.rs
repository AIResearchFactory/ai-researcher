use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProviderType {
    Ollama,
    ClaudeCode,
    HostedApi,
    GeminiCli,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaConfig {
    pub model: String,
    #[serde(default = "default_ollama_url")]
    pub api_url: String, // e.g. "http://localhost:11434"
}

fn default_ollama_url() -> String {
    "http://localhost:11434".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeConfig {
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostedConfig {
    pub provider: String, // e.g., "anthropic", "openai"
    pub model: String,
    pub api_key_secret_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GeminiCliConfig {
    pub command: String,
    pub model_alias: String,
    pub api_key_secret_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tool {
    pub name: String,
    pub description: String,
    #[serde(alias = "input_schema")]
    pub input_schema: serde_json::Value,
    #[serde(rename = "type", default = "default_tool_type")]
    pub tool_type: String,
}

fn default_tool_type() -> String {
    "function".to_string()
}
