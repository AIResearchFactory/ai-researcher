use crate::services::file_service::FileService;
use crate::services::project_service::ProjectService;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchMatch {
    pub file_name: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

#[tauri::command]
pub async fn read_markdown_file(project_id: String, file_name: String) -> Result<String, String> {
    FileService::read_file(&project_id, &file_name)
        .map_err(|e| format!("Failed to read file '{}': {}", file_name, e))
}

#[tauri::command]
pub async fn write_markdown_file(project_id: String, file_name: String, content: String) -> Result<(), String> {
    FileService::write_file(&project_id, &file_name, &content)
        .map_err(|e| format!("Failed to write file '{}': {}", file_name, e))
}

#[tauri::command]
pub async fn delete_markdown_file(project_id: String, file_name: String) -> Result<(), String> {
    FileService::delete_file(&project_id, &file_name)
        .map_err(|e| format!("Failed to delete file '{}': {}", file_name, e))
}

#[tauri::command]
pub async fn search_in_files(
    project_id: String,
    search_text: String,
    case_sensitive: bool,
    use_regex: bool,
) -> Result<Vec<SearchMatch>, String> {
    // Get all markdown files in the project
    let files = ProjectService::list_project_files(&project_id)
        .map_err(|e| format!("Failed to list project files: {}", e))?;
    
    let mut matches = Vec::new();
    
    for file_name in files {
        // Skip hidden files
        if file_name.starts_with('.') {
            continue;
        }
        
        // Read file content
        let content = match FileService::read_file(&project_id, &file_name) {
            Ok(c) => c,
            Err(_) => continue, // Skip files that can't be read
        };
        
        // Search in content
        for (line_num, line) in content.lines().enumerate() {
            let search_line = if case_sensitive { line.to_string() } else { line.to_lowercase() };
            let search_term = if case_sensitive { search_text.clone() } else { search_text.to_lowercase() };
            
            if use_regex {
                // Simple regex support
                if let Ok(re) = regex::Regex::new(&search_term) {
                    if let Some(mat) = re.find(&search_line) {
                        matches.push(SearchMatch {
                            file_name: file_name.clone(),
                            line_number: line_num + 1,
                            line_content: line.to_string(),
                            match_start: mat.start(),
                            match_end: mat.end(),
                        });
                    }
                }
            } else {
                // Simple text search
                if let Some(pos) = search_line.find(&search_term) {
                    matches.push(SearchMatch {
                        file_name: file_name.clone(),
                        line_number: line_num + 1,
                        line_content: line.to_string(),
                        match_start: pos,
                        match_end: pos + search_term.len(),
                    });
                }
            }
        }
    }
    
    Ok(matches)
}

#[tauri::command]
pub async fn replace_in_files(
    project_id: String,
    search_text: String,
    replace_text: String,
    case_sensitive: bool,
    file_names: Vec<String>,
) -> Result<usize, String> {
    let mut total_replacements = 0;
    
    for file_name in file_names {
        // Read file content
        let content = FileService::read_file(&project_id, &file_name)
            .map_err(|e| format!("Failed to read file '{}': {}", file_name, e))?;
        
        // Perform replacement
        let new_content = if case_sensitive {
            content.replace(&search_text, &replace_text)
        } else {
            // Case-insensitive replacement is more complex
            let search_lower = search_text.to_lowercase();
            let mut result = String::new();
            let mut last_end = 0;
            
            for (idx, _) in content.to_lowercase().match_indices(&search_lower) {
                result.push_str(&content[last_end..idx]);
                result.push_str(&replace_text);
                last_end = idx + search_text.len();
            }
            result.push_str(&content[last_end..]);
            result
        };
        
        // Count replacements
        let replacements = (content.len() as i32 - new_content.len() as i32).abs() /
                          (search_text.len() as i32 - replace_text.len() as i32).max(1);
        total_replacements += replacements.max(0) as usize;
        
        // Write back if changed
        if content != new_content {
            FileService::write_file(&project_id, &file_name, &new_content)
                .map_err(|e| format!("Failed to write file '{}': {}", file_name, e))?;
        }
    }
    
    Ok(total_replacements)
}
