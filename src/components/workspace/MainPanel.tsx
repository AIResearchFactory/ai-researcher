import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, PanelRight } from 'lucide-react';
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

  // Determine layout mode
  const isDocOpen = !!activeDocument;
  const isChatDoc = activeDocument?.type === 'chat';
  const isWorkflow = !!activeWorkflow;
  const isSettings = activeDocument?.type === 'global-settings' || activeDocument?.type === 'project-settings';

  // State persistence: Chat should stay mounted even if hidden to keep history
  // Chat visible conditions: 
  // 1. Manual toggle (showChat) when a document is open
  // 2. OR No document is open (Chat is the default view)
  // 3. OR It's a chat document
  // 4. BUT never show during global-settings (though we keep it mounted)
  const shouldShowChatState = (!isDocOpen || showChat || isChatDoc) && activeDocument?.type !== 'global-settings';

  // Editor/Workflow/Content visible conditions:
  // 1. A document is open and it's NOT a chat document
  // 2. OR a workflow is active
  const shouldShowContent = (isDocOpen && !isChatDoc) || isWorkflow;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent font-sans relative">
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">

        {/* Content Panel (Editor or Workflow) */}
        <div
          className={`flex flex-col min-w-0 bg-background/40 backdrop-blur-sm ${isResizingState ? '' : 'transition-all duration-300 ease-in-out'} border-r border-white/5 ${!shouldShowContent ? 'hidden' : ''}`}
          style={{ width: shouldShowChatState ? `${100 - chatWidth}%` : '100%' }}
        >
          {isWorkflow ? (
            <div className="flex-1 flex overflow-hidden relative">
              <WorkflowCanvas
                workflow={activeWorkflow!}
                projectName={activeProject?.name || ''}
                projects={projects}
                skills={skills}
                onSave={onWorkflowSave || (() => { })}
                onRun={() => onWorkflowRun && onWorkflowRun(activeWorkflow!)}
                onNewSkill={onNewSkill}
              />
            </div>
          ) : isDocOpen && (
            <>
              {/* Document Tabs */}
              <div className="h-10 border-b border-white/5 bg-background/20 backdrop-blur-md flex items-center px-2 gap-1 overflow-x-auto shrink-0">
                {openDocuments.map((doc) => {
                  const isSpecialDoc = ['welcome', 'project-settings', 'global-settings', 'skill'].includes(doc.type) || doc.type === 'skill';
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

                {/* Toggle Chat Button */}
                {isDocOpen && !showChat && activeDocument?.type !== 'global-settings' && (
                  <div className="ml-auto pr-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleChat}
                      className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider gap-1.5 text-primary hover:bg-primary/10 transition-all border border-primary/20"
                    >
                      <PanelRight className="w-3.5 h-3.5" />
                      Show Chat
                    </Button>
                  </div>
                )}
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden relative">
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
            </>
          )}
        </div>

        {/* Resizer Handle */}
        {shouldShowContent && shouldShowChatState && (
          <div
            className="w-1 bg-white/5 hover:bg-primary/50 cursor-col-resize transition-colors z-20"
            onMouseDown={startResizing}
          />
        )}

        {/* Chat Panel - Always mounted, hidden via CSS to preserve state */}
        <div
          className={`flex flex-col shrink-0 ${isResizingState ? '' : 'transition-all duration-300 ease-in-out'} ${shouldShowContent ? 'bg-background/20 backdrop-blur-md' : 'flex-1 bg-transparent'} ${!shouldShowChatState ? 'hidden' : ''}`}
          style={shouldShowContent ? { width: `${chatWidth}%` } : { width: '100%' }}
        >
          <ChatPanel activeProject={activeProject} skills={skills} onToggleChat={onToggleChat} />
        </div>
      </div>
    </div>
  );
}