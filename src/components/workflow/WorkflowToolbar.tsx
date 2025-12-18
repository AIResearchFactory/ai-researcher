import { Button } from '@/components/ui/button';
import { Save, Play, Plus, ZoomIn, ZoomOut, Layout } from 'lucide-react';

interface WorkflowToolbarProps {
    workflowName: string;
    projectName: string;
    onSave: () => void;
    onRun: () => void;
    onAddStep: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitView: () => void;
    isSaving?: boolean;
    isRunning?: boolean;
}

export default function WorkflowToolbar({
    workflowName,
    projectName,
    onSave,
    onRun,
    onAddStep,
    onZoomIn,
    onZoomOut,
    onFitView,
    isSaving = false,
    isRunning = false
}: WorkflowToolbarProps) {
    return (
        <div className="absolute top-4 left-4 right-4 h-14 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm flex items-center justify-between px-4 z-10">
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                        {workflowName || 'Untitled Workflow'}
                    </h2>
                    <span className="text-xs text-gray-400 dark:text-gray-500 px-2 border-l border-gray-200 dark:border-gray-700">
                        {projectName}
                    </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Drag nodes to connect
                </p>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
                        <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitView}>
                        <Layout className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
                        <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </Button>
                </div>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={onAddStep}
                    className="gap-2 text-xs"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add Step
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={onSave}
                    disabled={isSaving}
                    className="gap-2 text-xs"
                >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>

                <Button
                    size="sm"
                    onClick={onRun}
                    disabled={isRunning}
                    className="gap-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isRunning ? 'Running...' : 'Run Workflow'}
                </Button>

            </div>
        </div>
    );
}
