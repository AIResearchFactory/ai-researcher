use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use chrono::{DateTime, Utc};

use crate::services::encryption_service::EncryptionService;
use crate::utils::paths;

pub struct SecretsService;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Secrets {
    pub claude_api_key: Option<String>,
    pub n8n_webhook_url: Option<String>,
    pub custom_api_keys: HashMap<String, String>,
}

impl SecretsService {
    /// Load secrets from .secrets.encrypted.md
    pub fn load_secrets() -> Result<Secrets> {
        let secrets_path = paths::get_secrets_path()?;

        // If file doesn't exist, return empty secrets
        if !secrets_path.exists() {
            return Ok(Secrets {
                claude_api_key: None,
                n8n_webhook_url: None,
                custom_api_keys: HashMap::new(),
            });
        }

        let content = fs::read_to_string(&secrets_path)
            .context("Failed to read secrets file")?;

        Self::parse_encrypted_secrets(&content)
    }

    /// Parse secrets from encrypted markdown content
    fn parse_encrypted_secrets(content: &str) -> Result<Secrets> {
        // Skip frontmatter and find encrypted data block
        let encrypted_data = Self::extract_encrypted_data(content)
            .context("Failed to extract encrypted data from secrets file")?;

        // Decrypt the data
        let decrypted_json = EncryptionService::decrypt(&encrypted_data)
            .context("Failed to decrypt secrets")?;

        // Deserialize from JSON
        let secrets: Secrets = serde_json::from_str(&decrypted_json)
            .context("Failed to parse decrypted secrets")?;

        Ok(secrets)
    }

    /// Extract encrypted data block from markdown content
    fn extract_encrypted_data(content: &str) -> Option<String> {
        use crate::models::settings::GlobalSettings;
        
        let (_, markdown_content) = GlobalSettings::extract_frontmatter_raw(content);

        // Find the encrypted data block (after "## Encrypted Data")
        if let Some(data_section) = markdown_content.find("## Encrypted Data") {
            let after_header = &markdown_content[data_section + 17..]; // Length of "## Encrypted Data"
            
            // Extract the base64 data (trim whitespace and newlines)
            return after_header.lines()
                .find(|line| !line.trim().is_empty())
                .map(|line| line.trim().to_string());
        }
        
        None
    }

    /// Save secrets to .secrets.encrypted.md
    pub fn save_secrets(secrets: &Secrets) -> Result<()> {
        let secrets_path = paths::get_secrets_path()?;

        // Ensure directory exists
        if let Some(parent) = secrets_path.parent() {
            fs::create_dir_all(parent).context("Failed to create secrets directory")?;
        }

        let content = Self::format_encrypted_secrets(secrets)?;
        fs::write(&secrets_path, content).context("Failed to write secrets file")?;

        Ok(())
    }

    /// Format secrets as encrypted markdown content
    fn format_encrypted_secrets(secrets: &Secrets) -> Result<String> {
        // Serialize to JSON
        let json_data = serde_json::to_string(secrets)
            .context("Failed to serialize secrets")?;

        // Encrypt
        let encrypted_data = EncryptionService::encrypt(&json_data)
            .context("Failed to encrypt secrets")?;

        // Get current timestamp
        let now: DateTime<Utc> = Utc::now();
        let timestamp = now.to_rfc3339();

        // Create markdown with frontmatter and encrypted data
        let content = format!(
            r#"---
encrypted: true
version: 1.0.0
last_updated: {}
---

# Encrypted Secrets

⚠️ This file contains encrypted sensitive information.

## Encrypted Data

{}
"#,
            timestamp, encrypted_data
        );

        Ok(content)
    }

    /// Get Claude API key
    pub fn get_claude_api_key() -> Result<Option<String>> {
        let secrets = Self::load_secrets()?;
        Ok(secrets.claude_api_key)
    }

    /// Check if Claude API key exists
    pub fn has_claude_api_key() -> Result<bool> {
        let secrets = Self::load_secrets()?;
        Ok(secrets.claude_api_key.is_some())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // Use a mutex to ensure tests run serially and don't interfere with each other
    static TEST_MUTEX: Mutex<()> = Mutex::new(());

    #[test]
    fn test_encrypt_decrypt_secrets() {
        let _lock = TEST_MUTEX.lock().unwrap();

        // Clean up any existing master key
        let _ = EncryptionService::delete_master_key();

        let secrets = Secrets {
            claude_api_key: Some("sk-ant-test123".to_string()),
            n8n_webhook_url: Some("https://example.com/webhook".to_string()),
            custom_api_keys: {
                let mut map = HashMap::new();
                map.insert("openai".to_string(), "sk-openai-test".to_string());
                map
            },
        };

        // Format and parse
        let formatted = SecretsService::format_encrypted_secrets(&secrets).unwrap();
        let parsed = SecretsService::parse_encrypted_secrets(&formatted).unwrap();

        assert_eq!(parsed.claude_api_key, secrets.claude_api_key);
        assert_eq!(parsed.n8n_webhook_url, secrets.n8n_webhook_url);
        assert_eq!(parsed.custom_api_keys.get("openai"), secrets.custom_api_keys.get("openai"));

        // Clean up
        let _ = EncryptionService::delete_master_key();
    }

    #[test]
    fn test_extract_encrypted_data() {
        let _lock = TEST_MUTEX.lock().unwrap();

        let content = r#"---
encrypted: true
version: 1.0.0
last_updated: 2024-11-13T10:00:00Z
---

# Encrypted Secrets

⚠️ This file contains encrypted sensitive information.

## Encrypted Data

ABC123xyz789base64encodeddata==
"#;

        let encrypted_data = SecretsService::extract_encrypted_data(content).unwrap();
        assert_eq!(encrypted_data, "ABC123xyz789base64encodeddata==");
    }

    #[test]
    fn test_format_encrypted_secrets_structure() {
        let _lock = TEST_MUTEX.lock().unwrap();

        // Clean up any existing master key
        let _ = EncryptionService::delete_master_key();

        let secrets = Secrets {
            claude_api_key: Some("sk-ant-test123".to_string()),
            n8n_webhook_url: None,
            custom_api_keys: HashMap::new(),
        };

        let content = SecretsService::format_encrypted_secrets(&secrets).unwrap();

        // Verify structure
        assert!(content.starts_with("---"));
        assert!(content.contains("encrypted: true"));
        assert!(content.contains("version: 1.0.0"));
        assert!(content.contains("last_updated:"));
        assert!(content.contains("# Encrypted Secrets"));
        assert!(content.contains("⚠️"));
        assert!(content.contains("## Encrypted Data"));

        // Clean up
        let _ = EncryptionService::delete_master_key();
    }
}
