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
    <div className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            AI Research Assistant
          </h1>
        </div>

        {activeProject && (
          <>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {activeProject.name}
            </span>
          </>
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