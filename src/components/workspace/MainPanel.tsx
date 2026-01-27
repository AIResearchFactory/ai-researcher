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
  activeProject: { id: string; name: string; description?: string; documents?: Document[] } | null;
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
  const [isResizingState, setIsResizingState] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const startResizing = () => {
    isResizing.current = true;
    setIsResizingState(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  };

  const stopResizing = () => {
    isResizing.current = false;
    setIsResizingState(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;

    // Calculate percentage from right relative to container
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseXRelative = e.clientX - containerRect.left;

    // Distance from right edge
    const offsetFromRight = containerWidth - mouseXRelative;

    const percentage = (offsetFromRight / containerWidth) * 100;

    // Constrain between 20% and 80%
    if (percentage > 20 && percentage < 80) {
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

  // Determine layout mode
  const isDocOpen = !!activeDocument;
  const isChatDoc = activeDocument?.type === 'chat';

  const isSpecialPage = isDocOpen && (activeDocument?.type === 'project-settings' ||
    activeDocument?.type === 'global-settings' ||
    activeDocument?.type === 'welcome');

  // If a document is open, we show chat based on `showChat`. 
  // If NO document is open, we ALWAYS show chat (it's the main view).
  const shouldShowChat = (!isDocOpen || showChat || isChatDoc) && activeDocument?.type !== 'global-settings';

  // Only show editor if it's NOT a chat document (because chat docs are displayed in the ChatPanel)
  const shouldShowEditor = isDocOpen && !isChatDoc;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent font-sans relative">
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">

        {/* Editor Panel (Only visible if doc is open) */}
        {shouldShowEditor && (
          <div
            className={`flex flex-col min-w-0 bg-background/40 backdrop-blur-sm ${isResizingState ? '' : 'transition-all duration-300 ease-in-out'} border-r border-white/5`}
            style={{ width: shouldShowChat ? `${100 - chatWidth}%` : '100%' }}
          >
            {/* Document Tabs */}
            <div className="h-10 border-b border-white/5 bg-background/20 backdrop-blur-md flex items-center px-2 gap-1 overflow-x-auto shrink-0">
              {openDocuments.map((doc) => {
                const isSpecialDoc = ['welcome', 'project-settings', 'global-settings', 'skill'].includes(doc.type) || doc.type === 'skill';
                // Check if document belongs to active project
                // We assume doc.id matches filename in project documents
                const belongsToProject = isSpecialDoc || (activeProject?.documents?.some(d => d.id === doc.id));

                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-xs font-medium cursor-pointer transition-colors border-t border-x ${activeDocument?.id === doc.id
                      ? 'bg-background/60 text-primary border-white/10 border-b-background/60 -mb-px'
                      : 'bg-transparent text-muted-foreground border-transparent hover:bg-white/5'
                      } ${!belongsToProject ? 'opacity-50 italic' : ''}`}
                    onClick={() => onDocumentSelect(doc)}
                  >
                    <span className="truncate max-w-[150px]">{doc.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDocumentClose(doc.id);
                      }}
                      className="hover:bg-white/10 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {openDocuments.length === 0 && (
                <span className="text-xs text-muted-foreground ml-2">Select a file...</span>
              )}
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-hidden relative">
              {!isSpecialPage && (
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleChat}
                    className={`h-7 px-2 text-xs gap-1.5 backdrop-blur-md border border-white/10 shadow-sm ${!showChat ? 'bg-primary/20 text-primary' : 'bg-background/40 text-muted-foreground'}`}
                  >
                    {showChat ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
                    {showChat ? 'Hide Chat' : 'Show Chat'}
                  </Button>
                </div>
              )}

              {activeDocument.type === 'project-settings' ? (
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
                (() => {
                  const isSpecialDoc = ['welcome', 'project-settings', 'global-settings', 'skill'].includes(activeDocument.type) || activeDocument.type === 'skill';
                  const belongsToProject = isSpecialDoc || (activeProject?.documents?.some(d => d.id === activeDocument.id));

                  if (!belongsToProject && activeProject) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 text-center p-8">
                        <div className="max-w-md space-y-4 opacity-70">
                          <div className="text-4xl">🔒</div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            File Unavailable
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            This file belongs to a different project. Please switch to the project containing this file to view or edit it.
                          </p>
                          <div className="pt-4">
                            <Button variant="outline" onClick={() => onDocumentClose(activeDocument.id)}>
                              Close File
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return <MarkdownEditor document={activeDocument} projectId={activeProject?.id} />;
                })()
              )}
            </div>
          </div>
        )}

        {/* Resizer Handle (Only if split view) */}
        {shouldShowEditor && shouldShowChat && (
          <div
            className="w-1 bg-white/5 hover:bg-primary/50 cursor-col-resize transition-colors z-20"
            onMouseDown={startResizing}
          />
        )}

        {/* Chat Panel (Centralized if no doc, Side if doc) */}
        {shouldShowChat && (
          <div
            className={`flex flex-col shrink-0 ${isResizingState ? '' : 'transition-all duration-300 ease-in-out'} ${shouldShowEditor ? 'bg-background/20 backdrop-blur-md' : 'flex-1 bg-transparent'}`}
            style={shouldShowEditor ? { width: `${chatWidth}%` } : { width: '100%' }}
          >
            <ChatPanel activeProject={activeProject} skills={skills} />
          </div>
        )}
      </div>
    </div>
  );
}