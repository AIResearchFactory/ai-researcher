use crate::models::skill::{Skill, SkillCategory};
use crate::services::skill_service::SkillService;
use std::collections::HashMap;

#[tauri::command]
pub async fn get_all_skills() -> Result<Vec<Skill>, String> {
    SkillService::get_all_skills()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_skill(skill_id: String) -> Result<Skill, String> {
    SkillService::get_skill(&skill_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_skill(skill: Skill) -> Result<(), String> {
    SkillService::save_skill(&skill)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_skill(skill_id: String) -> Result<(), String> {
    SkillService::delete_skill(&skill_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_skill_template(
    skill_id: String,
    name: String,
    description: String,
    category: SkillCategory,
) -> Result<Skill, String> {
    // Convert SkillCategory to capabilities vector
    let capabilities = match category {
        SkillCategory::Research => vec!["research".to_string(), "analysis".to_string()],
        SkillCategory::Development => vec!["coding".to_string(), "development".to_string()],
        SkillCategory::Writing => vec!["writing".to_string(), "content".to_string()],
        SkillCategory::Analysis => vec!["analysis".to_string(), "data".to_string()],
        SkillCategory::Other => vec!["general".to_string()],
    };

    let skill = SkillService::create_skill_template(
        skill_id,
        name,
        description,
        capabilities,
    );

    Ok(skill)
}

#[tauri::command]
pub async fn get_skills_by_category(category: SkillCategory) -> Result<Vec<Skill>, String> {
    // Convert SkillCategory to string for filtering
    let category_str = match category {
        SkillCategory::Research => "research",
        SkillCategory::Development => "development",
        SkillCategory::Writing => "writing",
        SkillCategory::Analysis => "analysis",
        SkillCategory::Other => "general",
    };

    SkillService::get_skills_by_category(category_str)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn render_skill_prompt(
    skill_id: String,
    params: HashMap<String, String>,
) -> Result<String, String> {
    let skill = SkillService::get_skill(&skill_id)
        .map_err(|e| e.to_string())?;

    skill.render_prompt(params)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn validate_skill(skill: Skill) -> Result<Vec<String>, String> {
    match skill.validate() {
        Ok(_) => Ok(Vec::new()),
        Err(errors) => Ok(errors),
    }
}

// ===== Backward Compatibility Commands =====
// These commands maintain backward compatibility with existing frontend code

#[tauri::command]
pub async fn create_skill(
    name: String,
    description: String,
    prompt_template: String,
    capabilities: Vec<String>,
) -> Result<Skill, String> {
    SkillService::create_skill(&name, &description, &prompt_template, capabilities)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_skill(skill_name: String) -> Result<Skill, String> {
    log::info!("Importing skill: {}", skill_name);
    
    // Create a temporary directory using tempfile crate
    let temp_dir = tempfile::tempdir()
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    log::info!("Using temp dir: {:?}", temp_dir.path());

    // Execute npx skills add
    let output = std::process::Command::new("npx")
        .arg("skills")
        .arg("add")
        .arg(&skill_name)
        .arg("--path")
        .arg(temp_dir.path())
        .output()
        .map_err(|e| format!("Failed to execute npx: {}. Make sure Node.js and npx are installed.", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        log::error!("npx failed: {}", stderr);
        return Err(format!("Failed to import skill '{}': {}", skill_name, stderr));
    }

    // Find the downloaded markdown file
    let mut skill_file = None;
    for entry in std::fs::read_dir(temp_dir.path()).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            skill_file = Some(path);
            break;
        }
    }

    let skill_path = skill_file.ok_or_else(|| "No skill file found in downloaded content".to_string())?;
    log::info!("Found skill file: {:?}", skill_path);

    // Read the markdown content
    let content = std::fs::read_to_string(&skill_path).map_err(|e| e.to_string())?;
    
    // Parse basic metadata from markdown (name, description)
    // Extract from frontmatter or first heading
    let name = skill_name.to_string();
    let description = format!("Imported skill: {}", skill_name);
    
    // Use the skill_name as ID (sanitized)
    let skill_id = skill_name
        .to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect::<String>();

    // Create the skill using SkillService
    // This will handle saving both the markdown and JSON sidecar
    let skill = SkillService::create_skill(
        &name,
        &description,
        &content, // Use the full imported content as the template
        vec!["imported".to_string()], // Default capability
    ).map_err(|e| e.to_string())?;

    log::info!("Successfully imported skill: {}", skill_id);
    
    Ok(skill)
}

// Helper function to parse metadata from imported skill markdown
fn parse_imported_skill_metadata(content: &str) -> Result<(String, String), String> {
    let lines: Vec<&str> = content.lines().collect();
    
    // Try to find the title (first # heading)
    let name = lines.iter()
        .find(|line| line.trim().starts_with("# "))
        .map(|line| line.trim().trim_start_matches("# ").trim().to_string())
        .unwrap_or_else(|| "Imported Skill".to_string());
    
    // Try to find description (first paragraph after title)
    let mut description = String::new();
    let mut found_title = false;
    for line in lines.iter() {
        if line.trim().starts_with("# ") {
            found_title = true;
            continue;
        }
        if found_title && !line.trim().is_empty() && !line.trim().starts_with("#") {
            description = line.trim().to_string();
            break;
        }
    }
    
    if description.is_empty() {
        description = "Imported skill from registry".to_string();
    }
    
    Ok((name, description))
}
