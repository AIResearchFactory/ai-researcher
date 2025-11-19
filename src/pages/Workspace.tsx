
import React, { useState, useEffect } from 'react';
import TopBar from '../components/workspace/TopBar';
import Sidebar from '../components/workspace/Sidebar';
import MainPanel from '../components/workspace/MainPanel';
import Onboarding from './Onboarding';
import MenuBar from '../components/workspace/MenuBar';
import { tauriApi } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mock data embedded directly
const mockProjects = [
  {
    id: 'project-alpha',
    name: 'Project Alpha',
    description: 'AI-powered research on machine learning algorithms',
    created: '2025-01-15',
    documents: [
      {
        id: 'chat-001',
        name: 'chat-001.md',
        type: 'chat',
        content: '# Chat Session 1\n\n**User:** Tell me about transformers in NLP\n\n**Assistant:** Transformers are...'
      },
      {
        id: 'research-notes',
        name: 'research-notes.md',
        type: 'document',
        content: '# Research Notes\n\n## Overview\n\nThis document contains my findings on...\n\n## Key Insights\n\n- Point 1\n- Point 2\n- Point 3\n\n## References\n\n1. Paper A\n2. Paper B'
      },
      {
        id: 'analysis',
        name: 'analysis.md',
        type: 'document',
        content: '# Data Analysis\n\n## Methodology\n\nWe used the following approach...\n\n```python\nimport pandas as pd\nimport numpy as np\n\n# Analysis code here\n```\n\n## Results\n\nThe results show...'
      }
    ]
  },
  {
    id: 'project-beta',
    name: 'Project Beta',
    description: 'Competitive analysis and market research',
    created: '2025-01-20',
    documents: [
      {
        id: 'chat-002',
        name: 'chat-002.md',
        type: 'chat',
        content: '# Chat Session 2\n\n**User:** Analyze the competitive landscape\n\n**Assistant:** Based on the research...'
      },
      {
        id: 'market-analysis',
        name: 'market-analysis.md',
        type: 'document',
        content: '# Market Analysis\n\n## Executive Summary\n\nThe market shows strong growth...\n\n## Competitors\n\n### Company A\n- Strengths\n- Weaknesses\n\n### Company B\n- Strengths\n- Weaknesses'
      }
    ]
  },
  {
    id: 'project-gamma',
    name: 'Project Gamma',
    description: 'Technical documentation and code review',
    created: '2025-01-25',
    documents: [
      {
        id: 'architecture',
        name: 'architecture.md',
        type: 'document',
        content: '# System Architecture\n\n## Components\n\n### Frontend\n- React\n- TypeScript\n\n### Backend\n- Rust\n- Tauri\n\n## Data Flow\n\n```mermaid\ngraph LR\n  A[Frontend] --> B[IPC]\n  B --> C[Rust Backend]\n```'
      }
    ]
  }
];

const mockSkills = [
  {
    id: 'skill-researcher',
    name: 'Research Assistant',
    description: 'Helps with academic research, literature reviews, and citation management',
    template: '# Research Assistant Skill\n\nYou are a research assistant specialized in...',
    category: 'research'
  },
  {
    id: 'skill-coder',
    name: 'Code Reviewer',
    description: 'Reviews code for best practices, security issues, and optimization opportunities',
    template: '# Code Reviewer Skill\n\nYou are an expert code reviewer...',
    category: 'development'
  },
  {
    id: 'skill-analyst',
    name: 'Data Analyst',
    description: 'Analyzes datasets, creates visualizations, and provides insights',
    template: '# Data Analyst Skill\n\nYou are a data analyst expert...',
    category: 'analysis'
  },
  {
    id: 'skill-writer',
    name: 'Technical Writer',
    description: 'Creates clear documentation, API references, and user guides',
    template: '# Technical Writer Skill\n\nYou specialize in technical writing...',
    category: 'documentation'
  }
];

// Welcome document that can be reopened
const welcomeDocument = {
  id: 'welcome',
  name: 'Welcome',
  type: 'welcome',
  content: ''
};

