use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProviderType {
    Ollama,
    ClaudeCode,
    HostedApi,
    GeminiCli,
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
pub struct CustomCliConfig {
    pub id: String,
    pub name: String,
    pub command: String,
    pub api_key_secret_id: Option<String>,
    pub api_key_env_var: Option<String>,
    pub detected_path: Option<std::path::PathBuf>,
    #[serde(default)]
    pub is_configured: bool,
    pub settings_file_path: Option<std::path::PathBuf>,
    pub mcp_config_flag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_results: Option<Vec<ToolResult>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_use_id: String,
    pub content: String,
    #[serde(default)]
    pub is_error: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    #[serde(default)]
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub tool_type: String,
    pub function: ToolFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolFunction {
    pub name: String,
    pub arguments: String, // JSON string
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
