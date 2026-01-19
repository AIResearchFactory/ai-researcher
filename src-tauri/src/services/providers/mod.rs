pub mod hosted;
pub mod ollama;
pub mod ollama_mcp;
pub mod claude_code;
pub mod gemini_cli;

/// Shared utility for parsing MCP tool call responses into a string
pub fn parse_mcp_response(response: &serde_json::Value) -> String {
    // 1. Try 'content' array (standard MCP)
    if let Some(content_val) = response.get("content") {
        if content_val.is_array() {
            let mut text = String::new();
            for block in content_val.as_array().unwrap() {
                if let Some(t) = block.get("text").and_then(|v| v.as_str()) {
                    text.push_str(t);
                }
            }
            if !text.is_empty() { return text; }
        } else if let Some(t) = content_val.as_str() {
            return t.to_string();
        }
    }
    
    // 2. Try 'text' field
    if let Some(t) = response.get("text").and_then(|v| v.as_str()) {
        return t.to_string();
    }

    // 3. Try 'message' -> 'content' (Ollama API style)
    if let Some(m) = response.get("message") {
        if let Some(c) = m.get("content").and_then(|v| v.as_str()) {
            return c.to_string();
        }
    }

    // 4. Try raw string
    if let Some(t) = response.as_str() {
        return t.to_string();
    }

    "No content".to_string()
}
