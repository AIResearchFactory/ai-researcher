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
pub async fn update_skill(skill: Skill) -> Result<(), String> {
    SkillService::update_skill(&skill)
        .map_err(|e| e.to_string())
}
