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
    const unlisten = await listen('chat-chunk', (event) => {
      if (onChunk) onChunk(event.payload as string);
    });

    try {
      const fileName = await invoke('send_chat_message', {
        request: { messages, projectId }
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
  }
};
