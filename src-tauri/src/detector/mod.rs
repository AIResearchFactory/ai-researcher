use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

/// Information about detected Claude Code installation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeCodeInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<PathBuf>,
    pub in_path: bool,
}

/// Information about detected Ollama installation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<PathBuf>,
    pub running: bool,
    pub in_path: bool,
}

/// Result of installation attempt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationResult {
    pub success: bool,
    pub message: String,
    pub path: Option<PathBuf>,
}

/// Detect Claude Code installation
pub async fn detect_claude_code() -> Result<Option<ClaudeCodeInfo>> {
    log::info!("Detecting Claude Code installation...");

    // First, check if claude-code is in PATH
    let path_check = Command::new("which")
        .arg("claude-code")
        .output();

    if let Ok(output) = path_check {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let path = PathBuf::from(&path_str);

            // Try to get version
            let version = get_claude_code_version().await;

            log::info!("Claude Code found in PATH at: {:?}", path);
            return Ok(Some(ClaudeCodeInfo {
                installed: true,
                version,
                path: Some(path),
                in_path: true,
            }));
        }
    }

    // Check common installation directories
    let common_paths = get_common_claude_code_paths();

    for path in common_paths {
        if path.exists() {
            log::info!("Claude Code found at: {:?}", path);

            // Try to get version
            let version = get_claude_code_version_from_path(&path).await;

            return Ok(Some(ClaudeCodeInfo {
                installed: true,
                version,
                path: Some(path),
                in_path: false,
            }));
        }
    }

    log::info!("Claude Code not detected");
    Ok(None)
}

/// Get Claude Code version
async fn get_claude_code_version() -> Option<String> {
    let output = Command::new("claude-code")
        .arg("--version")
        .output()
        .ok()?;

    if output.status.success() {
        let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        // Parse version from output like "claude-code 1.0.0"
        let version = version_str.split_whitespace().last()?.to_string();
        Some(version)
    } else {
        None
    }
}

/// Get Claude Code version from specific path
async fn get_claude_code_version_from_path(path: &PathBuf) -> Option<String> {
    let output = Command::new(path)
        .arg("--version")
        .output()
        .ok()?;

    if output.status.success() {
        let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let version = version_str.split_whitespace().last()?.to_string();
        Some(version)
    } else {
        None
    }
}

/// Get common Claude Code installation paths based on OS
fn get_common_claude_code_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            paths.push(PathBuf::from(&home).join(".local/bin/claude-code"));
            paths.push(PathBuf::from("/usr/local/bin/claude-code"));
            paths.push(PathBuf::from(&home).join("bin/claude-code"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            paths.push(PathBuf::from(&home).join(".local/bin/claude-code"));
            paths.push(PathBuf::from("/usr/local/bin/claude-code"));
            paths.push(PathBuf::from("/usr/bin/claude-code"));
            paths.push(PathBuf::from(&home).join("bin/claude-code"));
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(app_data) = std::env::var("LOCALAPPDATA") {
            paths.push(PathBuf::from(&app_data).join("Programs\\Claude Code\\claude-code.exe"));
        }
        if let Ok(program_files) = std::env::var("ProgramFiles") {
            paths.push(PathBuf::from(&program_files).join("Claude Code\\claude-code.exe"));
        }
    }

    paths
}

/// Detect Ollama installation
pub async fn detect_ollama() -> Result<Option<OllamaInfo>> {
    log::info!("Detecting Ollama installation...");

    // First, check if ollama is in PATH
    let path_check = Command::new("which")
        .arg("ollama")
        .output();

    let mut ollama_path: Option<PathBuf> = None;
    let mut in_path = false;

    if let Ok(output) = path_check {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            ollama_path = Some(PathBuf::from(&path_str));
            in_path = true;
            log::info!("Ollama found in PATH at: {:?}", ollama_path);
        }
    }

    // If not found in PATH, check common installation directories
    if ollama_path.is_none() {
        let common_paths = get_common_ollama_paths();

        for path in common_paths {
            if path.exists() {
                ollama_path = Some(path);
                log::info!("Ollama found at: {:?}", ollama_path);
                break;
            }
        }
    }

    if let Some(path) = &ollama_path {
        // Try to get version
        let version = get_ollama_version(&path).await;

        // Check if Ollama is running
        let running = check_ollama_running().await;

        log::info!("Ollama detected - Version: {:?}, Running: {}", version, running);

        return Ok(Some(OllamaInfo {
            installed: true,
            version,
            path: Some(path.clone()),
            running,
            in_path,
        }));
    }

    log::info!("Ollama not detected");
    Ok(None)
}

/// Get Ollama version
async fn get_ollama_version(path: &PathBuf) -> Option<String> {
    let output = Command::new(path)
        .arg("--version")
        .output()
        .ok()?;

    if output.status.success() {
        let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        // Parse version from output like "ollama version is 0.1.0"
        let version = version_str.split_whitespace().last()?.to_string();
        Some(version)
    } else {
        None
    }
}

