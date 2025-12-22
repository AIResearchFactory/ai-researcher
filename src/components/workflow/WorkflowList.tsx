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
    isLoading?: boolean;
}

export default function WorkflowList({
    workflows,
    activeWorkflowId,
    onSelect,
    onCreate,
    onRun,
    isLoading
}: WorkflowListProps) {
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
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
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No workflows found</p>
                        <p className="text-xs mt-1">Create one to automate tasks</p>
                    </div>
                ) : (
                    workflows.map((workflow) => (
                        <div key={workflow.id} className="group relative">
                            <Button
                                variant="ghost"
                                className={`w-full justify-start gap-2 pr-10 ${activeWorkflowId === workflow.id
                                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                                    : ''
                                    }`}
                                onClick={() => onSelect(workflow)}
                            >
                                <Activity className={`w-4 h-4 ${activeWorkflowId === workflow.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                    <span className="truncate font-medium">{workflow.name}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                        {workflow.steps.length} steps • {workflow.status || 'Draft'}
                                    </span>
                                </div>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRun(workflow);
                                }}
                                title="Run Workflow"
                            >
                                <Play className="w-3 h-3 fill-green-500 text-green-500" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>
    );
}
