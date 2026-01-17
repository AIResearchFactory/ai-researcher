use std::process::Command;
use std::env;

/// Fix the PATH environment variable on macOS when running as a bundled app.
/// GUI apps on macOS don't inherit the shell PATH, which breaks CLI tool detection.
#[cfg(target_os = "macos")]
pub fn fix_macos_env() {
    // If PATH already looks like it has homebrew/common paths, skip
    if let Ok(path) = env::var("PATH") {
        if path.contains("/opt/homebrew/bin") || path.contains("/usr/local/bin") {
             // Path might already be fixed or inherited from terminal
             return;
        }
    }

    let shell = env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    
    // Run login shell to get the full path
    let output = Command::new(shell)
        .arg("-l")
        .arg("-c")
        .arg("echo $PATH")
        .output();
        
    if let Ok(out) = output {
        if out.status.success() {
            let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path.is_empty() {
                log::info!("Fixed macOS PATH environment: {}", path);
                env::set_var("PATH", path);
            }
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub fn fix_macos_env() {}
