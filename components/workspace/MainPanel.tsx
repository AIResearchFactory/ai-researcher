import React from 'react';
import { Button } from '@/components/ui/button';
import { X, PanelLeftClose, PanelLeft } from 'lucide-react';
import ChatPanel from './ChatPanel';
import MarkdownEditor from './MarkdownEditor';
import ProjectSettingsPage from '../../pages/ProjectSettings';
import GlobalSettingsPage from '../../pages/GlobalSettings';
import WelcomePage from '../../pages/Welcome';

export default function MainPanel({
  activeProject,
  openDocuments,
  activeDocument,
  showChat,
  onDocumentSelect,
  onDocumentClose,
  onToggleChat,
  onCreateProject
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Document Tabs */}
      <div className="h-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center px-2 gap-1 overflow-x-auto">
        {openDocuments.map((doc) => (
          <div
            key={doc.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-sm cursor-pointer transition-colors ${
              activeDocument?.id === doc.id
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
        {/* Chat Panel - only show for regular documents, not settings or welcome */}
        {showChat && activeDocument?.type !== 'project-settings' && activeDocument?.type !== 'global-settings' && activeDocument?.type !== 'welcome' && (
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <ChatPanel activeProject={activeProject} />
          </div>
        )}
        
        {/* Content Area */}
        <div className={`${showChat && activeDocument?.type !== 'project-settings' && activeDocument?.type !== 'global-settings' && activeDocument?.type !== 'welcome' ? 'w-1/2' : 'w-full'} bg-white dark:bg-gray-950 flex flex-col`}>
          {activeDocument?.type !== 'project-settings' && activeDocument?.type !== 'global-settings' && activeDocument?.type !== 'welcome' && (
            <div className="h-10 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {activeDocument?.name || 'No document selected'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleChat}
              >
                {showChat ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeft className="w-4 h-4" />
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
              <WelcomePage onCreateProject={onCreateProject} />
            ) : (
              <MarkdownEditor document={activeDocument} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}