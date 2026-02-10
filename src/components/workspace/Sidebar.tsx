import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Folder, Zap, FileText, MessageSquare, Plus, Activity, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import WorkflowList from '../workflow/WorkflowList';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { motion, AnimatePresence } from 'framer-motion';


import { Project, Skill, Workflow } from '@/api/tauri';

interface Document {
  id: string;
  name: string;
  type: string;
  content: string;
}

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
  onDeleteWorkflow?: (workflow: any) => void;
  // Context Menu Handlers
  onDeleteProject?: (projectId: string) => void;
  onRenameProject?: (projectId: string, newName: string) => void;
  onAddFileToProject?: (projectId: string) => void;
  onDeleteFile?: (projectId: string, fileId: string) => void;
  onRenameFile?: (projectId: string, fileId: string, newName: string) => void;
  onImportSkill?: () => void;
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
  onRunWorkflow,
  onDeleteWorkflow,
  // Context Menu Handlers
  onDeleteProject,

  onAddFileToProject,
  onDeleteFile,
  onRenameFile,
  onImportSkill
}: SidebarProps) {




  return (
    <div className="w-64 border-r border-border bg-background/40 backdrop-blur-2xl flex flex-col shadow-[1px_0_30px_rgba(0,0,0,0.05)] relative z-20">
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col min-h-0">
        <div className="p-2 border-b border-border bg-background/20 backdrop-blur-md shrink-0">
          <TabsList className="w-full grid grid-cols-3 bg-muted p-1 h-10 rounded-lg">
            <TabsTrigger
              value="projects"
              className="gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all py-1.5"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Projects</span>
            </TabsTrigger>
            <TabsTrigger
              value="skills"
              className="gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all py-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Skills</span>
            </TabsTrigger>
            <TabsTrigger
              value="workflows"
              className="gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all py-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Flows</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Projects Content */}
        <TabsContent value="projects" className="flex-1 overflow-hidden flex flex-col m-0 outline-none">
          <div className="px-4 pt-4 pb-2 flex justify-between items-center shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Library</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={onNewProject}
              title="New Project"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 py-2 space-y-1">
              <AnimatePresence>
                {projects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div
                      className={`relative flex items-center group rounded-lg transition-all duration-200 ${activeProject?.id === project.id
                        ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]'
                        : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {activeProject?.id === project.id && (
                        <motion.div
                          layoutId="active-nav-indicator"
                          className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                        />
                      )}
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <button
                            className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-left truncate w-full"
                            onClick={() => onProjectSelect(project)}
                            onContextMenu={() => {
                              // Select project on right click too, usually good UX
                              onProjectSelect(project);
                            }}
                          >
                            <Folder className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeProject?.id === project.id ? 'fill-primary/20' : ''}`} />
                            <span className="truncate">{project.name}</span>
                            {activeProject?.id === project.id && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                              </motion.div>
                            )}
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem onClick={() => onAddFileToProject && onAddFileToProject(project.id)}>
                            <Plus className="mr-2 h-4 w-4" /> Add File
                          </ContextMenuItem>
                          {/* Rename not yet implemented fully but adding menu item */}
                          {/* <ContextMenuItem onClick={() => onRenameProject && onRenameProject(project.id, project.name)}>
                            <Edit className="mr-2 h-4 w-4" /> Rename
                          </ContextMenuItem> */}
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => onDeleteProject && onDeleteProject(project.id)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                          >
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                              Delete Project
                            </span>
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>

                    <AnimatePresence>
                      {activeProject?.id === project.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-7 mt-1 mb-2 space-y-0.5 border-l-2 border-primary/10 pl-2">
                            {project.documents && project.documents.length > 0 ? project.documents.map((doc) => (
                              <ContextMenu key={doc.id}>
                                <ContextMenuTrigger asChild>
                                  <button
                                    className="w-full flex items-center gap-2.5 text-xs py-1.5 px-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all group/item"
                                    onClick={() => onDocumentOpen(doc)}
                                    aria-label={`Open ${doc.name}`}
                                  >
                                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                      {doc.type === 'chat' ? (
                                        <MessageSquare className="w-3 h-3 text-emerald-500/70 group-hover/item:text-emerald-500 transition-colors" />
                                      ) : (
                                        <FileText className="w-3 h-3 text-primary/70 group-hover/item:text-primary transition-colors" />
                                      )}
                                    </div>
                                    <span className="truncate text-[11px] font-medium">{doc.name}</span>
                                  </button>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem onClick={() => {
                                    const newName = prompt('New file name:', doc.name);
                                    if (newName && onRenameFile) onRenameFile(project.id, doc.id, newName);
                                  }}>
                                    Rename
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={() => onDeleteFile && onDeleteFile(project.id, doc.id)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                                  >
                                    <span className="flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-3.5 w-3.5"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                      Delete File
                                    </span>
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            )) : (
                              <div className="text-[10px] text-muted-foreground/40 py-2 px-2 italic font-light tracking-wide uppercase">Empty project</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Skills Content */}
        <TabsContent value="skills" className="flex-1 overflow-hidden flex flex-col m-0 outline-none">
          <div className="px-4 pt-4 pb-2 flex justify-between items-center shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Registry</h3>
            <div className="flex gap-1">
              {onImportSkill && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                  onClick={onImportSkill}
                  title="Import Skill"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={onNewSkill}
                title="New Skill"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 py-2 space-y-2">
              <AnimatePresence>
                {skills.map((skill) => (
                  <motion.div
                    key={skill.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:shadow-md hover:shadow-black/5 cursor-pointer transition-all group relative overflow-hidden"
                    onClick={() => onSkillSelect && onSkillSelect(skill)}
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 shadow-sm border border-purple-500/10 group-hover:scale-110 transition-transform">
                        <Zap className="w-3.5 h-3.5 fill-purple-500/20" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors tracking-tight">
                          {skill.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed font-medium">
                          {skill.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Workflows Content */}
        <TabsContent value="workflows" className="flex-1 overflow-hidden flex flex-col m-0 outline-none">
          <WorkflowList
            workflows={workflows}
            activeWorkflowId={activeWorkflowId}
            onSelect={onWorkflowSelect || (() => { })}
            onCreate={onNewWorkflow || (() => { })}
            onRun={onRunWorkflow || (() => { })}
            onDelete={onDeleteWorkflow || (() => { })}
            isLoading={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}