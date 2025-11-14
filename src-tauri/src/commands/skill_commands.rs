use crate::models::skill::Skill;
use crate::services::skill_service::SkillService;

#[tauri::command]
pub async fn get_all_skills() -> Result<Vec<Skill>, String> {
    SkillService::get_all_skills()
        .map_err(|e| format!("Failed to load skills: {}", e))
}

#[tauri::command]
pub async fn get_skill(skill_id: String) -> Result<Skill, String> {
    SkillService::get_skill(&skill_id)
        .map_err(|e| format!("Failed to load skill: {}", e))
}

#[tauri::command]
pub async fn create_skill(
    name: String,
    description: String,
    template: String,
    category: String,
) -> Result<Skill, String> {
    SkillService::create_skill(&name, &description, &template, &category)
        .map_err(|e| format!("Failed to create skill: {}", e))
}

#[tauri::command]
pub async fn update_skill(skill: Skill) -> Result<(), String> {
    SkillService::update_skill(&skill)
        .map_err(|e| format!("Failed to update skill: {}", e))
}

#[tauri::command]
pub async fn delete_skill(skill_id: String) -> Result<(), String> {
    SkillService::delete_skill(&skill_id)
        .map_err(|e| format!("Failed to delete skill: {}", e))
}
