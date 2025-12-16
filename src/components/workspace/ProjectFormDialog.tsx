import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, ChevronDown } from 'lucide-react';
import CreateSkillDialog from './CreateSkillDialog';
import { tauriApi, Skill } from '@/api/tauri';
import { useToast } from '@/hooks/use-toast';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; goal: string; skills: string[] }) => void;
}

export default function ProjectFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: ProjectFormDialogProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [showCreateSkill, setShowCreateSkill] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSkills();
    }
  }, [open]);

  const loadSkills = async () => {
    try {
      const loadedSkills = await tauriApi.getAllSkills();
      setAvailableSkills(loadedSkills);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  };

  const handleAddSkill = () => {
    if (skillsInput.trim() && !skills.includes(skillsInput.trim())) {
      setSkills([...skills, skillsInput.trim()]);
      setSkillsInput('');
    }
  };

  const handleSelectSkill = (skillName: string) => {
    if (!skills.includes(skillName)) {
      setSkills([...skills, skillName]);
    }
  };

  const handleCreateSkill = async (newSkill: { name: string; description: string }) => {
    try {
      // Create default template and category since the simple dialog doesn't provide them
      const template = `# ${newSkill.name}\n\n${newSkill.description}`;
      const category = "general";

      await tauriApi.createSkill(
        newSkill.name,
        newSkill.description,
        template,
        category
      );

      // Add to local list if not present
      if (!skills.includes(newSkill.name)) {
        setSkills([...skills, newSkill.name]);
      }

      toast({
        title: "Skill Created",
        description: `Skill "${newSkill.name}" has been created and saved.`
      });

      // Reload available skills
      loadSkills();
    } catch (error) {
      console.error('Failed to create skill:', error);
      toast({
        title: "Error",
        description: "Failed to save the new skill.",
        variant: "destructive"
      });
      // Fallback: still add to current project list even if save fails? 
      // Better not to, to maintain consistency.
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    if (!goal.trim()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      goal: goal.trim(),
      skills,
    });

    // Reset form
    setName('');
    setGoal('');
    setSkills([]);
    setSkillsInput('');
  };

  const handleCancel = () => {
    // Reset form
    setName('');
    setGoal('');
    setSkills([]);
    setSkillsInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Enter the details for your new research project. Click create when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Project Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Machine Learning Research"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="dark:text-gray-100 dark:bg-gray-800"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal">Goal / Description <span className="text-red-500">*</span></Label>
              <Textarea
                id="goal"
                placeholder="Describe the main objective of this project..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                className="dark:text-gray-100 dark:bg-gray-800"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skills">Skills</Label>
              <div className="flex gap-2">
                <Input
                  id="skills"
                  placeholder="Type custom skill..."
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="dark:text-gray-100 dark:bg-gray-800"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" type="button" className="px-3">
                      Select
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    {availableSkills.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No saved skills found</div>
                    ) : (
                      availableSkills.map((skill) => {
                        const isSelected = skills.includes(skill.name);
                        return (
                          <DropdownMenuItem
                            key={skill.id}
                            onClick={() => !isSelected && handleSelectSkill(skill.name)}
                            className={isSelected ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            {skill.name}
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSkill}
                  disabled={!skillsInput.trim()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateSkill(true)}
                  title="Create a new skill"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md text-sm"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !goal.trim()}>
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <CreateSkillDialog
        open={showCreateSkill}
        onOpenChange={setShowCreateSkill}
        onSubmit={handleCreateSkill}
      />
    </Dialog>
  );
}
