import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FolderOpen, BrainCircuit, FileText, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Sidebar({
  projects,
  skills,
  activeProject,
  activeTab,
  onProjectSelect,
  onTabChange,
  onDocumentOpen,
  onNewProject,
  onNewSkill
}) {
  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-gray-200 dark:border-gray-800 bg-transparent h-12">
          <TabsTrigger value="projects" className="gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-900">
            <FolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-900">
            <BrainCircuit className="w-4 h-4" />
            <span className="hidden sm:inline">Skills</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2 mb-3"
                onClick={onNewProject}
              >
                <Plus className="w-4 h-4" />
                New Project
              </Button>
              
              {projects.map((project) => (
                <div key={project.id}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-2 ${
                      activeProject?.id === project.id 
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400' 
                        : ''
                    }`}
                    onClick={() => onProjectSelect(project)}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span className="truncate">{project.name}</span>
                  </Button>
                  
                  {activeProject?.id === project.id && project.documents && (
                    <div className="ml-6 mt-1 space-y-1">
                      {project.documents.map((doc) => (
                        <Button
                          key={doc.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 text-xs"
                          onClick={() => onDocumentOpen(doc)}
                        >
                          {doc.type === 'chat' ? (
                            <MessageSquare className="w-3 h-3" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                          <span className="truncate">{doc.name}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="skills" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <div className="mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={onNewSkill}
                >
                  <Plus className="w-4 h-4" />
                  Create New Skill
                </Button>
              </div>
              
              <div className="space-y-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <BrainCircuit className="w-4 h-4 mt-0.5 text-purple-600 dark:text-purple-500" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {skill.name}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                          {skill.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}