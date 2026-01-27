import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportSkillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (skillName: string) => Promise<void>;
}

export default function ImportSkillDialog({ open, onOpenChange, onImport }: ImportSkillDialogProps) {
    const [skillName, setSkillName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImport = async () => {
        if (!skillName.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            await onImport(skillName);
            setSkillName('');
            onOpenChange(false);
        } catch (err) {
            console.error('Import failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to import skill. Please check the name and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import Skill</DialogTitle>
                    <DialogDescription>
                        Import a skill from the official registry (skills.sh).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="skill-name">Skill Name</Label>
                        <Input
                            id="skill-name"
                            value={skillName}
                            onChange={(e) => setSkillName(e.target.value)}
                            placeholder="e.g., guide, coder, writer"
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading && skillName.trim()) {
                                    handleImport();
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter the name of the skill to fetch from registry.
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={!skillName.trim() || isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Import Skill
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
