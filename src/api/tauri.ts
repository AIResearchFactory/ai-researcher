import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Type definitions
export interface GlobalSettings {
  claude_api_key?: string;
  model?: string;
  theme?: string;
  notifications_enabled?: boolean;
  data_directory?: string;
}

export interface ProjectSettings {
  name: string;
  description?: string;
  auto_save?: boolean;
  encryption_enabled?: boolean;
}

export interface Project {
  id: string;
  name: string;
  goal: string;
  skills: string[];
  created_at: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface Secrets {
  claude_api_key?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  template: string;
  category: string;
}

// Installation types
export interface InstallationConfig {
  app_data_path: string;
  is_first_install: boolean;
  claude_code_detected: boolean;
  ollama_detected: boolean;
}

export interface ClaudeCodeInfo {
  installed: boolean;
  version?: string;
  path?: string;
  in_path: boolean;
}

export interface OllamaInfo {
  installed: boolean;
  version?: string;
  path?: string;
  running: boolean;
  in_path: boolean;
}

export interface InstallationProgress {
  stage: 'initializing' | 'selecting_directory' | 'creating_structure' | 'detecting_dependencies' | 'installing_claude_code' | 'installing_ollama' | 'finalizing' | 'complete' | 'error';
  message: string;
  progress_percentage: number;
}

export interface InstallationResult {
  success: boolean;
  config: InstallationConfig;
  claude_code_info?: ClaudeCodeInfo;
  ollama_info?: OllamaInfo;
  error_message?: string;
}

// Update types
export interface UpdateResult {
  success: boolean;
  backup_created: boolean;
  backup_path?: string;
  files_updated: string[];
  structure_verified: boolean;
  message: string;
}

// Configuration types
export interface AppConfig {
  app_data_directory: string;
  installation_date: string;
  version: string;
  claude_code_enabled: boolean;
  ollama_enabled: boolean;
  claude_code_path?: string;
  ollama_path?: string;
  last_update_check?: string;
}

export const tauriApi = {
  // Settings
  async getGlobalSettings(): Promise<GlobalSettings> {
    return await invoke('get_global_settings');
  },

  async saveGlobalSettings(settings: GlobalSettings): Promise<void> {
    return await invoke('save_global_settings', { settings });
  },

  async getProjectSettings(projectId: string): Promise<ProjectSettings> {
    return await invoke('get_project_settings', { projectId });
  },

  async saveProjectSettings(projectId: string, settings: ProjectSettings): Promise<void> {
    return await invoke('save_project_settings', { projectId, settings });
  },

  // Projects
  async getAllProjects(): Promise<Project[]> {
    return await invoke('get_all_projects');
  },

  async getProject(projectId: string): Promise<Project> {
    return await invoke('get_project', { projectId });
  },

  async createProject(name: string, goal: string, skills: string[]): Promise<Project> {
    return await invoke('create_project', { name, goal, skills });
  },

  async getProjectFiles(projectId: string): Promise<string[]> {
    return await invoke('get_project_files', { projectId });
  },

  // Files
  async readMarkdownFile(projectId: string, fileName: string): Promise<string> {
    return await invoke('read_markdown_file', { projectId, fileName });
  },

  async writeMarkdownFile(projectId: string, fileName: string, content: string): Promise<void> {
    return await invoke('write_markdown_file', { projectId, fileName, content });
  },

  async deleteMarkdownFile(projectId: string, fileName: string): Promise<void> {
    return await invoke('delete_markdown_file', { projectId, fileName });
  },

  // Chat
  async sendChatMessage(
    messages: ChatMessage[],
    projectId?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    // Listen for streaming chunks
    const unlisten = await listen('chat-chunk', (event: any) => {
      if (onChunk && event.payload && event.payload.chunk) {
        onChunk(event.payload.chunk);
      }
    });

    try {
      const fileName = await invoke('send_chat_message', {
        request: {
          messages,
          project_id: projectId,
          system_prompt: null,
          skill_id: null,
          skill_params: null
        }
      });
      return fileName as string;
    } finally {
      unlisten();
    }
  },

  async loadChatHistory(projectId: string, chatFile: string): Promise<ChatMessage[]> {
    return await invoke('load_chat_history', { projectId, chatFile });
  },

  async getChatFiles(projectId: string): Promise<string[]> {
    return await invoke('get_chat_files', { projectId });
  },

  // Secrets
  async getSecrets(): Promise<Secrets> {
    return await invoke('get_secrets');
  },

  async saveSecrets(secrets: Secrets): Promise<void> {
    return await invoke('save_secrets', { secrets });
  },

  async hasClaudeApiKey(): Promise<boolean> {
    return await invoke('has_claude_api_key');
  },

  // Event listeners
  async onProjectAdded(callback: (project: Project) => void): Promise<() => void> {
    return await listen('project-added', (event) => {
      callback(event.payload as Project);
    });
  },

  async onProjectModified(callback: (projectId: string) => void): Promise<() => void> {
    return await listen('project-modified', (event) => {
      callback(event.payload as string);
    });
  },

  async onProjectRemoved(callback: (projectId: string) => void): Promise<() => void> {
    return await listen('project-removed', (event) => {
      callback(event.payload as string);
    });
  },

  // Skills
  async getAllSkills(): Promise<Skill[]> {
    return await invoke('get_all_skills');
  },

  async getSkill(skillId: string): Promise<Skill> {
    return await invoke('get_skill', { skillId });
  },

  async createSkill(name: string, description: string, template: string, category: string): Promise<Skill> {
    return await invoke('create_skill', { name, description, template, category });
  },

  async updateSkill(skill: Skill): Promise<void> {
    return await invoke('update_skill', { skill });
  },

  async deleteSkill(skillId: string): Promise<void> {
    return await invoke('delete_skill', { skillId });
  },

  // Installation
  async checkInstallationStatus(): Promise<InstallationConfig> {
    return await invoke('check_installation_status');
  },

  async detectClaudeCode(): Promise<ClaudeCodeInfo | null> {
    return await invoke('detect_claude_code');
  },

  async detectOllama(): Promise<OllamaInfo | null> {
    return await invoke('detect_ollama');
  },

  async getClaudeCodeInstallInstructions(): Promise<string> {
    return await invoke('get_claude_code_install_instructions');
  },

  async getOllamaInstallInstructions(): Promise<string> {
    return await invoke('get_ollama_install_instructions');
  },

  async runInstallation(onProgress?: (progress: InstallationProgress) => void): Promise<InstallationResult> {
    // Listen for installation progress events
    let unlisten: (() => void) | undefined;

    if (onProgress) {
      unlisten = await listen('installation-progress', (event) => {
        onProgress(event.payload as InstallationProgress);
      });
    }

    try {
      const result = await invoke('run_installation');
      return result as InstallationResult;
    } finally {
      if (unlisten) {
        unlisten();
      }
    }
  },

  async verifyDirectoryStructure(): Promise<boolean> {
    return await invoke('verify_directory_structure');
  },

  async redetectDependencies(): Promise<InstallationConfig> {
    return await invoke('redetect_dependencies');
  },

  async backupInstallation(): Promise<string> {
    return await invoke('backup_installation');
  },

  async cleanupOldBackups(keepCount: number): Promise<string> {
    return await invoke('cleanup_old_backups', { keepCount });
  },

  async isFirstInstall(): Promise<boolean> {
    return await invoke('is_first_install');
  },

  // Update operations
  async runUpdateProcess(): Promise<UpdateResult> {
    return await invoke('run_update_process');
  },

  async checkAndPreserveStructure(): Promise<UpdateResult> {
    return await invoke('check_and_preserve_structure');
  },

  async backupUserData(): Promise<string> {
    return await invoke('backup_user_data');
  },

  async verifyInstallationIntegrity(): Promise<boolean> {
    return await invoke('verify_installation_integrity');
  },

  async restoreFromBackup(backupPath: string): Promise<void> {
    return await invoke('restore_from_backup', { backupPath });
  },

  async listBackups(): Promise<string[]> {
    return await invoke('list_backups');
  },

  // Configuration operations
  async getAppConfig(): Promise<AppConfig | null> {
    return await invoke('get_app_config');
  },

  async saveAppConfig(config: AppConfig): Promise<void> {
    return await invoke('save_app_config', { config });
  },

  async configExists(): Promise<boolean> {
    return await invoke('config_exists');
  },

  async updateClaudeCodeConfig(enabled: boolean, path?: string): Promise<AppConfig> {
    return await invoke('update_claude_code_config', { enabled, path });
  },

  async updateOllamaConfig(enabled: boolean, path?: string): Promise<AppConfig> {
    return await invoke('update_ollama_config', { enabled, path });
  },

  async updateLastCheck(): Promise<AppConfig> {
    return await invoke('update_last_check');
  },

  async resetConfig(): Promise<void> {
    return await invoke('reset_config');
  }
};
