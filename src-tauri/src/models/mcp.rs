use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub command: String,
    pub args: Vec<String>,
    pub env: Option<HashMap<String, String>>,
    pub secrets_env: Option<HashMap<String, String>>,
    pub enabled: bool,
    // Enhanced metadata
    pub stars: Option<u32>,
    pub author: Option<String>,
    pub source: Option<String>,
    pub categories: Option<Vec<String>>,
    pub icon_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryResponse {
    pub servers: Vec<RegistryItem>,
    pub metadata: Option<RegistryMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryItem {
    pub server: RegistryServer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryServer {
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub packages: Option<Vec<RegistryPackage>>,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryPackage {
    #[serde(rename = "registryType")]
    pub registry_type: String,
    pub identifier: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryMetadata {
    #[serde(rename = "nextCursor")]
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpMarketSearchResponse {
    pub tools: Vec<McpMarketTool>,
    pub pagination: Option<McpMarketPagination>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpMarketTool {
    pub name: String,
    pub description: Option<String>,
    pub github: Option<String>,
    pub github_stars: Option<u32>,
    pub owner: Option<McpMarketOwner>,
    pub categories: Option<Vec<McpMarketCategory>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpMarketOwner {
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpMarketCategory {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpMarketPagination {
    #[serde(rename = "hasMore")]
    pub has_more: bool,
}
