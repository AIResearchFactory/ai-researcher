import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, PanelRightClose, PanelRight } from 'lucide-react';
import ChatPanel from './ChatPanel';
import MarkdownEditor from './MarkdownEditor';
import ProjectSettingsPage from '../../pages/ProjectSettings';
import GlobalSettingsPage from '../../pages/GlobalSettings';
import WelcomePage from '../../pages/Welcome';
import WorkflowCanvas from '../workflow/WorkflowCanvas';
import { Workflow } from '@/api/tauri';

import SkillEditor from './SkillEditor';

interface Document {
  id: string;
  name: string;
  type: string;
  content: string;
}

interface MainPanelProps {
  activeProject: { id: string; name: string; description?: string } | null;
  openDocuments: Document[];
  activeDocument: Document | null;
  showChat: boolean;
  onDocumentSelect: (doc: Document) => void;
  onDocumentClose: (docId: string) => void;
  onToggleChat: () => void;
  onTabChange?: (tab: string) => void;

  onCreateProject: () => void;
  // Workflow props
  activeWorkflow?: Workflow | null;
  workflows?: Workflow[]; // Added workflows prop
  projects?: { id: string; name: string }[]; // Added projects prop
  skills?: any[]; // Added skills prop
  onWorkflowSave?: (workflow: Workflow) => void;
  onWorkflowRun?: (workflow: Workflow) => void;
  onNewSkill?: () => void;
  // Skill props
  onSkillSave?: (skill: any) => void;
}

export default function MainPanel({
  activeProject,
  openDocuments,
  activeDocument,
  showChat,
  onDocumentSelect,
  onDocumentClose,
  onToggleChat,
  onTabChange,
  onCreateProject,

  activeWorkflow,
  workflows = [],
  projects = [],
  skills = [],
  onWorkflowSave,
  onWorkflowRun,
  onNewSkill,
  onSkillSave
}: MainPanelProps) {
  const [chatWidth, setChatWidth] = useState(40); // Percentage
  const isResizing = useRef(false);

  const startResizing = () => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;

    // Calculate percentage from right
    const width = window.innerWidth;
    const offset = width - e.clientX;
    const percentage = (offset / width) * 100;

    // Constrain between 20% and 70%
    if (percentage > 20 && percentage < 70) {
      setChatWidth(percentage);
    }
  };

  // If a workflow is active, show the workflow canvas
  if (activeWorkflow) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex overflow-hidden relative">
          <WorkflowCanvas
            workflow={activeWorkflow}
            projectName={activeProject?.name || ''}
            projects={projects}
            skills={skills}
            onSave={onWorkflowSave || (() => { })}
            onRun={() => onWorkflowRun && onWorkflowRun(activeWorkflow)}
            onNewSkill={onNewSkill}
          />
        </div>
      </div>
    );
  }

  const isSpecialPage = activeDocument?.type === 'project-settings' ||
    activeDocument?.type === 'global-settings' ||
    activeDocument?.type === 'welcome';
  const displayChat = showChat && !isSpecialPage;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Document Tabs */}
      <div className="h-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center px-2 gap-1 overflow-x-auto">
        {openDocuments.map((doc) => (
          <div
            key={doc.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-sm cursor-pointer transition-colors ${activeDocument?.id === doc.id
              ? 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            onClick={() => onDocumentSelect(doc)}
          >
            <span className="truncate max-w-[150px]">{doc.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDocumentClose(doc.id);
              }}
              className="hover:bg-gray-200 dark:hover:bg-gray-800 rounded p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {openDocuments.length === 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            No documents open
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content Area */}
        <div
          className="bg-white dark:bg-gray-950 flex flex-col min-w-0"
          style={{ width: displayChat ? `${100 - chatWidth}%` : '100%' }}
        >
          {!isSpecialPage && (
            <div className="h-10 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 shrink-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {activeDocument?.name || 'No document selected'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleChat}
                className={`gap-2 ${!showChat ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 hover:bg-blue-100' : ''}`}
              >
                {!showChat && <span className="text-xs font-semibold uppercase tracking-wider mr-1">Open AI Chat</span>}
                {showChat ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRight className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {!activeDocument ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                Select a document to view
              </div>
            ) : activeDocument.type === 'project-settings' ? (
              <ProjectSettingsPage activeProject={activeProject} />
            ) : activeDocument.type === 'global-settings' ? (
              <GlobalSettingsPage />
            ) : activeDocument.type === 'welcome' ? (
              <WelcomePage onCreateProject={onCreateProject} onTabChange={onTabChange} />
            ) : activeDocument.type === 'skill' ? (
              <SkillEditor
                skill={JSON.parse(activeDocument.content)}
                workflows={workflows}
                onSave={onSkillSave || (() => { })}
              />
            ) : (
              <MarkdownEditor document={activeDocument} projectId={activeProject?.id} />
            )}
          </div>
        </div>

        {/* Resizer Handle */}
        {displayChat && (
          <div
            className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-500/30 dark:hover:bg-blue-400/20 cursor-col-resize transition-all shrink-0 z-10 active:bg-blue-500 active:w-2"
            onMouseDown={startResizing}
          />
        )}

        {/* Chat Panel - moved to right side */}
        {displayChat && (
          <div
            className="border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col shrink-0"
            style={{ width: `${chatWidth}%` }}
          >
            <ChatPanel activeProject={activeProject} skills={skills} />
          </div>
        )}
      </div>
    </div>
  );
}