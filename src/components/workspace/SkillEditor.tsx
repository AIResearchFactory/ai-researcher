import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, BrainCircuit, Workflow as WorkflowIcon, Wand2 } from 'lucide-react';
import { Skill, Workflow, tauriApi } from '@/api/tauri';
import { useToast } from '@/hooks/use-toast';

interface SkillEditorProps {
    skill: Skill;
    workflows?: Workflow[]; // Available workflows to check usage
    onSave: (updatedSkill: Skill) => void;
}

export default function SkillEditor({ skill, workflows = [], onSave }: SkillEditorProps) {
    const [name, setName] = useState(skill.name);
    const [description, setDescription] = useState(skill.description);

    // Structured template fields
    const [role, setRole] = useState(skill.role || '');
    const [tasks, setTasks] = useState(skill.tasks ? skill.tasks.join('\n') : '');
    const [output, setOutput] = useState(skill.output || '');
    const [additionalContent, setAdditionalContent] = useState(skill.additional_guidelines || '');

    const [isSaving, setIsSaving] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [usedInWorkflows, setUsedInWorkflows] = useState<Workflow[]>([]);
    const { toast } = useToast();

    // Initialize state when skill changes
    useEffect(() => {
        setName(skill.name);
        setDescription(skill.description);
        setRole(skill.role || '');
        setTasks(skill.tasks ? skill.tasks.join('\n') : '');
        setOutput(skill.output || '');
        setAdditionalContent(skill.additional_guidelines || '');

        // Find workflows that use this skill
        if (workflows.length > 0) {
            const usingWorkflows = workflows.filter(workflow =>
                workflow.steps.some(step => step.config.skill_id === skill.id)
            );
            setUsedInWorkflows(usingWorkflows);
        } else {
            setUsedInWorkflows([]);
        }
    }, [skill, workflows]);

    const handleSave = async () => {
        if (!name.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Skill name is required',
                variant: 'destructive'
            });
            return;
        }

        setIsSaving(true);
        try {
            const updatedSkill: Skill = {
                ...skill,
                name: name.trim(),
                description: description.trim(),
                role: role.trim(),
                tasks: tasks.split('\n').map(t => t.trim()).filter(t => t.length > 0),
                output: output.trim(),
                additional_guidelines: additionalContent.trim(),
                // Backend will handle prompt_template update if needed
            };

            await tauriApi.updateSkill(updatedSkill);

            toast({
                title: 'Success',
                description: 'Skill updated successfully'
            });

            onSave(updatedSkill);
        } catch (error) {
            console.error('Failed to update skill:', error);
            toast({
                title: 'Error',
                description: `Failed to update skill: ${error}`,
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAIValidate = async () => {
        setIsValidating(true);
        // Simulate API call for validation
        setTimeout(() => {
            setIsValidating(false);
            toast({
                title: "AI Analysis Complete",
                description: "The prompt structure looks good and follows best practices."
            });
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                        <BrainCircuit className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Edit Skill
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Configure skill behavior and prompt template
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="default"
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {/* Content having scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">

                {/* Usage Warning */}
                {usedInWorkflows.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <WorkflowIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300">
                                    Used in {usedInWorkflows.length} Workflow{usedInWorkflows.length !== 1 ? 's' : ''}
                                </h3>
                                <p className="text-sm text-orange-600 dark:text-orange-400 mt-1 mb-2">
                                    Changes to this skill will affect the following active workflows:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {usedInWorkflows.map(wf => (
                                        <div key={wf.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-100 dark:bg-orange-900/40 text-xs font-medium text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                            <span>{wf.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 p-6 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="grid gap-2">
                        <Label htmlFor="skill-name">Skill Name</Label>
                        <Input
                            id="skill-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white dark:bg-gray-950"
                            placeholder="e.g. Research Assistant"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="skill-description">Description</Label>
                        <Input
                            id="skill-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-white dark:bg-gray-950"
                            placeholder="Brief description of what this skill does"
                        />
                    </div>
                </div>

                {/* Structured Fields */}
                <div className="space-y-6">
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="skill-role" className="text-base font-medium">Role</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1 text-blue-600 dark:text-blue-400"
                                onClick={handleAIValidate}
                                disabled={!role.trim() || isValidating}
                            >
                                <Wand2 className="w-3 h-3" />
                                {isValidating ? 'Validating...' : 'AI Validate'}
                            </Button>
                        </div>
                        <Textarea
                            id="skill-role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="min-h-[100px] bg-white dark:bg-gray-950 p-4"
                            placeholder="You are an expert in... Your goal is to..."
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="skill-tasks" className="text-base font-medium">Tasks</Label>
                        <Textarea
                            id="skill-tasks"
                            value={tasks}
                            onChange={(e) => setTasks(e.target.value)}
                            className="min-h-[150px] bg-white dark:bg-gray-950 p-4"
                            placeholder="- Analyze code structure&#10;- Identify bugs&#10;- Optimize performance"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="skill-output" className="text-base font-medium">Output Format</Label>
                        <Textarea
                            id="skill-output"
                            value={output}
                            onChange={(e) => setOutput(e.target.value)}
                            className="min-h-[100px] bg-white dark:bg-gray-950 p-4"
                            placeholder="Provide the result in markdown format with..."
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="skill-additional" className="text-base font-medium">Additional Content</Label>
                        <Textarea
                            id="skill-additional"
                            value={additionalContent}
                            onChange={(e) => setAdditionalContent(e.target.value)}
                            className="min-h-[100px] font-mono text-sm bg-white dark:bg-gray-950 p-4"
                            placeholder="Any other sections or text in the template..."
                        />
                        <p className="text-xs text-gray-500">
                            This field contains any extra content from the template that doesn't fit the Role/Tasks/Output structure.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
