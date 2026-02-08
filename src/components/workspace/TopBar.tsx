import { Button } from '@/components/ui/button';
import { BrainCircuit, Settings, Moon, Sun } from 'lucide-react';

interface TopBarProps {
  activeProject: { name: string } | null;
  onProjectSettings: () => void;
  theme: string;
  onToggleTheme: () => void;
}

export default function TopBar({ activeProject, onProjectSettings, theme, onToggleTheme }: TopBarProps) {
  return (
    <div className="h-14 border-b border-border bg-background/20 backdrop-blur-xl flex items-center justify-between px-4 shadow-sm z-20 relative">
      <div className="flex items-center gap-4">
        {activeProject ? (
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">
              {activeProject.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-50 text-muted-foreground">
            <BrainCircuit className="w-5 h-5" />
            <span className="text-sm">No Project Selected</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTheme}
          className="gap-2"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>



        <Button
          variant="ghost"
          size="sm"
          onClick={onProjectSettings}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Project Settings
        </Button>
      </div>
    </div>
  );
}