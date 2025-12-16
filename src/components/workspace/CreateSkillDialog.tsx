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
    onSubmit: (skill: { name: string; description: string }) => void;
}

export default function CreateSkillDialog({
    open,
    onOpenChange,
    onSubmit,
}: CreateSkillDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !description.trim()) {
            return;
        }

        onSubmit({
            name: name.trim(),
            description: description.trim(),
        });

        handleCancel();
    };

    const handleCancel = () => {
        setName('');
        setDescription('');
        onOpenChange(false);
    };

    const handleAIValidate = async () => {
        // This is a placeholder for the AI validation feature requested
        // In a real implementation, this would call an API to check the description
        setIsValidating(true);

        // Simulate API call
        setTimeout(() => {
            setIsValidating(false);
            // Logic to show validation result would go here
        }, 1500);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Create New Skill</DialogTitle>
                    <DialogDescription>
                        Define a new skill for your AI agent. The description is crucial as it guides the agent's behavior.
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
                                placeholder="e.g., Python Developer, Data Analyst"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="dark:text-gray-100 dark:bg-gray-800"
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="skill-description">
                                    Description / Instructions <span className="text-red-500">*</span>
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs gap-1 text-blue-600 dark:text-blue-400"
                                    onClick={handleAIValidate}
                                    disabled={!description.trim() || isValidating}
                                >
                                    <Wand2 className="w-3 h-3" />
                                    {isValidating ? 'Validating...' : 'AI Validate'}
                                </Button>
                            </div>
                            <Textarea
                                id="skill-description"
                                placeholder="Describe what this skill should do, its capabilities, and limitations..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                required
                                className="dark:text-gray-100 dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Detailed instructions help the AI understand how to apply this skill effectively.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name.trim() || !description.trim()}>
                            Create Skill
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
