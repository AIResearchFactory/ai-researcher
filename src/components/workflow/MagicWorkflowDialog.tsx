import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Wand2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tauriApi, Skill, WorkflowStep } from '@/api/tauri';
import { SKILL_REGISTRY } from '@/data/skills_registry';

interface MagicWorkflowDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onWorkflowGenerated: (name: string, steps: WorkflowStep[]) => void;
    installedSkills: Skill[];
}

export default function MagicWorkflowDialog({
    open,
    onOpenChange,
    onWorkflowGenerated,
    installedSkills
}: MagicWorkflowDialogProps) {
    const [prompt, setPrompt] = useState('');
    const [outputTarget, setOutputTarget] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsLoading(true);
        setError(null);
        setStatus('Analyzing request...');

        try {
            // 1. Construct prompt for the AI Architect
            const registryContext = SKILL_REGISTRY.map(s => `- ${s.name} (Command: ${s.command}): ${s.description}`).join('\n');
            const installedContext = installedSkills.map(s => `- ${s.name} (ID: ${s.id})`).join('\n');

            const systemPrompt = `You are an expert Workflow Architect for an AI agent system. 
Your goal is to interpret a user's natural language request and design a multi-step workflow.

Available capabilities in the Registry (you can prescribe these):
${registryContext}

Currently Installed Skills:
${installedContext}

User Request: "${prompt}"
User Desired Output Filename: "${outputTarget || 'Decide automatically'}"

Instructions:
1. Analyze the request to determine the necessary steps.
2. For each step, identify if an existing installed skill can be used, or if a new skill from the registry is needed.
3. If a registry skill is needed, or if you know of a valid \`npx\` command for a relevant skill (e.g. from val.town or github), you MUST include its "command" in the response so the system can install it.
4. If the request implies a skill not in the registry and you don't know a command, suggest the closest match or a generic "Research" node using an installed skill.
5. If you need a capability not listed, you can suggest installing a new skill by providing a valid \`npx\` command (e.g., from val.town or github).
6. Create a sequential or parallel flow.
7. IMPORTANT: Generate meaningful filenames for "output_file".
8. If "User Desired Output Filename" is provided, ensure the FINAL step writes to that exact file path. Do NOT use subdirectories.

Output strictly valid JSON with this structure:
{
  "workflow_name": "Short Descriptive Name",
  "description": "Brief description of what this workflow does",
  "skills_to_install": [
    { "name": "Skill Name", "command": "npx command..." } 
  ],
  "steps": [
    {
      "name": "Step Name",
      "step_type": "agent", 
      "skill_name_ref": "Exact name of the skill to use",
      "output_file": "descriptive_filename.md",
      "description": "What this step does"
    }
  ]
}
Do not output markdown code blocks, just the raw JSON.`;

            // 2. Call AI
            const response = await tauriApi.sendMessage([
                { role: 'user', content: systemPrompt }
            ]);

            const responseContent = response.content.replace(/```json/g, '').replace(/```/g, '').trim();

            let plan;
            try {
                plan = JSON.parse(responseContent);
            } catch (e) {
                console.error("Failed to parse AI response", responseContent);
                throw new Error("AI Agent returned invalid plan format.");
            }

            // 3. Install missing skills
            if (plan.skills_to_install && plan.skills_to_install.length > 0) {
                for (const skillToInstall of plan.skills_to_install) {
                    setStatus(`Installing skill: ${skillToInstall.name}...`);

                    // Check if already installed to avoid redundant work
                    if (!installedSkills.some(s => s.name === skillToInstall.name)) {
                        try {
                            await tauriApi.importSkill(skillToInstall.command);
                        } catch (err) {
                            console.warn(`Failed to install ${skillToInstall.name}, seeing if we can proceed...`, err);
                            // We continue, hoping maybe it exists or user can fix it later
                        }
                    }
                }
            }

            setStatus('Finalizing workflow...');

            // Refresh skills list to get IDs of newly installed skills
            const updatedSkills = await tauriApi.getAllSkills();

            // 4. Construct Workflow Steps
            const newSteps: WorkflowStep[] = [];

            for (let i = 0; i < plan.steps.length; i++) {
                const planStep = plan.steps[i];
                const matchedSkill = updatedSkills.find(s => s.name === planStep.skill_name_ref)
                    || updatedSkills.find(s => s.name.includes(planStep.skill_name_ref))
                    || updatedSkills[0]; // Fallback

                if (!matchedSkill) {
                    console.error('No matching skill found and no fallback available.', {
                        requested: planStep.skill_name_ref,
                        available: updatedSkills.map(s => s.name)
                    });
                    throw new Error(`Failed to find a valid skill for step "${planStep.name}". Please ensure at least one skill is installed.`);
                }

                const stepId = `step_${Date.now()}_${i}`;

                // Simple sequential dependency
                const dependsOn = i > 0 ? [newSteps[i - 1].id] : [];

                const safeName = planStep.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                // Ensure output_file is present for backend validation
                // FIX: Remove research_logs/ prefix to ensure visibility in sidebar
                const outputFile = planStep.output_file || `${safeName}_output.md`;

                newSteps.push({
                    id: stepId,
                    name: planStep.name,
                    step_type: 'agent',
                    config: {
                        skill_id: matchedSkill.id,
                        parameters: {},
                        output_file: outputFile
                    },
                    depends_on: dependsOn
                });
            }

            onWorkflowGenerated(plan.workflow_name, newSteps);
            onOpenChange(false);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to generate workflow');
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-purple-500 mb-1">
                        <Sparkles className="w-5 h-5" />
                        <DialogTitle>Magic Workflow Builder</DialogTitle>
                    </div>
                    <DialogDescription>
                        Describe your goal in plain English. The AI will find the right skills and build the workflow for you.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-200">What would you like to build?</label>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., I want to research AI tools, find which is strongest in understanding, then execute a performance test..."
                            className="min-h-[120px] font-medium resize-none bg-muted/20 border-white/10 text-base"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-200">Target Output Filename (Optional)</label>
                        <Input
                            value={outputTarget}
                            onChange={(e) => setOutputTarget(e.target.value)}
                            placeholder="e.g. final_report.md (Leave empty for auto-generated)"
                            className="bg-muted/20 border-white/10"
                            disabled={isLoading}
                        />
                    </div>

                    {isLoading && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-medium">{status || 'Processing...'}</span>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                    >
                        <Wand2 className="w-4 h-4" />
                        Generate Workflow
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
