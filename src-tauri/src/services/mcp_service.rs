use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::process::{Command, Child};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::Mutex;
use serde_json::{json, Value};
use anyhow::{Result, anyhow, Context};
use crate::models::ai::{MCPServerConfig, Tool};

pub struct MCPServerConnection {
    config: MCPServerConfig,
    child: Mutex<Option<Child>>,
}

impl MCPServerConnection {
    pub fn new(config: MCPServerConfig) -> Self {
        Self {
            config,
            child: Mutex::new(None),
        }
    }

    pub async fn start(&self) -> Result<()> {
        let mut child = Command::new(&self.config.command)
            .args(&self.config.args)
            .envs(&self.config.env)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .context(format!("Failed to spawn MCP server: {}", self.config.name))?;

        // Perform MCP handshake
        let stdin = child.stdin.as_mut().ok_or_else(|| anyhow!("No stdin"))?;
        let stdout = child.stdout.as_mut().ok_or_else(|| anyhow!("No stdout"))?;
        let mut reader = BufReader::new(stdout);

        // 1. Initialize
        let init_request = json!({
            "jsonrpc": "2.0",
            "id": "init",
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "AI Researcher",
                    "version": "0.2.0"
                }
            }
        });
        let req_str = serde_json::to_string(&init_request)? + "\n";
        stdin.write_all(req_str.as_bytes()).await?;
        stdin.flush().await?;

        let mut line = String::new();
        reader.read_line(&mut line).await?;
        // Ignore response for now or verify it

        // 2. Initialized notification
        let initialized_notif = json!({
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        });
        let notif_str = serde_json::to_string(&initialized_notif)? + "\n";
        stdin.write_all(notif_str.as_bytes()).await?;
        stdin.flush().await?;

        let mut lock = self.child.lock().await;
        *lock = Some(child);
        Ok(())
    }

    pub async fn call_tool(&self, name: &str, arguments: Value) -> Result<Value> {
        let mut lock = self.child.lock().await;
        if let Some(child) = lock.as_mut() {
            let stdin = child.stdin.as_mut().ok_or_else(|| anyhow!("No stdin"))?;
            let stdout = child.stdout.as_mut().ok_or_else(|| anyhow!("No stdout"))?;
            let mut reader = BufReader::new(stdout);

            let request = json!({
                "jsonrpc": "2.0",
                "id": 1, 
                "method": "tools/call",
                "params": {
                    "name": name,
                    "arguments": arguments
                }
            });

            let req_str = serde_json::to_string(&request)? + "\n";
            stdin.write_all(req_str.as_bytes()).await?;
            stdin.flush().await?;

            let mut line = String::new();
            reader.read_line(&mut line).await?;
            let response: Value = serde_json::from_str(&line)?;
            
            if let Some(error) = response.get("error") {
                return Err(anyhow!("MCP Error: {}", error));
            }

            Ok(response.get("result").cloned().unwrap_or(Value::Null))
        } else {
            Err(anyhow!("Server not started"))
        }
    }

    pub async fn list_tools(&self) -> Result<Vec<Tool>> {
        let mut lock = self.child.lock().await;
        if let Some(child) = lock.as_mut() {
            let stdin = child.stdin.as_mut().ok_or_else(|| anyhow!("No stdin"))?;
            let stdout = child.stdout.as_mut().ok_or_else(|| anyhow!("No stdout"))?;
            let mut reader = BufReader::new(stdout);

            let request = json!({
                "jsonrpc": "2.0",
                "id": "list_tools",
                "method": "tools/list",
                "params": {}
            });

            let req_str = serde_json::to_string(&request)? + "\n";
            stdin.write_all(req_str.as_bytes()).await?;
            stdin.flush().await?;

            let mut line = String::new();
            reader.read_line(&mut line).await?;
            let response: Value = serde_json::from_str(&line)?;

            let tools_val = response.get("result").and_then(|r| r.get("tools")).ok_or_else(|| anyhow!("Failed to list tools"))?;
            let tools: Vec<Tool> = serde_json::from_value(tools_val.clone())?;
            Ok(tools)
        } else {
            Err(anyhow!("Server not started"))
        }
    }
}

pub struct MCPClient {
    servers: Arc<Mutex<HashMap<String, Arc<MCPServerConnection>>>>,
}

impl MCPClient {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn add_server(&self, config: MCPServerConfig) -> Result<()> {
        let server = Arc::new(MCPServerConnection::new(config.clone()));
        if config.enabled {
            if let Err(e) = server.start().await {
                log::error!("Failed to start MCP server {}: {}", config.name, e);
                // Don't fail the whole app if one server fails
            }
        }
        let mut servers = self.servers.lock().await;
        servers.insert(config.id.clone(), server);
        Ok(())
    }

    pub async fn get_all_tools(&self) -> Result<Vec<Tool>> {
        let servers = self.servers.lock().await;
        let mut all_tools = Vec::new();
        for server in servers.values() {
            match server.list_tools().await {
                Ok(tools) => all_tools.extend(tools),
                Err(e) => log::warn!("Failed to list tools for a server: {}", e),
            }
        }
        Ok(all_tools)
    }

    pub async fn call_tool(&self, server_id: &str, tool_name: &str, arguments: Value) -> Result<Value> {
        let servers = self.servers.lock().await;
        if let Some(server) = servers.get(server_id) {
            server.call_tool(tool_name, arguments).await
        } else {
            Err(anyhow!("Server not found: {}", server_id))
        }
    }
}
