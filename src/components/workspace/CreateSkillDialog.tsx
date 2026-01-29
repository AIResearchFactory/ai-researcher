import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Zap, BrainCircuit } from 'lucide-react';

interface CreateSkillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (skill: { name: string; description: string; role: string; tasks: string; output: string; capabilities: string[] }) => void;
}

export default function CreateSkillDialog({
    open,
    onOpenChange,
    onSubmit,
}: CreateSkillDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [role, setRole] = useState('');
    const [tasks, setTasks] = useState('');
    const [output, setOutput] = useState('');
    const [capabilities, setCapabilities] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !role.trim() || !tasks.trim()) {
            return;
        }

        onSubmit({
            name: name.trim(),
            description: description.trim(),
            role: role.trim(),
            tasks: tasks.trim(),
            output: output.trim(),
            capabilities: capabilities.split(',').map(c => c.trim()).filter(c => c)
        });

        handleCancel();
    };

    const handleCancel = () => {
        setName('');
        setDescription('');
        setRole('');
        setTasks('');
        setOutput('');
        setCapabilities('');
        onOpenChange(false);
    };

    const handleAIValidate = async () => {
        setIsValidating(true);
        // Simulate API call
        setTimeout(() => {
            setIsValidating(false);
        }, 1500);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-white/5 bg-background/60 backdrop-blur-2xl shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-primary/5 to-blue-500/5 pointer-events-none" />

                <DialogHeader className="p-8 pb-4 relative z-10 shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Forge Skill</DialogTitle>
                    </div>
                    <DialogDescription className="text-muted-foreground/80 font-medium">
                        Architect a specific intelligence module for your research agents.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-2 relative z-10 custom-scrollbar">
                    <form id="skill-form" onSubmit={handleSubmit} className="space-y-6 pb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="skill-name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-500/80 ml-1">
                                    System Designation
                                </Label>
                                <Input
                                    id="skill-name"
                                    placeholder="e.g., Data Synthesizer"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="h-11 bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-purple-500/40 transition-all font-semibold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="skill-description" className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-500/80 ml-1">
                                    Mission Summary
                                </Label>
                                <Input
                                    id="skill-description"
                                    placeholder="Brief functional overview..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="h-11 bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-purple-500/40 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="skill-capabilities" className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-500/80 ml-1">
                                Capabilities
                            </Label>
                            <Input
                                id="skill-capabilities"
                                placeholder="comma, separated, list, of, capabilities"
                                value={capabilities}
                                onChange={(e) => setCapabilities(e.target.value)}
                                className="h-11 bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-purple-500/40 transition-all font-medium"
                            />
                        </div>



                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <Label htmlFor="skill-role" className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-500/80">
                                    Persona Definition
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] font-bold tracking-widest gap-1 text-purple-400 hover:bg-purple-500/10 uppercase"
                                    onClick={handleAIValidate}
                                    disabled={!role.trim() || isValidating}
                                >
                                    <Wand2 className="w-3 h-3" />
                                    {isValidating ? 'Validating...' : 'AI Refine'}
                                </Button>
                            </div>
                            <Textarea
                                id="skill-role"
                                placeholder="Define the expert persona and primary mission objective..."
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                rows={3}
                                required
                                className="bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-purple-500/40 transition-all resize-none font-medium leading-relaxed"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="skill-tasks" className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-500/80 ml-1">
                                Operational Logic
                            </Label>
                            <Textarea
                                id="skill-tasks"
                                placeholder="- Sequence step one&#10;- Execution parameter two&#10;- Final validation logic"
                                value={tasks}
                                onChange={(e) => setTasks(e.target.value)}
                                rows={4}
                                required
                                className="bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-purple-500/40 transition-all resize-none font-mono text-xs leading-relaxed"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="skill-output" className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-500/80 ml-1">
                                Output Schema
                            </Label>
                            <Textarea
                                id="skill-output"
                                placeholder="Describe the expected artifact structure and formatting..."
                                value={output}
                                onChange={(e) => setOutput(e.target.value)}
                                rows={3}
                                className="bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-purple-500/40 transition-all resize-none font-medium"
                            />
                        </div>
                    </form>
                </div>

                <DialogFooter className="p-8 pt-4 border-t border-white/5 flex gap-3 bg-white/5 shrink-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        className="rounded-xl font-bold text-muted-foreground hover:bg-white/5"
                    >
                        Decommission
                    </Button>
                    <Button
                        form="skill-form"
                        type="submit"
                        disabled={!name.trim() || !role.trim() || !tasks.trim()}
                        className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-xl shadow-purple-500/20 px-8 font-bold gap-2"
                    >
                        <Zap className="w-4 h-4 fill-current" />
                        Activate Skill
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