/// Check if Ollama service is running
async fn check_ollama_running() -> bool {
    // Try to connect to Ollama API
    let client = reqwest::Client::new();
    let result = client
        .get("http://localhost:11434/api/tags")
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await;

    result.is_ok()
}

/// Get common Ollama installation paths based on OS
fn get_common_ollama_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            paths.push(PathBuf::from(&home).join(".local/bin/ollama"));
            paths.push(PathBuf::from("/usr/local/bin/ollama"));
            paths.push(PathBuf::from(&home).join("bin/ollama"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            paths.push(PathBuf::from(&home).join(".local/bin/ollama"));
            paths.push(PathBuf::from("/usr/local/bin/ollama"));
            paths.push(PathBuf::from("/usr/bin/ollama"));
            paths.push(PathBuf::from(&home).join("bin/ollama"));
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(app_data) = std::env::var("LOCALAPPDATA") {
            paths.push(PathBuf::from(&app_data).join("Programs\\Ollama\\ollama.exe"));
        }
        if let Ok(program_files) = std::env::var("ProgramFiles") {
            paths.push(PathBuf::from(&program_files).join("Ollama\\ollama.exe"));
        }
    }

    paths
}

/// Install Claude Code (guide user through the installation process)
/// Note: This function returns instructions since we can't automatically install
/// Claude Code - the user needs to follow the official installation process
pub async fn install_claude_code() -> Result<InstallationResult> {
    log::info!("Preparing Claude Code installation instructions...");

    // We cannot automatically install Claude Code, so we return instructions
    let message = get_claude_code_installation_instructions();

    Ok(InstallationResult {
        success: false, // false because we haven't actually installed it
        message,
        path: None,
    })
}

/// Get installation instructions for Claude Code
pub fn get_claude_code_installation_instructions() -> String {
    #[cfg(target_os = "macos")]
    {
        r#"To install Claude Code, please follow these steps:

1. Open your terminal
2. Run the following command:
   curl -fsSL https://claude.ai/install.sh | sh

3. Follow the installation prompts
4. Once installed, restart this application

Alternatively, you can:
- Use Homebrew: brew install claude-code
- Download from: https://claude.ai/download

After installation, Claude Code will be available in your PATH."#.to_string()
    }

    #[cfg(target_os = "linux")]
    {
        r#"To install Claude Code, please follow these steps:

1. Open your terminal
2. Run the following command:
   curl -fsSL https://claude.ai/install.sh | sh

3. Follow the installation prompts
4. Once installed, restart this application

After installation, Claude Code will be available in your PATH."#.to_string()
    }

    #[cfg(target_os = "windows")]
    {
        r#"To install Claude Code, please follow these steps:

1. Download the installer from: https://claude.ai/download
2. Run the installer and follow the prompts
3. Once installed, restart this application

Claude Code will be added to your system PATH during installation."#.to_string()
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        "Please visit https://claude.ai/download for installation instructions for your operating system.".to_string()
    }
}

/// Get installation instructions for Ollama
pub fn get_ollama_installation_instructions() -> String {
    #[cfg(target_os = "macos")]
    {
        r#"To install Ollama, please follow these steps:

1. Download Ollama from: https://ollama.ai/download
2. Double-click the downloaded file to install
3. Once installed, Ollama will start automatically
4. Restart this application

Alternatively, you can use Homebrew:
   brew install ollama"#.to_string()
    }

    #[cfg(target_os = "linux")]
    {
        r#"To install Ollama, please follow these steps:

1. Open your terminal
2. Run the following command:
   curl -fsSL https://ollama.ai/install.sh | sh

3. Start the Ollama service:
   ollama serve

4. Restart this application"#.to_string()
    }

    #[cfg(target_os = "windows")]
    {
        r#"To install Ollama, please follow these steps:

1. Download Ollama from: https://ollama.ai/download
2. Run the installer and follow the prompts
3. Once installed, Ollama will start automatically
4. Restart this application"#.to_string()
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        "Please visit https://ollama.ai/download for installation instructions for your operating system.".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_detect_claude_code() {
        // This test will pass/fail based on whether Claude Code is installed
        let result = detect_claude_code().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_detect_ollama() {
        // This test will pass/fail based on whether Ollama is installed
        let result = detect_ollama().await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_common_paths() {
        let claude_paths = get_common_claude_code_paths();
        assert!(!claude_paths.is_empty());

        let ollama_paths = get_common_ollama_paths();
        assert!(!ollama_paths.is_empty());
    }

    #[test]
    fn test_installation_instructions() {
        let claude_instructions = get_claude_code_installation_instructions();
        assert!(!claude_instructions.is_empty());
        assert!(claude_instructions.contains("Claude Code"));

        let ollama_instructions = get_ollama_installation_instructions();
        assert!(!ollama_instructions.is_empty());
        assert!(ollama_instructions.contains("Ollama"));
    }

    #[tokio::test]
    async fn test_install_claude_code() {
        let result = install_claude_code().await;
        assert!(result.is_ok());

        let install_result = result.unwrap();
        assert!(!install_result.message.is_empty());
    }
}
