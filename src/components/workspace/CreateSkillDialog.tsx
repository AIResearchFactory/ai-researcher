import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Sparkles, FileText } from 'lucide-react';

interface CreateSkillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (skill: { name: string; description: string; promptTemplate: string }) => void;
}

const DEFAULT_TEMPLATE = `## Role
You are an expert in...

## Tasks
1. ...
2. ...

## Output Format
- ...`;

export default function CreateSkillDialog({
    open,
    onOpenChange,
    onSubmit,
}: CreateSkillDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [promptTemplate, setPromptTemplate] = useState('');

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setName('');
            setDescription('');
            setPromptTemplate('');
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !promptTemplate.trim()) {
            return;
        }

        onSubmit({
            name: name.trim(),
            description: description.trim(),
            promptTemplate: promptTemplate.trim(),
        });

        onOpenChange(false);
    };

    const handleUseTemplate = () => {
        if (!promptTemplate.trim() || confirm('This will overwrite your current prompt. Continue?')) {
            setPromptTemplate(DEFAULT_TEMPLATE);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[90vh] p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-white/5 space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                        <Zap className="w-5 h-5" />
                        <DialogTitle>Create New Skill</DialogTitle>
                    </div>
                    <DialogDescription>
                        Define a new capability for your AI agent using a prompt template.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="skill-name">Name</Label>
                            <Input
                                id="skill-name"
                                placeholder="e.g. Code Reviewer"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-muted/20 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="skill-description">Description</Label>
                            <Input
                                id="skill-description"
                                placeholder="Short summary of what this skill does"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-muted/20 border-white/10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Prompt Template
                            </Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary"
                                onClick={handleUseTemplate}
                            >
                                <Sparkles className="w-3 h-3" /> Use Template
                            </Button>
                        </div>

                        <div className="relative flex-1">
                            <Textarea
                                value={promptTemplate}
                                onChange={(e) => setPromptTemplate(e.target.value)}
                                placeholder="Enter the instructions for the AI..."
                                className="min-h-[300px] font-mono text-sm leading-relaxed bg-muted/20 border-white/10 resize-none p-4"
                            />
                            <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded-md border border-white/10">
                                Markdown supported
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Tip: Use <code className="bg-muted px-1 py-0.5 rounded text-primary">{'{{variable}}'}</code> to create dynamic inputs.
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-6 py-4 border-t border-white/5 bg-muted/5">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!name.trim() || !promptTemplate.trim()}
                        className="gap-2"
                    >
                        Create Skill
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
