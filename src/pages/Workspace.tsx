
import { useState, useEffect } from 'react';
import TopBar from '../components/workspace/TopBar';
import Sidebar from '../components/workspace/Sidebar';
import MainPanel from '../components/workspace/MainPanel';
import Onboarding from './Onboarding';
import MenuBar from '../components/workspace/MenuBar';
import ProjectFormDialog from '../components/workspace/ProjectFormDialog';
import CreateSkillDialog from '../components/workspace/CreateSkillDialog';
import FileFormDialog from '../components/workspace/FileFormDialog';
import FindReplaceDialog, { FindOptions } from '../components/workspace/FindReplaceDialog';
import { tauriApi } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch, exit } from '@tauri-apps/plugin-process';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';


import { Project, Skill, Workflow } from '@/api/tauri';

interface Document {
  id: string;
  name: string;
  type: string;
  content: string;
}

interface WorkspaceProject extends Project {
  documents?: Document[];
  description?: string;
  created?: string;
}

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

  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeProject, setActiveProject] = useState<WorkspaceProject | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [openDocuments, setOpenDocuments] = useState<Document[]>([welcomeDocument]);
  const [activeDocument, setActiveDocument] = useState<Document | null>(welcomeDocument);
  const [theme, setTheme] = useState('dark');
  const [showChat, setShowChat] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [showSkillDialog, setShowSkillDialog] = useState(false);
  const [showFindDialog, setShowFindDialog] = useState(false);
  const [findMode, setFindMode] = useState<'find' | 'replace'>('find');
  const [showFindInFilesDialog, setShowFindInFilesDialog] = useState(false);
  const [showReplaceInFilesDialog, setShowReplaceInFilesDialog] = useState(false);
  const [pendingReplaceData, setPendingReplaceData] = useState<{
    searchText: string;
    replaceText: string;
    matches: any[];
    fileNames: string[];
  } | null>(null);
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
  // Load projects and skills from backend on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedProjects, loadedSkills] = await Promise.all([
          tauriApi.getAllProjects(),
          tauriApi.getAllSkills()
        ]);

        if (loadedProjects) {
          // Convert Project to WorkspaceProject
          const workspaceProjects: WorkspaceProject[] = loadedProjects.map(p => ({
            ...p,
            description: p.goal || '',
            created: p.created_at.split('T')[0],
            documents: []
          }));
          setProjects(workspaceProjects);
          // Set active project to null initially to let user select
          setActiveProject(null);
        }

        if (loadedSkills) {
          setSkills(loadedSkills);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects or skills. Please try again.',
          variant: 'destructive'
        });
        setProjects([]);
        setSkills([]);
        setActiveProject(null);
      }
    };

    loadData();
  }, [toast]);

  // Setup file watcher event listeners
  useEffect(() => {
    const setupListeners = async () => {
      try {
        // Listen for project added
        const unlistenAdded = await tauriApi.onProjectAdded((project) => {
          console.log('New project detected:', project);
          const workspaceProject: WorkspaceProject = {
            ...project,
            description: project.goal || '',
            created: project.created_at.split('T')[0],
            documents: []
          };
          setProjects(prev => [...prev, workspaceProject]);
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
            const workspaceProject: WorkspaceProject = {
              ...updated,
              description: updated.goal || '',
              created: updated.created_at.split('T')[0],
              documents: []
            };
            setProjects(prev => prev.map(p => p.id === projectId ? workspaceProject : p));
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

  const handleProjectSelect = async (project: WorkspaceProject) => {
    setActiveProject(project);

    try {
      // Load project files from backend
      const files = await tauriApi.getProjectFiles(project.id);
      console.log('Loaded project files:', files);

      // Update project with loaded files
      const projectWithDocs: WorkspaceProject = {
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
        title: 'Error Loading Files',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }

    // Load workflows for the project
    try {
      const projectWorkflows = await tauriApi.getProjectWorkflows(project.id);
      setWorkflows(projectWorkflows);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      // Don't show toast to avoid spamming if just no workflows exist yet or folder missing
      setWorkflows([]);
    }
  };

  const handleWorkflowSelect = (workflow: Workflow) => {
    setActiveWorkflow(workflow);
    // Switch to workflow tab if not already there (optional, but good UX)
    setActiveDocument(null); // Clear active document to show workflow canvas
  };

  const handleNewWorkflow = async () => {
    // Create a draft workflow that can be configured in the UI
    const draftWorkflow: Workflow = {
      id: 'draft-' + Date.now(),
      project_id: activeProject?.id || '',
      name: '',
      description: '',
      steps: [],
      version: '1.0.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    setActiveWorkflow(draftWorkflow);
    setActiveDocument(null);
    setActiveTab('workflows');
  };

  const handleSaveWorkflow = async (workflow: Workflow) => {
    try {
      console.log('Saving workflow:', JSON.stringify(workflow, null, 2));
      if (workflow.id.startsWith('draft-')) {
        if (!workflow.project_id) {
          console.error('Save failed: No project ID');
          toast({ title: 'Error', description: 'Please select a project for the workflow', variant: 'destructive' });
          return;
        }
        if (!workflow.name) {
          console.error('Save failed: No name');
          toast({ title: 'Error', description: 'Please name your workflow', variant: 'destructive' });
          return;
        }

        const newWorkflow = await tauriApi.createWorkflow(workflow.project_id, workflow.name, workflow.description || '');
        // Copy steps from draft if any (though usually empty)
        if (workflow.steps.length > 0) {
          newWorkflow.steps = workflow.steps;
          await tauriApi.saveWorkflow(newWorkflow);
        }

        setWorkflows([...workflows, newWorkflow]);
        setActiveWorkflow(newWorkflow);
      } else {
        await tauriApi.saveWorkflow(workflow);
        setWorkflows(workflows.map(w => w.id === workflow.id ? workflow : w));
      }
      console.log('Workflow saved successfully');
      toast({ title: 'Success', description: 'Workflow saved' });
    } catch (error) {
      console.error('Failed to save workflow. Error details:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }
  };

  const handleRunWorkflow = async (workflow: Workflow) => {
    try {
      // Save first
      await tauriApi.saveWorkflow(workflow);

      toast({ title: 'Running', description: 'Workflow execution started...' });

      const execution = await tauriApi.executeWorkflow(workflow.project_id, workflow.id);
      console.log("Execution started:", execution);

      // In a real app we'd poll for status or listen to events here
      // For now just show started
    } catch (error) {
      console.error('Failed to run workflow:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }
  };

  const handleDocumentOpen = (doc: Document) => {
    if (!openDocuments.find(d => d.id === doc.id)) {
      setOpenDocuments([...openDocuments, doc]);
    }
    setActiveDocument(doc);
    setActiveWorkflow(null); // Clear active workflow when opening a document
  };

  const handleDocumentClose = (docId: string) => {
    const newDocs = openDocuments.filter(d => d.id !== docId);
    setOpenDocuments(newDocs);
    if (activeDocument?.id === docId && newDocs.length > 0) {
      setActiveDocument(newDocs[newDocs.length - 1]);
    } else if (newDocs.length === 0) {
      setActiveDocument(null);
    }
  };

  const handleNewProject = () => {
    // Open the project creation dialog
    setShowProjectDialog(true);
  };

  const handleProjectFormSubmit = async (data: { name: string; goal: string; skills: string[] }) => {
    try {
      console.info("Starting handleProjectFormSubmit", data);
      const project = await tauriApi.createProject(data.name, data.goal, data.skills);

      toast({
        title: 'Success',
        description: `Project "${data.name}" created successfully!`
      });

      // Adapt the project to match the mock structure
      const adaptedProject: WorkspaceProject = {
        ...project,
        description: project.goal,
        created: new Date().toISOString().split('T')[0],
        documents: []
      };

      // The file watcher will handle updating the project list
      // But we can also add it immediately for responsiveness
      setProjects(prev => [...prev, adaptedProject]);
      setActiveProject(adaptedProject);

      // Close the dialog
      setShowProjectDialog(false);

      // Create and open a new chat document for the project
      const chatDoc: Document = {
        id: `chat-${Date.now()}`,
        name: `chat-${Date.now()}.md`,
        type: 'chat',
        content: '# New Chat\n\nStart your research conversation here...'
      };

      // Open the chat document
      setOpenDocuments([chatDoc]);
      setActiveDocument(chatDoc);

      // Ensure chat is visible
      setShowChat(true);

      console.info("Finish handleProjectFormSubmit");
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: 'Error',
        description: `Failed to create project: ${error}`,
        variant: 'destructive'
      });
      // Do NOT close dialog on error so user can fix inputs
    }
  };

  const handleNewSkill = () => {
    setShowSkillDialog(true);
  };

  const handleCreateSkillSubmit = async (newSkill: { name: string; description: string; role: string; tasks: string; output: string }) => {
    try {
      const template = `# ${newSkill.name}

## Role
${newSkill.role}

## Tasks
${newSkill.tasks}

## Output
${newSkill.output || "As requested."}`;

      const category = 'general';

      const skill = await tauriApi.createSkill(
        newSkill.name,
        newSkill.description,
        template,
        category
      );

      toast({
        title: 'Success',
        description: `Skill "${skill.name}" created successfully`
      });

      // Refresh skills list
      const loadedSkills = await tauriApi.getAllSkills();
      setSkills(loadedSkills);
    } catch (error) {
      console.error('Failed to create skill:', error);
      toast({
        title: 'Error',
        description: `Failed to create skill: ${error}`,
        variant: 'destructive'
      });
    }
  };

  const handleSkillSelect = (skill: Skill) => {
    // Open skill as a document
    const skillDoc: Document = {
      id: `skill-${skill.id}`,
      name: skill.name,
      type: 'skill',
      content: JSON.stringify(skill) // Pass skill data via content
    };
    handleDocumentOpen(skillDoc);
  };

  const handleSkillSave = async (updatedSkill: Skill) => {
    // Update local state
    setSkills(prev => prev.map(s => s.id === updatedSkill.id ? updatedSkill : s));

    // Update the open document if it exists (to keep name in sync)
    setOpenDocuments(prev => prev.map(doc => {
      if (doc.type === 'skill' && doc.id === `skill-${updatedSkill.id}`) {
        return {
          ...doc,
          name: updatedSkill.name,
          content: JSON.stringify(updatedSkill)
        };
      }
      return doc;
    }));

    // Update active document if it's this skill
    if (activeDocument?.type === 'skill' && activeDocument.id === `skill-${updatedSkill.id}`) {
      setActiveDocument({
        ...activeDocument,
        name: updatedSkill.name,
        content: JSON.stringify(updatedSkill)
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

  const handleNewFile = () => {
    if (!activeProject) {
      toast({
        title: 'Error',
        description: 'No active project selected',
        variant: 'destructive'
      });
      return;
    }

    // Open the file creation dialog
    setShowFileDialog(true);
  };

  const handleFileFormSubmit = async (fileName: string) => {
    if (!activeProject) {
      return;
    }

    try {
      // Create an empty file
      await tauriApi.writeMarkdownFile(activeProject.id, fileName, '# New Document\n\n');

      // Create document object and open it
      const newDoc: Document = {
        id: fileName,
        name: fileName,
        type: 'document',
        content: '# New Document\n\n'
      };

      handleDocumentOpen(newDoc);

      toast({
        title: 'Success',
        description: `File "${fileName}" created successfully`
      });

      // Update project files optimistically
      const updatedDocuments = [
        ...(activeProject.documents || []),
        newDoc
      ];

      const projectWithDocs: WorkspaceProject = {
        ...activeProject,
        documents: updatedDocuments
      };

      // Update both projects list and active project reference
      setProjects(prev => prev.map(p => p.id === activeProject.id ? projectWithDocs : p));
      setActiveProject(projectWithDocs);

      // Close the dialog
      setShowFileDialog(false);
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
      console.log("Clicked on Exit");
      await exit(0);
    } catch (error) {
      console.error('Failed to exit:', error);
      try {
        const window = getCurrentWindow();
        await window.close();
      } catch (e) {
        console.error('Failed to close window:', e);
      }
    }
  };

  // Edit menu handlers
  const handleUndo = () => {
    document.execCommand('undo');
  };

  const handleRedo = () => {
    document.execCommand('redo');
  };

  const handleCut = () => {
    document.execCommand('cut');
  };

  const handleCopy = () => {
    document.execCommand('copy');
  };

  const handlePaste = () => {
    document.execCommand('paste');
  };

  const handleFind = () => {
    setFindMode('find');
    setShowFindDialog(true);
  };

  const handleReplace = () => {
    setFindMode('replace');
    setShowFindDialog(true);
  };

  const handleFindText = (searchText: string, options: FindOptions) => {
    try {
      if (!searchText) return;

      // Get the main content area
      const contentArea = document.querySelector('.main-panel') || document.body;
      const textContent = contentArea.textContent || '';
      
      // Prepare search text based on options
      let searchPattern = searchText;
      if (!options.caseSensitive) {
        searchPattern = searchPattern.toLowerCase();
      }
      
      // Build regex pattern for whole word matching
      let regex: RegExp;
      if (options.wholeWord) {
        const escapedSearch = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(`\\b${escapedSearch}\\b`, options.caseSensitive ? 'g' : 'gi');
      } else {
        const escapedSearch = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escapedSearch, options.caseSensitive ? 'g' : 'gi');
      }

      // Search for matches in text content
      const compareText = options.caseSensitive ? textContent : textContent.toLowerCase();
      const matches = compareText.match(regex);
      
      if (!matches || matches.length === 0) {
        toast({
          title: 'Not Found',
          description: `No matches found for "${searchText}"`,
        });
        return;
      }

      // Use CSS.highlights API if available (modern browsers)
      if ('highlights' in CSS) {
        const cssHighlights = CSS.highlights as any;
        
        // Clear previous highlights
        cssHighlights.clear();
        
        // Create ranges for all matches
        const ranges: Range[] = [];
        const walker = document.createTreeWalker(
          contentArea,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const text = node.textContent || '';
          const compareNodeText = options.caseSensitive ? text : text.toLowerCase();
          let match;
          regex.lastIndex = 0; // Reset regex
          
          while ((match = regex.exec(compareNodeText)) !== null) {
            const range = new Range();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            ranges.push(range);
          }
        }
        
        if (ranges.length > 0) {
          const highlight = new (window as any).Highlight(...ranges);
          cssHighlights.set('search-results', highlight);
          
          // Scroll to first match
          ranges[0].startContainer.parentElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          
          toast({
            title: 'Found',
            description: `Found ${matches.length} match${matches.length > 1 ? 'es' : ''}`,
          });
        }
      } else {
        // Fallback: just report the count
        toast({
          title: 'Found',
          description: `Found ${matches.length} match${matches.length > 1 ? 'es' : ''} (highlighting not supported)`,
        });
      }
    } catch (error) {
      console.error('Find error:', error);
      toast({
        title: 'Find Failed',
        description: error instanceof Error ? error.message : 'Failed to search text',
        variant: 'destructive'
      });
    }
  };

  const handleReplaceText = (searchText: string, replaceText: string, replaceAll: boolean) => {
    try {
      const selection = window.getSelection();
      if (!selection) {
        toast({
          title: 'Replace Failed',
          description: 'Could not access text selection',
          variant: 'destructive'
        });
        return;
      }

      if (replaceAll) {
        // For replace all, we need to work with the document content
        // This is a simplified implementation - in production you'd want to work with the editor's content
        toast({
          title: 'Replace All',
          description: 'Replace all functionality requires editor integration. Please use find and replace individually for now.',
        });
      } else {
        // Replace current selection if it matches
        const selectedText = selection.toString();
        if (selectedText === searchText) {
          // Use modern Selection API instead of deprecated execCommand
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(replaceText));
          
          // Collapse selection to end of inserted text
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          
          toast({
            title: 'Replaced',
            description: `Replaced "${searchText}" with "${replaceText}"`,
          });
          // Find next occurrence
          const CASE_SENSITIVE = false;
          const BACKWARDS = false;
          const WRAP_AROUND = true;
          const WHOLE_WORD = false;
          const SEARCH_IN_FRAMES = false;
          const SHOW_DIALOG = false;
          const windowWithFind = window as any;
          windowWithFind.find(searchText, CASE_SENSITIVE, BACKWARDS, WRAP_AROUND, WHOLE_WORD, SEARCH_IN_FRAMES, SHOW_DIALOG);
        } else {
          toast({
            title: 'No Match',
            description: 'Current selection does not match search text',
          });
        }
      }
    } catch (error) {
      console.error('Replace error:', error);
      toast({
        title: 'Replace Failed',
        description: error instanceof Error ? error.message : 'Failed to replace text',
        variant: 'destructive'
      });
    }
  };

  const handleFindNext = () => {
    try {
      // Use browser's native find functionality to go to next match
      const CASE_SENSITIVE = false;
      const BACKWARDS = false;
      const WRAP_AROUND = true;
      const WHOLE_WORD = false;
      const SEARCH_IN_FRAMES = false;
      const SHOW_DIALOG = false;
      
      const windowWithFind = window as any;
      const found = windowWithFind.find('', CASE_SENSITIVE, BACKWARDS, WRAP_AROUND, WHOLE_WORD, SEARCH_IN_FRAMES, SHOW_DIALOG);
      
      if (!found) {
        toast({
          title: 'No More Matches',
          description: 'No more matches found',
        });
      }
    } catch (error) {
      console.error('Find next error:', error);
      toast({
        title: 'Find Next Failed',
        description: error instanceof Error ? error.message : 'Failed to find next match',
        variant: 'destructive'
      });
    }
  };

  const handleFindPrevious = () => {
    try {
      // Use browser's native find functionality to go to previous match
      const CASE_SENSITIVE = false;
      const BACKWARDS = true;
      const WRAP_AROUND = true;
      const WHOLE_WORD = false;
      const SEARCH_IN_FRAMES = false;
      const SHOW_DIALOG = false;
      
      const windowWithFind = window as any;
      const found = windowWithFind.find('', CASE_SENSITIVE, BACKWARDS, WRAP_AROUND, WHOLE_WORD, SEARCH_IN_FRAMES, SHOW_DIALOG);
      
      if (!found) {
        toast({
          title: 'No More Matches',
          description: 'No more matches found',
        });
      }
    } catch (error) {
      console.error('Find previous error:', error);
      toast({
        title: 'Find Previous Failed',
        description: error instanceof Error ? error.message : 'Failed to find previous match',
        variant: 'destructive'
      });
    }
  };

  const handleFindInFiles = async () => {
    if (!activeProject) {
      toast({
        title: 'No Project Selected',
        description: 'Please select a project to search in files',
        variant: 'destructive'
      });
      return;
    }

    // Open the find-in-files dialog
    setShowFindInFilesDialog(true);
  };

  const handleFindInFilesSearch = async (searchText: string, options: FindOptions) => {
    if (!activeProject) return;

    try {
      const matches = await tauriApi.searchInFiles(
        activeProject.id,
        searchText,
        options.caseSensitive,
        options.useRegex
      );
      
      if (matches.length === 0) {
        toast({
          title: 'No Matches Found',
          description: `No matches found for "${searchText}" in project files`,
        });
      } else {
        // Show results in a toast for now - in production you'd want a results panel
        const fileCount = new Set(matches.map(m => m.file_name)).size;
        toast({
          title: 'Search Complete',
          description: `Found ${matches.length} matches in ${fileCount} files`,
        });
        console.log('Search results:', matches);
      }
    } catch (error) {
      console.error('Search in files error:', error);
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'Failed to search in files',
        variant: 'destructive'
      });
    } finally {
      setShowFindInFilesDialog(false);
    }
  };

  const handleReplaceInFiles = async () => {
    if (!activeProject) {
      toast({
        title: 'No Project Selected',
        description: 'Please select a project to replace in files',
        variant: 'destructive'
      });
      return;
    }

    // Open the replace-in-files dialog
    setShowReplaceInFilesDialog(true);
  };

  const handleReplaceInFilesSearch = async (searchText: string, replaceText: string) => {
    if (!activeProject) return;

    try {
      // First, find all matches
      const matches = await tauriApi.searchInFiles(activeProject.id, searchText, false, false);
      
      if (matches.length === 0) {
        toast({
          title: 'No Matches Found',
          description: `No matches found for "${searchText}" in project files`,
        });
        return;
      }

      // Get unique file names
      const fileNames = Array.from(new Set(matches.map(m => m.file_name)));
      
      // Store data and show confirmation via toast with action
      setPendingReplaceData({ searchText, replaceText, matches, fileNames });
      
      toast({
        title: 'Confirm Replacement',
        description: `Replace ${matches.length} occurrences in ${fileNames.length} files?`,
        action: (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => confirmReplaceInFiles()}
            >
              Replace
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingReplaceData(null)}
            >
              Cancel
            </Button>
          </div>
        ),
      });
      
      setShowReplaceInFilesDialog(false);
    } catch (error) {
      console.error('Replace in files error:', error);
      toast({
        title: 'Replace Failed',
        description: error instanceof Error ? error.message : 'Failed to search for replacements',
        variant: 'destructive'
      });
      setShowReplaceInFilesDialog(false);
    }
  };

  const confirmReplaceInFiles = async () => {
    if (!pendingReplaceData || !activeProject) return;

    const { searchText, replaceText, fileNames } = pendingReplaceData;

    try {
      // Perform replacement
      const replacementCount = await tauriApi.replaceInFiles(
        activeProject.id,
        searchText,
        replaceText,
        false,
        fileNames
      );

      toast({
        title: 'Replace Complete',
        description: `Replaced ${replacementCount} occurrences in ${fileNames.length} files`,
      });
    } catch (error) {
      console.error('Replace in files error:', error);
      toast({
        title: 'Replace Failed',
        description: error instanceof Error ? error.message : 'Failed to replace in files',
        variant: 'destructive'
      });
    } finally {
      setPendingReplaceData(null);
    }
  };

  // Selection menu handlers
  const handleSelectAll = () => {
    document.execCommand('selectAll');
  };

  const handleExpandSelection = () => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        toast({
          title: 'No Selection',
          description: 'Please select some text first',
          variant: 'destructive'
        });
        return;
      }

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      // If we're in a text node, expand to the parent element
      if (container.nodeType === Node.TEXT_NODE && container.parentElement) {
        const newRange = document.createRange();
        newRange.selectNodeContents(container.parentElement);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else if (container.parentElement) {
        // Expand to parent element
        const newRange = document.createRange();
        newRange.selectNodeContents(container.parentElement);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } catch (error) {
      console.error('Failed to expand selection:', error);
      toast({
        title: 'Expand Selection Failed',
        description: error instanceof Error ? error.message : 'Failed to expand selection',
        variant: 'destructive'
      });
    }
  };

  const handleCopyAsMarkdown = async () => {
    try {
      // Get the current selection
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        toast({
          title: 'No Selection',
          description: 'Please select some text to copy as markdown',
          variant: 'destructive'
        });
        return;
      }

      const selectedText = selection.toString();
      
      // Copy to clipboard
      await navigator.clipboard.writeText(selectedText);
      
      toast({
        title: 'Copied',
        description: 'Selection copied to clipboard as markdown'
      });
    } catch (error) {
      console.error('Failed to copy as markdown:', error);
      toast({
        title: 'Copy Failed',
        description: error instanceof Error ? error.message : 'Failed to copy selection to clipboard',
        variant: 'destructive'
      });
    }
  };

  // Help menu handlers
  const handleReleaseNotes = () => {
    window.open('https://github.com/AssafMiron/ai-researcher/releases', '_blank');
  };

  const handleCheckForUpdates = () => {
    checkAppForUpdates(true);
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
        onFind={handleFind}
        onReplace={handleReplace}
        onExit={handleExit}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onFindInFiles={handleFindInFiles}
        onReplaceInFiles={handleReplaceInFiles}
        onSelectAll={handleSelectAll}
        onExpandSelection={handleExpandSelection}
        onCopyAsMarkdown={handleCopyAsMarkdown}
        onReleaseNotes={handleReleaseNotes}
        onCheckForUpdates={handleCheckForUpdates}
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
        onProjectSettings={handleProjectSettings}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          projects={projects}
          skills={skills}
          activeProject={activeProject}
          activeTab={activeTab}
          onProjectSelect={handleProjectSelect}
          onTabChange={setActiveTab}
          onDocumentOpen={handleDocumentOpen}
          onNewProject={handleNewProject}
          onNewSkill={handleNewSkill}
          onSkillSelect={handleSkillSelect}
          workflows={workflows}
          activeWorkflowId={activeWorkflow?.id}
          onWorkflowSelect={handleWorkflowSelect}
          onNewWorkflow={handleNewWorkflow}
          onRunWorkflow={handleRunWorkflow}
        />

        <MainPanel
          activeProject={activeProject}
          openDocuments={openDocuments}
          activeDocument={activeDocument}
          showChat={showChat}
          onDocumentSelect={setActiveDocument}
          onDocumentClose={handleDocumentClose}
          onToggleChat={() => setShowChat(!showChat)}
          onTabChange={setActiveTab}
          onCreateProject={handleNewProject}
          activeWorkflow={activeWorkflow}
          workflows={workflows}
          projects={projects}
          skills={skills}
          onWorkflowSave={handleSaveWorkflow}
          onWorkflowRun={handleRunWorkflow}
          onNewSkill={handleNewSkill}
          onSkillSave={handleSkillSave}
        />
      </div>

      {/* Dialogs */}
      <ProjectFormDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
        onSubmit={handleProjectFormSubmit}
        availableSkills={skills}
      />
      <FileFormDialog
        open={showFileDialog}
        onOpenChange={setShowFileDialog}
        onSubmit={handleFileFormSubmit}
        projectName={activeProject?.name}
      />
      <CreateSkillDialog
        open={showSkillDialog}
        onOpenChange={setShowSkillDialog}
        onSubmit={handleCreateSkillSubmit}
      />
      <FindReplaceDialog
        open={showFindDialog}
        onClose={() => setShowFindDialog(false)}
        mode={findMode}
        onFind={handleFindText}
        onReplace={handleReplaceText}
        onNext={handleFindNext}
        onPrevious={handleFindPrevious}
      />
      <FindReplaceDialog
        open={showFindInFilesDialog}
        onClose={() => setShowFindInFilesDialog(false)}
        mode="find"
        onFind={handleFindInFilesSearch}
        onReplace={() => {}}
      />
      <FindReplaceDialog
        open={showReplaceInFilesDialog}
        onClose={() => setShowReplaceInFilesDialog(false)}
        mode="replace"
        onFind={() => {}}
        onReplace={handleReplaceInFilesSearch}
      />
    </div>
  );
}
