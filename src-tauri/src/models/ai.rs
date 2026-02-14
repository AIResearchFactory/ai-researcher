use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProviderType {
    Ollama,
    ClaudeCode,
    HostedApi,
    GeminiCli,
    LiteLlm,
    #[serde(untagged)]
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaConfig {
    pub model: String,
    #[serde(default = "default_ollama_url")]
    pub api_url: String, // e.g. "http://localhost:11434"
    #[serde(default)]
    pub detected_path: Option<std::path::PathBuf>,
}

fn default_ollama_url() -> String {
    "http://localhost:11434".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeConfig {
    pub model: String,
    #[serde(default)]
    pub detected_path: Option<std::path::PathBuf>,
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
    pub api_key_env_var: Option<String>,
    #[serde(default)]
    pub detected_path: Option<std::path::PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LiteLlmConfig {
    pub enabled: bool,
    pub base_url: String,
    pub api_key_secret_id: String,
    pub strategy: RoutingStrategy,
    pub shadow_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RoutingStrategy {
    pub default_model: String,
    pub research_model: String,
    pub coding_model: String,
    pub editing_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TaskIntent {
    General,
    Research,
    Coding,
    Editing,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CustomCliConfig {
    pub id: String,
    pub name: String,
    pub command: String,
    pub api_key_secret_id: Option<String>,
    pub api_key_env_var: Option<String>,
    pub detected_path: Option<std::path::PathBuf>,
    #[serde(default)]
    pub is_configured: bool,
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