// Settings documents
const projectSettingsDocument = {
  id: 'project-settings',
  name: 'Project Settings',
  type: 'project-settings',
  content: ''
};

const globalSettingsDocument = {
  id: 'global-settings',
  name: 'Settings',
  type: 'global-settings',
  content: ''
};

export default function Workspace() {
  // Check if onboarding is complete - default to true to skip onboarding initially
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [projects, setProjects] = useState(mockProjects);
  const [activeProject, setActiveProject] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [openDocuments, setOpenDocuments] = useState([welcomeDocument]);
  const [activeDocument, setActiveDocument] = useState(welcomeDocument);
  const [theme, setTheme] = useState('dark');
  const [showChat, setShowChat] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { toast } = useToast();

  // Check for app updates
  const checkAppForUpdates = async (showNoUpdateMessage = true) => {
    try {
      console.log('Checking for updates...');
      const update = await check();

      if (update?.available) {
        console.log('Update available:', update.version);

        // Set state to show the notification banner
        setUpdateAvailable(true);

        // Only prompt user with dialog if manual check
        if (showNoUpdateMessage) {
          const shouldUpdate = await ask(
            `A new version ${update.version} is available!\n\nWould you like to download and install it now?`,
            {
              title: 'Update Available',
              kind: 'info'
            }
          );

          if (shouldUpdate) {
            try {
              console.log('Downloading and installing update...');

              toast({
                title: 'Downloading Update',
                description: 'Please wait while the update is being downloaded and installed...',
              });

              await update.downloadAndInstall();

              const shouldRelaunch = await ask(
                'Update installed successfully!\n\nWould you like to restart the application now?',
                {
                  title: 'Update Installed',
                  kind: 'info'
                }
              );

              if (shouldRelaunch) {
                await relaunch();
              }
            } catch (error) {
              console.error('Failed to download/install update:', error);
              toast({
                title: 'Update Failed',
                description: 'Failed to download or install the update. Please try again later.',
                variant: 'destructive'
              });
            }
          }
        }
      } else {
        console.log('No update available');
        setUpdateAvailable(false);

        // Show "no update" message only for manual checks
        if (showNoUpdateMessage) {
          await message('You are running the latest version!', {
            title: 'No Updates Available',
            kind: 'info'
          });
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);

      // Only show error for manual checks to avoid spam
      if (showNoUpdateMessage) {
        toast({
          title: 'Update Check Failed',
          description: 'Failed to check for updates. Please try again later.',
          variant: 'destructive'
        });
      }
    }
  };

  // Load projects from backend on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const loadedProjects = await tauriApi.getAllProjects();
        if (loadedProjects.length > 0) {
          setProjects(loadedProjects);
          setActiveProject(loadedProjects[0]);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
        // Fall back to mock data
        setProjects(mockProjects);
        setActiveProject(mockProjects[0]);
      }
    };

    loadProjects();
  }, []);

  // Setup file watcher event listeners
  useEffect(() => {
    const setupListeners = async () => {
      try {
        // Listen for project added
        const unlistenAdded = await tauriApi.onProjectAdded((project) => {
          console.log('New project detected:', project);
          setProjects(prev => [...prev, project]);
          toast({
            title: 'New Project',
            description: `Project "${project.name}" was created`
          });
        });

        // Listen for project modified
        const unlistenModified = await tauriApi.onProjectModified((projectId) => {
          console.log('Project modified:', projectId);
          // Refresh the project
          tauriApi.getProject(projectId).then(updated => {
            setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
          });
        });

        // Cleanup listeners on unmount
        return () => {
          unlistenAdded();
          unlistenModified();
        };
      } catch (error) {
        console.error('Failed to setup file watchers:', error);
      }
    };

    setupListeners();
  }, [toast]);

  // Automatic update checks - on mount and every 6 hours
  useEffect(() => {
    // Check for updates on startup (silently)
    checkAppForUpdates(false);

    // Set up periodic check every 6 hours (21,600,000 milliseconds)
    const updateCheckInterval = setInterval(() => {
      console.log('Running periodic update check...');
      checkAppForUpdates(false);
    }, 21600000); // 6 hours

    // Cleanup interval on unmount
    return () => clearInterval(updateCheckInterval);
  }, []); // Empty dependency array - only run on mount

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + N - New Project
      if (modKey && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        handleNewProject();
      }
      // Cmd/Ctrl + Shift + N - New File
      else if (modKey && e.key === 'N' && e.shiftKey) {
        e.preventDefault();
        handleNewFile();
      }
      // Cmd/Ctrl + W - Close File
      else if (modKey && e.key === 'w' && !e.shiftKey) {
        e.preventDefault();
        handleCloseFile();
      }
      // Cmd/Ctrl + Shift + W - Close Project
      else if (modKey && e.key === 'W' && e.shiftKey) {
        e.preventDefault();
        handleCloseProject();
      }
      // Cmd/Ctrl + , - Settings
      else if (modKey && e.key === ',') {
        e.preventDefault();
        handleGlobalSettings();
      }
      // Cmd/Ctrl + Q - Exit (Mac style)
      else if (modKey && e.key === 'q' && isMac) {
        e.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProject, activeDocument]); // Include dependencies for handlers

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Open welcome page after onboarding
    setOpenDocuments([welcomeDocument]);
    setActiveDocument(welcomeDocument);
  };

  const handleProjectSelect = async (project) => {
    setActiveProject(project);

    try {
      // Load project files from backend
      const files = await tauriApi.getProjectFiles(project.id);
      console.log('Loaded project files:', files);

      // Update project with loaded files
      const projectWithDocs = {
        ...project,
        documents: files.map(fileName => ({
          id: fileName,
          name: fileName,
          type: fileName.startsWith('chat-') ? 'chat' : 'document',
          content: '' // Will be loaded when opened
        }))
      };

      setProjects(prev => prev.map(p => p.id === project.id ? projectWithDocs : p));
    } catch (error) {
      console.error('Failed to load project files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project files',
        variant: 'destructive'
      });
    }
  };

  const handleDocumentOpen = (doc) => {
    if (!openDocuments.find(d => d.id === doc.id)) {
      setOpenDocuments([...openDocuments, doc]);
    }
    setActiveDocument(doc);
  };

  const handleDocumentClose = (docId) => {
    const newDocs = openDocuments.filter(d => d.id !== docId);
    setOpenDocuments(newDocs);
    if (activeDocument?.id === docId && newDocs.length > 0) {
      setActiveDocument(newDocs[newDocs.length - 1]);
    } else if (newDocs.length === 0) {
      setActiveDocument(null);
    }
  };

  const handleNewProject = async () => {
    try {
      // Create a new project with temporary name
      const timestamp = Date.now();
      const tempName = `New Project ${timestamp}`;
      const project = await tauriApi.createProject(tempName, '', []);

      toast({
        title: 'Success',
        description: 'New project created. Please configure the project settings.'
      });

      // Adapt the project to match the mock structure
      const adaptedProject = {
        id: project.id,
        name: project.name,
        description: project.goal,
        created: new Date().toISOString().split('T')[0],
        documents: []
      };

      // The file watcher will handle updating the project list
      // But we can also add it immediately for responsiveness
      setProjects(prev => [...prev, adaptedProject]);
      setActiveProject(adaptedProject as any);

      // Automatically open project settings for the new project
      handleDocumentOpen(projectSettingsDocument);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive'
      });
    }
  };

  const handleNewSkill = async () => {
    try {
      const name = prompt('Enter skill name:');
      if (!name) return;

      const description = prompt('Enter skill description:');
      if (!description) return;

      const category = prompt('Enter skill category (e.g., research, development, analysis):') || 'general';

      const template = `# ${name}

You are a specialized AI assistant for ${description.toLowerCase()}.

## Your Role
Provide detailed, accurate, and helpful responses related to ${description.toLowerCase()}.

## Guidelines
- Be thorough and precise
- Provide examples when relevant
- Ask clarifying questions if needed`;

      const skill = await tauriApi.createSkill(name, description, template, category);

      toast({
        title: 'Success',
        description: `Skill "${skill.name}" created successfully`
      });

      // You could refresh skills list here if you're displaying them
    } catch (error) {
      console.error('Failed to create skill:', error);
      toast({
        title: 'Error',
        description: `Failed to create skill: ${error}`,
        variant: 'destructive'
      });
    }
  };

  const handleProjectSettings = () => {
    handleDocumentOpen(projectSettingsDocument);
  };

  const handleGlobalSettings = () => {
    handleDocumentOpen(globalSettingsDocument);
  };

  const handleOpenWelcome = () => {
    handleDocumentOpen(welcomeDocument);
  };

  const handleNewFile = async () => {
    if (!activeProject) {
      toast({
        title: 'Error',
        description: 'No active project selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      const fileName = prompt('Enter file name (e.g., notes.md):');
      if (!fileName) return;

      // Ensure .md extension
      const fullFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;

      // Create an empty file
      await tauriApi.writeMarkdownFile(activeProject.id, fullFileName, '# New Document\n\n');

      // Create document object and open it
      const newDoc = {
        id: fullFileName,
        name: fullFileName,
        type: 'document' as const,
        content: '# New Document\n\n'
      };

      handleDocumentOpen(newDoc);

      toast({
        title: 'Success',
        description: `File "${fullFileName}" created successfully`
      });

      // Refresh project files
      const files = await tauriApi.getProjectFiles(activeProject.id);
      const projectWithDocs = {
        ...activeProject,
        documents: files.map(fn => ({
          id: fn,
          name: fn,
          type: fn.startsWith('chat-') ? 'chat' : 'document',
          content: ''
        }))
      };
      setProjects(prev => prev.map(p => p.id === activeProject.id ? projectWithDocs : p));
    } catch (error) {
      console.error('Failed to create new file:', error);
      toast({
        title: 'Error',
        description: `Failed to create file: ${error}`,
        variant: 'destructive'
      });
    }
  };

  const handleCloseFile = () => {
    if (activeDocument) {
      handleDocumentClose(activeDocument.id);
    }
  };

  const handleCloseProject = () => {
    if (!activeProject) {
      toast({
        title: 'Info',
        description: 'No project is currently open',
      });
      return;
    }

    // Close all open documents
    setOpenDocuments([welcomeDocument]);
    setActiveDocument(welcomeDocument);

    // Clear active project
    setActiveProject(null);

    toast({
      title: 'Project Closed',
      description: `"${activeProject.name}" has been closed`
    });
  };

  const handleExit = async () => {
    try {
      const window = getCurrentWindow();
      await window.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Show onboarding if requested
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} onSkip={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
      <MenuBar
        onNewProject={handleNewProject}
        onNewFile={handleNewFile}
        onCloseFile={handleCloseFile}
        onCloseProject={handleCloseProject}
        onOpenWelcome={handleOpenWelcome}
        onOpenGlobalSettings={handleGlobalSettings}
        onFind={() => console.log('Find')}
        onReplace={() => console.log('Replace')}
        onExtractSelection={() => console.log('Extract selection')}
        onExit={handleExit}
      />

      {/* Update notification banner */}
      {updateAvailable && (
        <div className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">
              A new update is available! Click "Check for Updates" to install it.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUpdateAvailable(false)}
            className="text-white hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <TopBar
        activeProject={activeProject}
        onNewSkill={handleNewSkill}
        onProjectSettings={handleProjectSettings}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          projects={projects}
          skills={mockSkills}
          activeProject={activeProject}
          activeTab={activeTab}
          onProjectSelect={handleProjectSelect}
          onTabChange={setActiveTab}
          onDocumentOpen={handleDocumentOpen}
          onNewProject={handleNewProject}
          onNewSkill={handleNewSkill}
        />
        
        <MainPanel
          activeProject={activeProject}
          openDocuments={openDocuments}
          activeDocument={activeDocument}
          showChat={showChat}
          onDocumentSelect={setActiveDocument}
          onDocumentClose={handleDocumentClose}
          onToggleChat={() => setShowChat(!showChat)}
          onCreateProject={handleNewProject}
        />
      </div>
    </div>
  );
}
