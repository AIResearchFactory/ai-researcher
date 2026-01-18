use crate::models::ai::{Message, ChatResponse, ProviderType};
use crate::services::ai_service::AIService;
use crate::services::research_log_service::ResearchLogService;
use crate::services::output_parser_service::OutputParserService;
use crate::services::chat_service::ChatService;
use crate::services::context_service::ContextService;
use crate::services::skill_service::SkillService;
use crate::models::chat::ChatMessage;
use anyhow::{Result, Context};
use std::sync::Arc;
use std::collections::HashMap;

pub struct AgentOrchestrator {
    ai_service: Arc<AIService>,
}

impl AgentOrchestrator {
    pub fn new(ai_service: Arc<AIService>) -> Self {
        Self { ai_service }
    }

    /// Primary entry point for sending a message and handling all side effects
    pub async fn run_agent_loop(
        &self,
        messages: Vec<Message>,
        system_prompt: Option<String>,
        project_id: Option<String>,
        skill_id: Option<String>,
        skill_params: Option<HashMap<String, String>>,
    ) -> Result<ChatResponse> {
        let mut final_system_prompt = system_prompt.unwrap_or_else(|| "You are a helpful AI research assistant.".to_string());

        // 0a. Skill Injection
        if let Some(ref sid) = skill_id {
            if let Ok(skill) = SkillService::load_skill(sid) {
                let params = skill_params.unwrap_or_default();
                if let Ok(rendered_skill) = skill.render_prompt(params) {
                    final_system_prompt.push_str("\n\n---\n");
                    final_system_prompt.push_str("SKILL INSTRUCTIONS:\n");
                    final_system_prompt.push_str(&rendered_skill);
                }
            }
        }

        // 0b. Context Injection (Stage C)
        if let Some(ref pid) = project_id {
            if let Ok(project_context) = ContextService::get_project_context(pid) {
                // Inject the gathered context
                final_system_prompt.push_str("\n\n---\n");
                final_system_prompt.push_str("AUTOMATIC CONTEXT INJECTION (Project Files & History):\n");
                final_system_prompt.push_str(&project_context);
            }
        }

        // 1. Execute the AI call
        let chat_result = self.ai_service.chat(messages.clone(), Some(final_system_prompt)).await;

        // 2. Handle metadata & logging (The "Observer" logic)
        if let Some(ref pid) = project_id {
            let provider_type = self.ai_service.get_active_provider_type().await;
            let provider_name = format!("{:?}", provider_type);

            match &chat_result {
                Ok(response) => {
                    // Log success
                    let _ = ResearchLogService::log_event(pid, &provider_name, None, &response.content);

                    // Save chat history
                    self.save_history(pid, messages, &response.content).await?;

                    // Apply file changes if CLI provider
                    if provider_type == ProviderType::GeminiCli || provider_type == ProviderType::ClaudeCode {
                        let changes = OutputParserService::parse_file_changes(&response.content);
                        if !changes.is_empty() {
                            OutputParserService::apply_changes(pid, &changes)?;
                        }
                    }
                }
                Err(e) => {
                    // Log error
                    let _ = ResearchLogService::log_event(pid, &provider_name, None, &format!("ERROR: {}", e));
                }
            }
        }

        chat_result.context("Failed to get response from AI agent")
    }

    async fn save_history(&self, project_id: &str, user_messages: Vec<Message>, assistant_content: &str) -> Result<()> {
        let mut all_messages = user_messages;
        all_messages.push(Message {
            role: "assistant".to_string(),
            content: assistant_content.to_string(),
        });
        
        let chat_messages: Vec<ChatMessage> = all_messages.into_iter().map(|m| ChatMessage {
            role: m.role,
            content: m.content,
        }).collect();

        ChatService::save_chat_to_file(project_id, chat_messages, "UnifiedAI").await?;
        Ok(())
    }
}
