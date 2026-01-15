use anyhow::{Result, Context};
use crate::services::project_service::ProjectService;
use crate::services::file_service::FileService;

pub struct ContextService;

impl ContextService {
    /// Gather project context as a formatted string
    pub fn get_project_context(project_id: &str) -> Result<String> {
        let mut context = String::from("# Project Context\n\n");

        // 1. Add Project Metadata
        let project = ProjectService::load_project_by_id(project_id)
            .context("Failed to load project for context injection")?;
        
        context.push_str(&format!("**Project Name**: {}\n", project.name));
        context.push_str(&format!("**Project Goal**: {}\n\n", project.goal));

        // 2. Add README content if it exists
        if let Ok(readme) = FileService::read_file(project_id, "README.md") {
            context.push_str("## README.md\n\n");
            context.push_str(&readme);
            context.push_str("\n\n");
        }

        // 3. Add Research Log (Last 5 entries to give context of what happened)
        if let Ok(log) = FileService::read_file(project_id, "research_log.md") {
            context.push_str("## Recent Research History (from research_log.md)\n\n");
            // Just take the tail for now to avoid token overflow
            let lines: Vec<&str> = log.lines().collect();
            let tail = if lines.len() > 50 {
                lines[lines.len() - 50..].join("\n")
            } else {
                log
            };
            context.push_str(&tail);
            context.push_str("\n\n");
        }

        // 4. Add list of other files with summaries (first 10 lines)
        if let Ok(files) = ProjectService::list_project_files(project_id) {
            context.push_str("## Project Files Overview & Previews\n");
            for file in files {
                if file != "README.md" && file != "research_log.md" && !file.starts_with('.') {
                    context.push_str(&format!("### File: {}\n", file));
                    if let Ok(content) = FileService::read_file(project_id, &file) {
                        // Detect extension for markdown fence
                        let ext = std::path::Path::new(&file)
                            .extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("text");

                        // Take first 10 lines as a preview
                        let preview: String = content.lines().take(10).collect::<Vec<_>>().join("\n");
                        context.push_str(&format!("```{}\n", ext));
                        context.push_str(&preview);
                        context.push_str("\n[...]\n```\n\n");
                    } else {
                        context.push_str("- (Unable to read content)\n");
                    }
                }
            }
        }

        Ok(context)
    }
}
