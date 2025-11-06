
import React, { useState, useEffect } from 'react';
import TopBar from '../components/workspace/TopBar';
import Sidebar from '../components/workspace/Sidebar';
import MainPanel from '../components/workspace/MainPanel';
import Onboarding from './Onboarding';
import MenuBar from '../components/workspace/MenuBar';

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

  const [activeProject, setActiveProject] = useState(mockProjects[0]);
  const [activeTab, setActiveTab] = useState('projects');
  const [openDocuments, setOpenDocuments] = useState([welcomeDocument]);
  const [activeDocument, setActiveDocument] = useState(welcomeDocument);
  const [theme, setTheme] = useState('dark');
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Open welcome page after onboarding
    setOpenDocuments([welcomeDocument]);
    setActiveDocument(welcomeDocument);
  };

  const handleProjectSelect = (project) => {
    setActiveProject(project);
    // TODO: Integrate with Tauri IPC - load project documents
    // await invoke('load_project_documents', { projectId: project.id });
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

  const handleNewProject = () => {
    // TODO: Integrate with Tauri IPC
    // await invoke('create_new_project', { name: 'New Project' });
    console.log('Create new project');
  };

  const handleNewSkill = () => {
    // TODO: Integrate with Tauri IPC
    // await invoke('create_new_skill', { name: 'New Skill' });
    console.log('Create new skill');
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

  const handleNewFile = () => {
    // TODO: Integrate with Tauri IPC
    console.log('New file in project');
  };

  const handleCloseFile = () => {
    if (activeDocument) {
      handleDocumentClose(activeDocument.id);
    }
  };

  const handleCloseProject = () => {
    // TODO: Close project logic
    console.log('Close project');
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
          projects={mockProjects}
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
