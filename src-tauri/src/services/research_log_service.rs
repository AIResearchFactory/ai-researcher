use anyhow::{Context, Result};
use chrono::Utc;
use std::fs;
use std::path::PathBuf;
use crate::services::project_service::ProjectService;
use std::fs::OpenOptions;
use std::io::Write;

pub struct ResearchLogService;

impl ResearchLogService {
    /// Append a log entry to research_log.md in the project directory
    pub fn log_event(project_id: &str, provider_name: &str, command: Option<&str>, content: &str) -> Result<()> {
        let project = ProjectService::load_project_by_id(project_id)
            .context("Failed to load project for logging")?;
        
        let log_path = project.path.join("research_log.md");
        
        // Ensure file exists with header if it doesn't
        if !log_path.exists() {
            fs::write(&log_path, format!("# Research Log: {}\n\nThis file tracks automatic agent interactions and observations.\n\n", project.name))?;
        }

        let mut file = OpenOptions::new()
            .append(true)
            .open(&log_path)
            .context("Failed to open research_log.md for appending")?;

        let timestamp = Utc::now().to_rfc3339();
        
        writeln!(file, "---")?;
        writeln!(file, "### Interaction: {}", timestamp)?;
        writeln!(file, "**Provider**: {}", provider_name)?;
        if let Some(cmd) = command {
            writeln!(file, "**Command**: `{}`", cmd)?;
        }
        writeln!(file, "\n#### Agent Output:\n")?;
        writeln!(file, "{}", content)?;
        writeln!(file, "\n")?;

        Ok(())
    }
}
