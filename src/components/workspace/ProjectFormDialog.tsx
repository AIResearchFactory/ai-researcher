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
import { X, Plus, ChevronDown, Sparkles, FolderPlus } from 'lucide-react';
import CreateSkillDialog from './CreateSkillDialog';
import { tauriApi, Skill } from '@/api/tauri';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; goal: string; skills: string[] }) => void;
  availableSkills?: Skill[];
}

export default function ProjectFormDialog({
  open,
  onOpenChange,
  onSubmit,
  availableSkills: externalSkills,
}: ProjectFormDialogProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [showCreateSkill, setShowCreateSkill] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (externalSkills) {
      setAvailableSkills(externalSkills);
    } else if (open) {
      loadSkills();
    }
  }, [open, externalSkills]);

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

  const handleCreateSkill = async (newSkill: { name: string; description: string; role: string; tasks: string; output: string }) => {
    try {
      const template = `# ${newSkill.name}\n\n## Role\n${newSkill.role}\n\n## Tasks\n${newSkill.tasks}\n\n## Output\n${newSkill.output || "As requested."}`;
      const category = "general";

      await tauriApi.createSkill(
        newSkill.name,
        newSkill.description,
        template,
        category
      );

      if (!skills.includes(newSkill.name)) {
        setSkills([...skills, newSkill.name]);
      }

      toast({
        title: "Skill Created",
        description: `Skill "${newSkill.name}" has been created and saved.`
      });

      loadSkills();
    } catch (error) {
      console.error('Failed to create skill:', error);
      toast({
        title: "Error",
        description: "Failed to save the new skill.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !goal.trim()) return;

    onSubmit({
      name: name.trim(),
      goal: goal.trim(),
      skills,
    });

    setName('');
    setGoal('');
    setSkills([]);
    setSkillsInput('');
  };

  const handleCancel = () => {
    setName('');
    setGoal('');
    setSkills([]);
    setSkillsInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-white/5 bg-background/60 backdrop-blur-2xl shadow-2xl rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />

        <DialogHeader className="p-8 pb-4 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FolderPlus className="w-5 h-5" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">New Project</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground/80 font-medium">
            Define your research goals and mission objectives.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-6 relative z-10">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-primary/70 ml-1">
                Project Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Quantum Computing Analysis"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-primary/40 focus:bg-white/10 transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal" className="text-xs font-bold uppercase tracking-widest text-primary/70 ml-1">
                Project Goal
              </Label>
              <Textarea
                id="goal"
                placeholder="Synthesize the primary goal of this research project..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={4}
                className="bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-primary/40 focus:bg-white/10 transition-all resize-none font-medium leading-relaxed"
                required
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-primary/70 ml-1">
                Skill Integration
              </Label>
              <div className="flex gap-2">
                <Input
                  id="skills"
                  placeholder="Inject custom capability..."
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-primary/40 transition-all font-medium"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" type="button" className="rounded-xl border-white/10 bg-white/5 px-4 hover:bg-white/10">
                      Registry
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl">
                    {availableSkills.length === 0 ? (
                      <div className="p-4 text-xs text-muted-foreground font-medium italic">Empty Registry</div>
                    ) : (
                      availableSkills.map((skill) => {
                        const isSelected = skills.includes(skill.name);
                        return (
                          <DropdownMenuItem
                            key={skill.id}
                            onSelect={(e?: any) => {
                              e.preventDefault(); // Prevent closing if desired, or let it close. Usually we want to keep it open for multiple selections?
                              // If multiple selections are allowed, we should prevent default close.
                              // The user can verify if they want it to close or not.
                              // The current UI shows selected items as tags elsewhere, so maybe closing is fine?
                              // But if I want to select multiple, keeping it open is better.
                              // Let's try to keep it open.
                              e.preventDefault();
                              if (!isSelected) handleSelectSkill(skill.name);
                            }}
                            className={`rounded-lg m-1 text-sm font-medium ${isSelected ? "opacity-50" : ""}`}
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-2 text-primary/60" />
                            {skill.name}
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl bg-primary/10 text-primary hover:bg-primary/20"
                  onClick={() => setShowCreateSkill(true)}
                  title="Forge New Skill"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <AnimatePresence>
                {skills.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 pt-1"
                  >
                    {skills.map((skill) => (
                      <motion.div
                        key={skill}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/10 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-primary/20"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-primary/70 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/5 flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="rounded-xl font-bold text-muted-foreground hover:bg-white/5"
            >
              Discard
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !goal.trim()}
              className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 px-8 font-bold"
            >
              Initialize Node
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
