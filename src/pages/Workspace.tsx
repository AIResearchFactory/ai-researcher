
import React, { useState, useEffect } from 'react';
import TopBar from '../components/workspace/TopBar';
import Sidebar from '../components/workspace/Sidebar';
import MainPanel from '../components/workspace/MainPanel';
import Onboarding from './Onboarding';
import MenuBar from '../components/workspace/MenuBar';
import { tauriApi } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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
      // For now, create with basic defaults - could show a dialog first
      const name = prompt('Enter project name:');
      if (!name) return;

      const goal = prompt('Enter project goal:');
      if (!goal) return;

      const project = await tauriApi.createProject(name, goal, []);

      toast({
        title: 'Success',
        description: `Project "${project.name}" created successfully`
      });

      // The file watcher will handle updating the project list
      // But we can also add it immediately for responsiveness
      setProjects(prev => [...prev, project]);
      setActiveProject(project);
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
      />
      
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
