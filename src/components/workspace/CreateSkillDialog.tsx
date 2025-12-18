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
import { Wand2 } from 'lucide-react';

interface CreateSkillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (skill: { name: string; description: string; role: string; tasks: string; output: string }) => void;
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
        });

        handleCancel();
    };

    const handleCancel = () => {
        setName('');
        setDescription('');
        setRole('');
        setTasks('');
        setOutput('');
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
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Skill</DialogTitle>
                    <DialogDescription>
                        Define a new skill using the detailed template structure.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="skill-name">
                                Skill Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="skill-name"
                                placeholder="e.g., Python Developer"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="dark:text-gray-100 dark:bg-gray-800"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="skill-description">
                                Short Description
                            </Label>
                            <Input
                                id="skill-description"
                                placeholder="A brief summary of what this skill does"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="dark:text-gray-100 dark:bg-gray-800"
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="skill-role">
                                    Role <span className="text-red-500">*</span>
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs gap-1 text-blue-600 dark:text-blue-400"
                                    onClick={handleAIValidate}
                                    disabled={!role.trim() || isValidating}
                                >
                                    <Wand2 className="w-3 h-3" />
                                    {isValidating ? 'Validating...' : 'AI Validate'}
                                </Button>
                            </div>
                            <Textarea
                                id="skill-role"
                                placeholder="You are an expert in... Your goal is to..."
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                rows={3}
                                required
                                className="dark:text-gray-100 dark:bg-gray-800"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="skill-tasks">
                                Tasks <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="skill-tasks"
                                placeholder="- Analyze code structure&#10;- Identify bugs&#10;- Optimize performance"
                                value={tasks}
                                onChange={(e) => setTasks(e.target.value)}
                                rows={4}
                                required
                                className="dark:text-gray-100 dark:bg-gray-800"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="skill-output">
                                Output Format
                            </Label>
                            <Textarea
                                id="skill-output"
                                placeholder="Provide the result in markdown format with..."
                                value={output}
                                onChange={(e) => setOutput(e.target.value)}
                                rows={3}
                                className="dark:text-gray-100 dark:bg-gray-800"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name.trim() || !role.trim() || !tasks.trim()}>
                            Create Skill
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
