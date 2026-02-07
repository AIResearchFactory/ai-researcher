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
    pub enabled: bool,
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
