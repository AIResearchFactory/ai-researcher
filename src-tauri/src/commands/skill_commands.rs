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
    log::info!("Importing skill with args: {}", skill_name);
    
    // Create a temporary directory using tempfile crate
    let temp_dir = tempfile::tempdir()
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    log::info!("Using temp dir: {:?}", temp_dir.path());

    // Prepare the command
    let mut cmd = std::process::Command::new("npx");
    cmd.arg("skills").arg("add");
    
    // Split the input into individual arguments
    // We expect the input to be the part after "npx skills add" or the whole command
    let clean_input = if skill_name.starts_with("npx skills add ") {
        skill_name.trim_start_matches("npx skills add ").to_string()
    } else {
        skill_name.clone()
    };

    let args: Vec<&str> = clean_input.split_whitespace().collect();
    for arg in &args {
        cmd.arg(arg);
    }
    
    cmd.arg("--path").arg(temp_dir.path());

    // Execute the command
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute npx: {}. Make sure Node.js and npx are installed.", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        log::error!("npx failed: {}", stderr);
        return Err(format!("Failed to import skill: {}", stderr));
    }

    // Identify the skill name for our local metadata
    // Try to find it after --skill or use the last arg if it doesn't look like a URL
    let mut extracted_name = "Imported Skill".to_string();
    for i in 0..args.len() {
        if args[i] == "--skill" && i + 1 < args.len() {
            extracted_name = args[i+1].to_string();
            break;
        }
    }
    
    if extracted_name == "Imported Skill" && !args.is_empty() {
        // If no --skill, check the first arg (often the name or URL)
        let first = args[0];
        if !first.starts_with("http") && !first.contains('/') {
            extracted_name = first.to_string();
        } else {
            // It's a URL, maybe the skill name is in the tail?
            if let Some(pos) = first.rfind('/') {
                extracted_name = first[pos+1..].to_string();
            }
        }
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
    
    // Parse metadata from markdown if possible
    let (name, description) = parse_imported_skill_metadata(&content).unwrap_or((extracted_name, "Imported skill from registry".to_string()));
    
    // Create the skill using SkillService
    let skill = SkillService::create_skill(
        &name,
        &description,
        &content,
        vec!["imported".to_string()],
    ).map_err(|e| e.to_string())?;

    log::info!("Successfully imported skill: {} (ID: {})", name, skill.id);
    
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
