import { useCallback, useEffect, useState, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    ReactFlowProvider,
    useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Workflow, WorkflowStep } from '@/api/tauri';
import StepNode, { StepNodeData } from './nodes/StepNode';
import WorkflowToolbar from './WorkflowToolbar';

// Define StepNode type outside to avoid re-creation
const nodeTypes = {
    step: StepNode,
};

interface WorkflowCanvasProps {
    workflow: Workflow;
    projectName: string;
    onSave: (workflow: Workflow) => void;
    onRun: () => void;
    isRunning?: boolean;
}

function WorkflowCanvasContent({ workflow, projectName, onSave, onRun, isRunning }: WorkflowCanvasProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView, zoomIn, zoomOut } = useReactFlow();

    // Initialize graph from workflow steps
    useEffect(() => {
        if (!workflow.steps) return;

        // TODO: A better auto-layout algorithm would be good here.
        // For now, simpler horizontal spacing.
        const newNodes: Node[] = workflow.steps.map((step, index) => ({
            id: step.id,
            type: 'step',
            position: { x: index * 300, y: 100 },
            data: {
                label: step.name,
                skillName: step.config?.skill_id || 'No Skill Selected',
                status: 'Pending', // TODO: sync with execution state
                onEdit: () => console.log('Edit step', step.id)
            }
        }));

        const newEdges: Edge[] = [];
        workflow.steps.forEach(step => {
            step.depends_on?.forEach(depId => {
                newEdges.push({
                    id: `e${depId}-${step.id}`,
                    source: depId,
                    target: step.id,
                    animated: true,
                    style: { stroke: '#94a3b8' }
                });
            });
        });

        setNodes(newNodes);
        setEdges(newEdges);
        setTimeout(() => fitView(), 100);
    }, [workflow.id]); // Only re-init when workflow ID changes

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges],
    );

    const handleAddStep = () => {
        const id = `step_${nodes.length + 1}`;
        const newNode: Node = {
            id,
            type: 'step',
            position: { x: nodes.length * 300 + 50, y: 150 },
            data: {
                label: `New Step ${nodes.length + 1}`,
                status: 'Pending',
                onEdit: () => console.log('Edit new step')
            }
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const handleSave = () => {
        // Need to convert nodes/edges back to Workflow structure
        // For now just passing back the original workflow to simulate save
        onSave(workflow);
    };

    return (
        <div className="h-full w-full relative bg-gray-50 dark:bg-gray-950">
            <WorkflowToolbar
                workflowName={workflow.name}
                projectName={projectName}
                onSave={handleSave}
                onRun={onRun}
                onAddStep={handleAddStep}
                onZoomIn={() => zoomIn()}
                onZoomOut={() => zoomOut()}
                onFitView={() => fitView()}
                isRunning={isRunning}
            />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background gap={12} size={1} />
                <Controls showInteractive={false} className="!bottom-4 !right-4" />
            </ReactFlow>
        </div>
    );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
    return (
        <ReactFlowProvider>
            <WorkflowCanvasContent {...props} />
        </ReactFlowProvider>
    );
}
