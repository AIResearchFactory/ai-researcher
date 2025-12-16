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

interface FileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (fileName: string) => void;
  projectName?: string;
}

export default function FileFormDialog({
  open,
  onOpenChange,
  onSubmit,
  projectName,
}: FileFormDialogProps) {
  const [fileName, setFileName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fileName.trim()) {
      return;
    }

    // Ensure .md extension
    const fullFileName = fileName.trim().endsWith('.md')
      ? fileName.trim()
      : `${fileName.trim()}.md`;

    onSubmit(fullFileName);

    // Reset form
    setFileName('');
  };

  const handleCancel = () => {
    // Reset form
    setFileName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
          <DialogDescription>
            {projectName
              ? `Create a new markdown file in "${projectName}"`
              : 'Create a new markdown file in the current project'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fileName">
                File Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fileName"
                placeholder="e.g., notes.md or research-findings"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                .md extension will be added automatically if not provided
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!fileName.trim()}>
              Create File
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
