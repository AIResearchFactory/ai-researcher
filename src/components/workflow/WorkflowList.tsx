import { Plus, Activity, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Workflow as WorkflowType } from '@/api/tauri';

interface WorkflowListProps {
    workflows: WorkflowType[];
    activeWorkflowId?: string;
    onSelect: (workflow: WorkflowType) => void;
    onCreate: () => void;
    onRun: (workflow: WorkflowType) => void;
    onDelete: (workflow: WorkflowType) => void;
    isLoading?: boolean;
}

export default function WorkflowList({
    workflows,
    activeWorkflowId,
    onSelect,
    onCreate,
    onRun,
    onDelete,
    isLoading
}: WorkflowListProps) {
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Loading workflows...
            </div>
        );
    }

    return (
        <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 mb-3"
                    onClick={onCreate}
                >
                    <Plus className="w-4 h-4" />
                    New Workflow
                </Button>

                {workflows.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No workflows found</p>
                        <p className="text-xs mt-1">Create one to automate tasks</p>
                    </div>
                ) : (
                    workflows.map((workflow) => (
                        <div key={workflow.id} className="group relative flex items-center pr-1">
                            <Button
                                variant="ghost"
                                className={`flex-1 justify-start gap-2 pr-12 h-auto py-2 ${activeWorkflowId === workflow.id
                                    ? 'bg-primary/10 text-primary'
                                    : ''
                                    }`}
                                onClick={() => onSelect(workflow)}
                            >
                                <Activity className={`w-4 h-4 shrink-0 ${activeWorkflowId === workflow.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                    <span className="truncate font-medium w-full text-left">{workflow.name}</span>
                                    <span className="text-[10px] text-muted-foreground truncate w-full text-left">
                                        {workflow.steps.length} steps • {workflow.status || 'Draft'}
                                    </span>
                                </div>
                            </Button>

                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-success/10 hover:text-success"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRun(workflow);
                                    }}
                                    title="Run Workflow"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete workflow "${workflow.name}"?`)) {
                                            onDelete(workflow);
                                        }
                                    }}
                                    title="Delete Workflow"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>
    );
}
