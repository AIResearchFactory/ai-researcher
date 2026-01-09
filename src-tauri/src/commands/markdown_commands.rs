use crate::services::markdown_service::{MarkdownService, TocEntry};

/// Render markdown to HTML
#[tauri::command]
pub async fn render_markdown_to_html(markdown: String) -> Result<String, String> {
    Ok(MarkdownService::render_to_html(&markdown))
}

#[tauri::command]
pub async fn extract_markdown_links(markdown: String) -> Result<Vec<String>, String> {
    Ok(MarkdownService::extract_links(&markdown))
}

/// Generate table of contents from markdown
#[tauri::command]
pub async fn generate_markdown_toc(markdown: String) -> Result<Vec<TocEntry>, String> {
    Ok(MarkdownService::generate_toc(&markdown))
}
