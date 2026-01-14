import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, BrainCircuit, Workflow as WorkflowIcon, Wand2, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Skill, SkillParameter, SkillExample, Workflow, tauriApi } from '@/api/tauri';
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

    // Extended fields
    const [capabilities, setCapabilities] = useState<string[]>(skill.capabilities || []);
    const [parameters, setParameters] = useState<SkillParameter[]>(skill.parameters || []);
    const [examples, setExamples] = useState<SkillExample[]>(skill.examples || []);

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        capabilities: false,
        parameters: false,
        examples: false
    });

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
        setCapabilities(skill.capabilities || []);
        setParameters(skill.parameters || []);
        setExamples(skill.examples || []);

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
                capabilities: capabilities.filter(c => c.trim().length > 0),
                parameters,
                examples,
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

    const addCapability = () => setCapabilities([...capabilities, '']);
    const updateCapability = (index: number, value: string) => {
        const newCaps = [...capabilities];
        newCaps[index] = value;
        setCapabilities(newCaps);
    };
    const removeCapability = (index: number) => {
        setCapabilities(capabilities.filter((_, i) => i !== index));
    };

    const addParameter = () => {
        setParameters([...parameters, {
            name: '',
            type: 'string',
            description: '',
            required: false
        }]);
    };
    const updateParameter = (index: number, field: keyof SkillParameter, value: any) => {
        const newParams = [...parameters];
        newParams[index] = { ...newParams[index], [field]: value };
        setParameters(newParams);
    };
    const removeParameter = (index: number) => {
        setParameters(parameters.filter((_, i) => i !== index));
    };

    const addExample = () => {
        setExamples([...examples, {
            title: '',
            input: '',
            expected_output: ''
        }]);
    };
    const updateExample = (index: number, field: keyof SkillExample, value: string) => {
        const newExamples = [...examples];
        newExamples[index] = { ...newExamples[index], [field]: value };
        setExamples(newExamples);
    };
    const removeExample = (index: number) => {
        setExamples(examples.filter((_, i) => i !== index));
    };

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
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

                    <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-6">
                        {/* Capabilities Section */}
                        <div className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('capabilities')}
                                className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <span className="text-base font-medium">Capabilities</span>
                                {openSections.capabilities ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            {openSections.capabilities && (
                                <div className="p-4 space-y-4 bg-white dark:bg-gray-950">
                                    {capabilities.map((cap, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={cap}
                                                onChange={(e) => updateCapability(index, e.target.value)}
                                                placeholder="e.g. web_search"
                                                className="bg-white dark:bg-gray-950"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeCapability(index)} className="text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addCapability} className="w-full gap-2 border-dashed">
                                        <Plus className="w-4 h-4" /> Add Capability
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Parameters Section */}
                        <div className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('parameters')}
                                className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <span className="text-base font-medium">Parameters</span>
                                {openSections.parameters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            {openSections.parameters && (
                                <div className="p-4 space-y-6 bg-white dark:bg-gray-950">
                                    {parameters.map((param, index) => (
                                        <div key={index} className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg space-y-4 bg-gray-50/30 dark:bg-gray-900/10">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-sm font-semibold">Parameter #{index + 1}</h4>
                                                <Button variant="ghost" size="sm" onClick={() => removeParameter(index)} className="text-red-500 h-8 gap-1">
                                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Name</Label>
                                                    <Input
                                                        value={param.name}
                                                        onChange={(e) => updateParameter(index, 'name', e.target.value)}
                                                        placeholder="param_name"
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Type</Label>
                                                    <select
                                                        value={param.type}
                                                        onChange={(e) => updateParameter(index, 'type', e.target.value as any)}
                                                        className="w-full h-8 text-sm rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="string">String</option>
                                                        <option value="number">Number</option>
                                                        <option value="boolean">Boolean</option>
                                                        <option value="array">Array</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Description</Label>
                                                <Input
                                                    value={param.description}
                                                    onChange={(e) => updateParameter(index, 'description', e.target.value)}
                                                    placeholder="What this parameter is for..."
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`req-${index}`}
                                                    checked={param.required}
                                                    onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <Label htmlFor={`req-${index}`} className="text-xs cursor-pointer">Required</Label>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addParameter} className="w-full gap-2 border-dashed">
                                        <Plus className="w-4 h-4" /> Add Parameter
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Examples Section */}
                        <div className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('examples')}
                                className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <span className="text-base font-medium">Examples</span>
                                {openSections.examples ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            {openSections.examples && (
                                <div className="p-4 space-y-6 bg-white dark:bg-gray-950">
                                    {examples.map((example, index) => (
                                        <div key={index} className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg space-y-4 bg-gray-50/30 dark:bg-gray-900/10">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-sm font-semibold">Example #{index + 1}</h4>
                                                <Button variant="ghost" size="sm" onClick={() => removeExample(index)} className="text-red-500 h-8 gap-1">
                                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Title</Label>
                                                <Input
                                                    value={example.title}
                                                    onChange={(e) => updateExample(index, 'title', e.target.value)}
                                                    placeholder="Example Title"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Input</Label>
                                                    <Textarea
                                                        value={example.input}
                                                        onChange={(e) => updateExample(index, 'input', e.target.value)}
                                                        placeholder="Sample input text..."
                                                        className="min-h-[80px] text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Expected Output</Label>
                                                    <Textarea
                                                        value={example.expected_output}
                                                        onChange={(e) => updateExample(index, 'expected_output', e.target.value)}
                                                        placeholder="Expected output text..."
                                                        className="min-h-[80px] text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addExample} className="w-full gap-2 border-dashed">
                                        <Plus className="w-4 h-4" /> Add Example
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
