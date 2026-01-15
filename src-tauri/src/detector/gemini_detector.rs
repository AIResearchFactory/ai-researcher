use async_trait::async_trait;
use anyhow::Result;
use std::path::PathBuf;
use std::process::Command;

use super::cli_detector::{CliDetector, CliToolInfo, check_command_in_path, get_home_based_paths};

/// Gemini CLI detector implementation
pub struct GeminiDetector;

impl GeminiDetector {
    pub fn new() -> Self {
        Self
    }
    
    /// Check if Gemini CLI is authenticated
    /// Returns Some(true) if authenticated, Some(false) if not authenticated,
    /// None if unable to determine (network issues, rate limiting, etc.)
    async fn check_auth_status(&self, path: &PathBuf) -> Option<bool> {
        // Try to run a simple command that requires authentication
        // gemini models list or similar command
        let output = Command::new(path.as_os_str())
            .arg("models")
            .arg("list")
            .output();
        
        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let stderr = String::from_utf8_lossy(&out.stderr);
                let combined = format!("{} {}", stdout, stderr).to_lowercase();
                
                // Check exit code first
                if out.status.success() {
                    // Command succeeded - check for authentication errors in output
                    if combined.contains("not authenticated")
                        || combined.contains("api key")
                        || combined.contains("unauthorized")
                        || combined.contains("authentication required") {
                        return Some(false);
                    }
                    // Command succeeded with no auth errors - authenticated
                    return Some(true);
                } else {
                    // Command failed - check if it's an authentication error
                    if combined.contains("not authenticated")
                        || combined.contains("api key")
                        || combined.contains("unauthorized")
                        || combined.contains("authentication required") {
                        return Some(false);
                    }
                    
                    // Check for network/rate limiting issues
                    if combined.contains("network")
                        || combined.contains("timeout")
                        || combined.contains("rate limit")
                        || combined.contains("too many requests")
                        || combined.contains("connection") {
                        return None; // Unable to determine
                    }
                    
                    // Other failure - unable to determine auth status
                    return None;
                }
            }
            Err(_) => {
                // Command execution failed - unable to determine
                None
            }
        }
    }
    
    /// Verify Gemini CLI executable
    async fn verify_executable(&self, path: &PathBuf) -> bool {
        // Check if file exists and is executable
        if !path.exists() {
            return false;
        }
        
        // Try to run --version or --help to verify it's a valid executable
        let output = Command::new(path.as_os_str())
            .arg("--version")
            .output();
        
        if let Ok(out) = output {
            return out.status.success();
        }
        
        // Try --help as fallback
        let output = Command::new(path.as_os_str())
            .arg("--help")
            .output();
        
        if let Ok(out) = output {
            return out.status.success();
        }
        
        false
    }
}

impl Default for GeminiDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl CliDetector for GeminiDetector {
    fn tool_name(&self) -> &str {
        "gemini"
    }
    
    fn command_name(&self) -> &str {
        "gemini"
    }
    
    async fn detect(&self) -> Result<CliToolInfo> {
        log::info!("Detecting Gemini CLI installation...");
        
        let mut gemini_path: Option<PathBuf> = None;
        let mut in_path = false;
        
        // Strategy 1: Check PATH environment variable
        if let Some(path) = check_command_in_path("gemini").await {
            if self.verify_executable(&path).await {
                gemini_path = Some(path);
                in_path = true;
                log::info!("Gemini CLI found in PATH at: {:?}", gemini_path);
            }
        }
        
        // Strategy 2: Check common installation directories
        if gemini_path.is_none() {
            let common_paths = self.get_common_paths();
            for path in common_paths {
                if path.exists() && self.verify_executable(&path).await {
                    gemini_path = Some(path);
                    log::info!("Gemini CLI found at common path: {:?}", gemini_path);
                    break;
                }
            }
        }
        
        // Strategy 3: Shell probe (Mac/Linux only)
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        if gemini_path.is_none() {
            if let Some(path) = super::cli_detector::probe_shell_path("gemini").await {
                if self.verify_executable(&path).await {
                    gemini_path = Some(path);
                    in_path = true;
                    log::info!("Gemini CLI found via shell probe at: {:?}", gemini_path);
                }
            }
        }
        
        // If found, get additional information
        if let Some(path) = &gemini_path {
            let version = self.get_version(path).await;
            let authenticated = self.check_auth_status(path).await;
            
            log::info!(
                "Gemini CLI detected - Version: {:?}, Authenticated: {:?}",
                version,
                authenticated
            );
            
            return Ok(CliToolInfo {
                name: self.tool_name().to_string(),
                installed: true,
                version,
                path: Some(path.clone()),
                in_path,
                running: None,
                authenticated,
                error: None,
            });
        }
        
        log::info!("Gemini CLI not detected");
        Ok(CliToolInfo {
            name: self.tool_name().to_string(),
            installed: false,
            version: None,
            path: None,
            in_path: false,
            running: None,
            authenticated: None,
            error: None,
        })
    }
    
    async fn get_version(&self, path: &PathBuf) -> Option<String> {
        let output = Command::new(path)
            .arg("--version")
            .output()
            .ok()?;
        
        if output.status.success() {
            let version_str = String::from_utf8_lossy(&output.stdout);
            
            // Try to extract version number from output
            // Common formats: "gemini version 1.0.0", "1.0.0", "v1.0.0"
            let version = version_str
                .trim()
                .split_whitespace()
                .last()
                .unwrap_or(version_str.trim())
                .trim_start_matches('v')
                .to_string();
            
            if !version.is_empty() {
                return Some(version);
            }
        }
        
        None
    }
    
