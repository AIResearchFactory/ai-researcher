import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Folder, Zap, FileText, MessageSquare, Plus, Activity, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import WorkflowList from '../workflow/WorkflowList';
import { useToast } from '@/hooks/use-toast';
import { tauriApi } from '@/api/tauri';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface Document {
  id: string;
  name: string;
  type: string;
  content: string;
}

import { Project, Skill, Workflow } from '@/api/tauri';

interface SidebarProps {
  projects: (Project & { documents?: Document[] })[];
  skills: Skill[];
  activeProject: (Project & { documents?: Document[] }) | null;
  activeTab: string;
  onProjectSelect: (project: Project) => void | Promise<void>;
  onTabChange: (tab: string) => void;
  onDocumentOpen: (doc: Document) => void;
  onNewProject: () => void;
  onNewSkill: () => void;
  onSkillSelect?: (skill: Skill) => void;
  // Workflow props
  workflows?: Workflow[];
  activeWorkflowId?: string;
  onWorkflowSelect?: (workflow: any) => void;
  onNewWorkflow?: () => void;
  onRunWorkflow?: (workflow: any) => void;
}

export default function Sidebar({
  projects,
  skills,
  activeProject,
  activeTab,
  onProjectSelect,
  onTabChange,
  onDocumentOpen,
  onNewProject,
  onNewSkill,
  onSkillSelect,
  workflows = [],
  activeWorkflowId,
  onWorkflowSelect,
  onNewWorkflow,
  onRunWorkflow
}: SidebarProps) {
  const { toast } = useToast();

  const handleDeleteFile = async (project: Project, doc: Document) => {
    try {
      if (!confirm(`Are you sure you want to delete ${doc.name}?`)) return;

      await tauriApi.deleteMarkdownFile(project.id, doc.name);
      toast({ title: "File deleted", description: `${doc.name} deleted successfully.` });
    } catch (error) {
      console.error("Failed to delete file", error);
      toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" });
    }
  };

  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-3 border-b border-gray-200 dark:border-gray-800 bg-transparent h-12 shrink-0">
          <TabsTrigger
            value="projects"
            className="gap-2 text-sm font-medium text-gray-500 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50/50 dark:data-[state=active]:bg-blue-950/20 dark:data-[state=active]:text-blue-400 border-b-2 border-transparent data-[state=active]:border-blue-600 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <Folder className="w-4 h-4" />
            <span>Projects</span>
          </TabsTrigger>
          <TabsTrigger
            value="skills"
            className="gap-2 text-sm font-medium text-gray-500 data-[state=active]:text-purple-600 data-[state=active]:bg-purple-50/50 dark:data-[state=active]:bg-purple-950/20 dark:data-[state=active]:text-purple-400 border-b-2 border-transparent data-[state=active]:border-purple-600 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <Zap className="w-4 h-4" />
            <span>Skills</span>
          </TabsTrigger>
          <TabsTrigger
            value="workflows"
            className="gap-2 text-sm font-medium text-gray-500 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-50/50 dark:data-[state=active]:bg-orange-950/20 dark:data-[state=active]:text-orange-400 border-b-2 border-transparent data-[state=active]:border-orange-600 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <Activity className="w-4 h-4" />
            <span>Flows</span>
          </TabsTrigger>
        </TabsList>

        {/* Projects Content */}
        <TabsContent value="projects" className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="px-1 py-3 space-y-1">
              <div className="px-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={onNewProject}
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
              </div>

              {projects.map((project) => (
                <div key={project.id}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-2 px-2 ${activeProject?.id === project.id
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                      : ''
                      }`}
                    onClick={() => onProjectSelect(project)}
                  >
                    <Folder className={`w-4 h-4 shrink-0 ${activeProject?.id === project.id ? 'fill-blue-200/50 dark:fill-blue-900/50' : ''}`} />
                    <span className="truncate">{project.name}</span>
                  </Button>

                  {activeProject?.id === project.id && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 dark:border-gray-800 pl-3">
                      {project.documents && project.documents.length > 0 ? project.documents.map((doc) => (
                        <ContextMenu key={doc.id}>
                          <ContextMenuTrigger>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2 text-xs h-7 px-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                              onClick={() => onDocumentOpen(doc)}
                            >
                              {doc.type === 'chat' ? (
                                <MessageSquare className="w-3 h-3 shrink-0" />
                              ) : (
                                <FileText className="w-3 h-3 shrink-0" />
                              )}
                              <span className="truncate">{doc.name}</span>
                            </Button>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:text-red-400 dark:focus:bg-red-900/20"
                              onSelect={() => handleDeleteFile(project, doc)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete File
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )) : (
                        <div className="text-xs text-gray-400 py-1 px-2 italic">No documents</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Skills Content */}
        <TabsContent value="skills" className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
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
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-all group"
                    onClick={() => onSkillSelect && onSkillSelect(skill)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-950/50 transition-colors">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {skill.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
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

        {/* Workflows Content */}
        <TabsContent value="workflows" className="flex-1 overflow-hidden flex flex-col">
          <WorkflowList
            workflows={workflows}
            activeWorkflowId={activeWorkflowId}
            onSelect={onWorkflowSelect || (() => { })}
            onCreate={onNewWorkflow || (() => { })}
            onRun={onRunWorkflow || (() => { })}
            isLoading={false}
          />
        </TabsContent>
      </Tabs>
    </div >
  );
}