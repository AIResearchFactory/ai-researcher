use anyhow::{anyhow, Result};
use async_trait::async_trait;

use crate::services::secrets_service::SecretsService;
use crate::services::settings_service::SettingsService;

#[derive(Debug, Clone)]
pub struct ProviderDetection {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<std::path::PathBuf>,
    pub in_path: bool,
}

#[derive(Debug, Clone)]
pub struct ProviderAuthStatus {
    pub connected: bool,
    pub method: String,
    pub details: String,
}

#[async_trait]
pub trait ProviderAuthAdapter: Send + Sync {
    fn id(&self) -> &'static str;
    async fn detect(&self) -> Result<Option<ProviderDetection>>;
    async fn status(&self) -> Result<ProviderAuthStatus>;
    async fn authenticate(&self) -> Result<String>;
    async fn logout(&self) -> Result<String>;
}

pub struct OpenAiCliAdapter;

#[async_trait]
impl ProviderAuthAdapter for OpenAiCliAdapter {
    fn id(&self) -> &'static str { "openai" }

    async fn detect(&self) -> Result<Option<ProviderDetection>> {
        let candidates = ["codex", "openai"];
        for cmd in candidates {
            let in_path = crate::utils::env::command_exists(cmd);
            if !in_path { continue; }

            let version = std::process::Command::new(cmd)
                .arg("--version")
                .output()
                .ok()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                .filter(|s| !s.is_empty());

            let path = std::process::Command::new("where")
                .arg(cmd)
                .output()
                .ok()
                .and_then(|o| {
                    let out = String::from_utf8_lossy(&o.stdout).to_string();
                    out.lines().next().map(|l| std::path::PathBuf::from(l.trim()))
                });

            return Ok(Some(ProviderDetection { installed: true, version, path, in_path }));
        }

        Ok(None)
    }

    async fn status(&self) -> Result<ProviderAuthStatus> {
        let has_api_key = SecretsService::get_secret("OPENAI_API_KEY")?
            .map(|v| !v.trim().is_empty())
            .unwrap_or(false);

        if has_api_key {
            return Ok(ProviderAuthStatus {
                connected: true,
                method: "openai-api-key".to_string(),
                details: "OPENAI_API_KEY is configured.".to_string(),
            });
        }

        let settings = SettingsService::load_global_settings()?;
        let cmd = settings.openai_cli.command.trim().to_string();
        if cmd.is_empty() {
            return Ok(ProviderAuthStatus {
                connected: false,
                method: "openai-cli-login".to_string(),
                details: "Not authenticated. Click 'Login / Refresh Session' to sign in with your local OpenAI/Codex CLI.".to_string(),
            });
        }

        let cmd_parts: Vec<&str> = cmd.split_whitespace().collect();
        let bin = cmd_parts[0];
        if !crate::utils::env::command_exists(bin) {
            return Ok(ProviderAuthStatus {
                connected: false,
                method: "openai-cli-login".to_string(),
                details: "OpenAI/Codex CLI not found in PATH. Install it first, then login.".to_string(),
            });
        }

        let args = &cmd_parts[1..];
        let output = tokio::time::timeout(std::time::Duration::from_secs(3), async {
            if bin.eq_ignore_ascii_case("codex") {
                tokio::process::Command::new(bin).args(args).arg("login").arg("status").output().await
            } else if bin.eq_ignore_ascii_case("openai") {
                tokio::process::Command::new(bin).args(args).arg("auth").arg("status").output().await
            } else {
                tokio::process::Command::new(bin).args(args).arg("login").arg("status").output().await
            }
        }).await;

        match output {
            Ok(Ok(out)) => {
                let combined = format!("{} {}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr)).to_lowercase();
                let connected = out.status.success() && !combined.contains("not logged") && !combined.contains("not authenticated");
                Ok(ProviderAuthStatus {
                    connected,
                    method: "openai-cli-login".to_string(),
                    details: if connected {
                        "OpenAI CLI session looks authenticated.".to_string()
                    } else {
                        "Not authenticated. Click 'Login / Refresh Session' to sign in with your local OpenAI/Codex CLI.".to_string()
                    },
                })
            }
            _ => Ok(ProviderAuthStatus {
                connected: false,
                method: "openai-cli-login".to_string(),
                details: "Not authenticated. Click 'Login / Refresh Session' to sign in with your local OpenAI/Codex CLI.".to_string(),
            }),
        }
    }

    async fn authenticate(&self) -> Result<String> {
        let settings = SettingsService::load_global_settings()?;
        let cmd = settings.openai_cli.command.trim().to_string();
        if cmd.is_empty() {
            return Err(anyhow!("OpenAI CLI command is empty"));
        }

        let cmd_parts: Vec<&str> = cmd.split_whitespace().collect();
        let (bin, args) = (cmd_parts[0], &cmd_parts[1..]);
        let login_args: Vec<&str> = if bin.eq_ignore_ascii_case("codex") {
            vec!["login"]
        } else if bin.eq_ignore_ascii_case("openai") {
            vec!["auth", "login"]
        } else {
            vec!["login"]
        };

        let output = tokio::process::Command::new(bin)
            .args(args)
            .args(&login_args)
            .output()
            .await?;

        if output.status.success() {
            Ok("OpenAI CLI login flow completed or started successfully.".to_string())
        } else {
            let err = String::from_utf8_lossy(&output.stderr);
            Err(anyhow!("OpenAI authentication failed: {}", err))
        }
    }

    async fn logout(&self) -> Result<String> {
        let settings = SettingsService::load_global_settings()?;
        let cmd = settings.openai_cli.command.trim().to_string();
        if !cmd.is_empty() {
            let cmd_parts: Vec<&str> = cmd.split_whitespace().collect();
            let (bin, args) = (cmd_parts[0], &cmd_parts[1..]);
            if crate::utils::env::command_exists(bin) {
                let logout_args: Vec<&str> = if bin.eq_ignore_ascii_case("codex") {
                    vec!["logout"]
                } else if bin.eq_ignore_ascii_case("openai") {
                    vec!["auth", "logout"]
                } else {
                    vec!["logout"]
                };
                let _ = tokio::time::timeout(std::time::Duration::from_secs(5), async {
                    tokio::process::Command::new(bin).args(args).args(&logout_args).output().await
                }).await;
            }
        }
        Ok("OpenAI CLI logout requested.".to_string())
    }
}

pub struct GeminiCliAdapter;

#[async_trait]
impl ProviderAuthAdapter for GeminiCliAdapter {
    fn id(&self) -> &'static str { "google" }