    async fn check_authentication(&self) -> Option<bool> {
        // This is called separately if needed
        if let Some(path) = check_command_in_path("gemini").await {
            self.check_auth_status(&path).await
        } else {
            None
        }
    }
    
    fn get_common_paths(&self) -> Vec<PathBuf> {
        let mut paths = Vec::new();
        
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        {
            // Home-based paths
            paths.extend(get_home_based_paths(&[
                ".local/bin/gemini",
                ".npm-global/bin/gemini",
                "bin/gemini",
                ".cargo/bin/gemini",
                "go/bin/gemini",
            ]));
            
            // System paths
            paths.push(PathBuf::from("/usr/local/bin/gemini"));
            paths.push(PathBuf::from("/opt/homebrew/bin/gemini"));
            paths.push(PathBuf::from("/usr/bin/gemini"));
            paths.push(PathBuf::from("/opt/gemini/bin/gemini"));
        }
        
        #[cfg(target_os = "windows")]
        {
            if let Ok(app_data) = std::env::var("LOCALAPPDATA") {
                paths.push(PathBuf::from(&app_data).join("Programs\\Gemini\\gemini.exe"));
                paths.push(PathBuf::from(&app_data).join("npm\\gemini.cmd"));
                paths.push(PathBuf::from(&app_data).join("Google\\Gemini\\gemini.exe"));
            }
            
            if let Ok(program_files) = std::env::var("ProgramFiles") {
                paths.push(PathBuf::from(&program_files).join("Gemini\\gemini.exe"));
                paths.push(PathBuf::from(&program_files).join("Google\\Gemini\\gemini.exe"));
            }
            
            if let Ok(user_profile) = std::env::var("USERPROFILE") {
                paths.push(PathBuf::from(&user_profile).join(".local\\bin\\gemini.exe"));
            }
        }
        
        paths
    }
    
    fn get_installation_instructions(&self) -> String {
        #[cfg(target_os = "macos")]
        {
            r#"To install Gemini CLI, please follow these steps:

1. Visit the Google AI Studio: https://aistudio.google.com/
2. Generate an API key if you haven't already
3. Install the Gemini CLI using one of these methods:

   Option A - Using pip (recommended):
   pip install google-generativeai
   
   Option B - Using npm:
   npm install -g @google/generative-ai
   
   Option C - Download from official source:
   https://ai.google.dev/gemini-api/docs/quickstart

4. Configure authentication:
   export GEMINI_API_KEY="your-api-key-here"
   
   Or add to your ~/.zshrc or ~/.bashrc:
   echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.zshrc

5. Verify installation:
   gemini --version
   gemini models list

6. Restart this application

After installation, Gemini CLI will be available in your PATH."#.to_string()
        }
        
        #[cfg(target_os = "linux")]
        {
            r#"To install Gemini CLI, please follow these steps:

1. Visit the Google AI Studio: https://aistudio.google.com/
2. Generate an API key if you haven't already
3. Install the Gemini CLI using one of these methods:

   Option A - Using pip (recommended):
   pip install google-generativeai
   
   Option B - Using npm:
   npm install -g @google/generative-ai
   
   Option C - Download from official source:
   https://ai.google.dev/gemini-api/docs/quickstart

4. Configure authentication:
   export GEMINI_API_KEY="your-api-key-here"
   
   Or add to your ~/.bashrc:
   echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.bashrc

5. Verify installation:
   gemini --version
   gemini models list

6. Restart this application

After installation, Gemini CLI will be available in your PATH."#.to_string()
        }
        
        #[cfg(target_os = "windows")]
        {
            r#"To install Gemini CLI, please follow these steps:

1. Visit the Google AI Studio: https://aistudio.google.com/
2. Generate an API key if you haven't already
3. Install the Gemini CLI using one of these methods:

   Option A - Using pip (recommended):
   pip install google-generativeai
   
   Option B - Using npm:
   npm install -g @google/generative-ai
   
   Option C - Download from official source:
   https://ai.google.dev/gemini-api/docs/quickstart

4. Configure authentication:
   Set environment variable in PowerShell:
   $env:GEMINI_API_KEY="your-api-key-here"
   
   Or set permanently in System Environment Variables:
   - Open System Properties > Environment Variables
   - Add new variable: GEMINI_API_KEY = your-api-key-here

5. Verify installation:
   gemini --version
   gemini models list

6. Restart this application

After installation, Gemini CLI will be added to your system PATH."#.to_string()
        }
        
        #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
        {
            "Please visit https://ai.google.dev/gemini-api/docs/quickstart for installation instructions for your operating system.".to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_gemini_detector_metadata() {
        let detector = GeminiDetector::new();
        assert_eq!(detector.tool_name(), "gemini");
        assert_eq!(detector.command_name(), "gemini");
    }
    
    #[test]
    fn test_common_paths_not_empty() {
        let detector = GeminiDetector::new();
        let paths = detector.get_common_paths();
        assert!(!paths.is_empty());
    }
    
    #[test]
    fn test_installation_instructions() {
        let detector = GeminiDetector::new();
        let instructions = detector.get_installation_instructions();
        assert!(!instructions.is_empty());
        assert!(instructions.contains("Gemini"));
        assert!(instructions.contains("API key"));
    }
    
    #[tokio::test]
    async fn test_detect_returns_result() {
        let detector = GeminiDetector::new();
        let result = detector.detect().await;
        assert!(result.is_ok());
        
        let info = result.unwrap();
        assert_eq!(info.name, "gemini");
    }
}

// Made with Bob