    async fn detect(&self) -> Result<Option<ProviderDetection>> {
        let settings = SettingsService::load_global_settings()?;
        let detected = crate::detector::detect_gemini_with_path(settings.gemini_cli.detected_path)
            .await?;

        Ok(detected.map(|g| ProviderDetection {
            installed: g.installed,
            version: g.version,
            path: g.path,
            in_path: g.in_path,
        }))
    }

    async fn status(&self) -> Result<ProviderAuthStatus> {
        let has_api_key = SecretsService::get_secret("GEMINI_API_KEY")?
            .map(|v| !v.trim().is_empty())
            .unwrap_or(false);

        if has_api_key {
            return Ok(ProviderAuthStatus {
                connected: true,
                method: "gemini-api-key".to_string(),
                details: "GEMINI_API_KEY is configured.".to_string(),
            });
        }

        let settings = SettingsService::load_global_settings()?;
        let cmd = settings.gemini_cli.command.trim().to_string();
        if cmd.is_empty() {
            return Ok(ProviderAuthStatus {
                connected: false,
                method: "google-antigravity-login".to_string(),
                details: "Gemini CLI command is empty.".to_string(),
            });
        }

        let cmd_parts: Vec<&str> = cmd.split_whitespace().collect();
        let (bin, args) = (cmd_parts[0], &cmd_parts[1..]);
        let output = tokio::time::timeout(std::time::Duration::from_secs(6), async {
            tokio::process::Command::new(bin)
                .args(args)
                .arg("models")
                .arg("list")
                .output()
                .await
        }).await;

        match output {
            Ok(Ok(out)) => {
                let combined = format!("{} {}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr)).to_lowercase();
                let unauth = combined.contains("not authenticated")
                    || combined.contains("api key required")
                    || combined.contains("unauthorized")
                    || combined.contains("authentication required");
                let connected = out.status.success() && !unauth;
                Ok(ProviderAuthStatus {
                    connected,
                    method: "google-antigravity-login".to_string(),
                    details: if connected {
                        "Google/Gemini CLI session looks authenticated.".to_string()
                    } else {
                        "Google/Gemini auth not verified yet. Please login via Terminal.".to_string()
                    },
                })
            }
            Ok(Err(e)) => Ok(ProviderAuthStatus {
                connected: false,
                method: "google-antigravity-login".to_string(),
                details: format!("Failed to execute Gemini auth status check: {}", e),
            }),
            Err(_) => Ok(ProviderAuthStatus {
                connected: false,
                method: "google-antigravity-login".to_string(),
                details: "Google status check timed out. You can still try Login / Change Method.".to_string(),
            }),
        }
    }

    async fn authenticate(&self) -> Result<String> {
        let settings = SettingsService::load_global_settings()?;
        let cmd = settings.gemini_cli.command.trim().to_string();
        if cmd.is_empty() {
            return Err(anyhow!("Gemini CLI command is empty"));
        }
        let cmd_parts: Vec<&str> = cmd.split_whitespace().collect();
        let (bin, args) = (cmd_parts[0], &cmd_parts[1..]);

        let _ = tokio::process::Command::new(bin)
            .args(args)
            .arg("/auth")
            .spawn()?;

        Ok("Authentication window opened in Terminal. Please complete the login and return here.".to_string())
    }

    async fn logout(&self) -> Result<String> {
        let settings = SettingsService::load_global_settings()?;
        let cmd = settings.gemini_cli.command.trim().to_string();
        if cmd.is_empty() {
            return Err(anyhow!("Gemini CLI command is empty"));
        }

        let cmd_parts: Vec<&str> = cmd.split_whitespace().collect();
        let (bin, args) = (cmd_parts[0], &cmd_parts[1..]);
        let _ = tokio::process::Command::new(bin)
            .args(args)
            .arg("/logout")
            .output()
            .await;

        Ok("Google logout requested and local auth marker cleared.".to_string())
    }
}

pub struct ProviderManager;

impl ProviderManager {
    fn adapter(id: &str) -> Result<Box<dyn ProviderAuthAdapter>> {
        match id {
            "openai" => Ok(Box::new(OpenAiCliAdapter)),
            "google" => Ok(Box::new(GeminiCliAdapter)),
            _ => Err(anyhow!("Unknown provider id: {}", id)),
        }
    }

    pub async fn detect(id: &str) -> Result<Option<ProviderDetection>> {
        Self::adapter(id)?.detect().await
    }

    pub async fn status(id: &str) -> Result<ProviderAuthStatus> {
        Self::adapter(id)?.status().await
    }

    pub async fn authenticate(id: &str) -> Result<String> {
        Self::adapter(id)?.authenticate().await
    }

    pub async fn logout(id: &str) -> Result<String> {
        Self::adapter(id)?.logout().await
    }
}
