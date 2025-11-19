import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FolderOpen, HardDrive } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface DirectorySelectorProps {
  selectedPath: string;
  onPathChange: (path: string) => void;
  defaultPath: string;
}

export default function DirectorySelector({
  selectedPath,
  onPathChange,
  defaultPath
}: DirectorySelectorProps) {
  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: selectedPath || defaultPath,
        title: 'Select Installation Directory'
      });

      if (selected && typeof selected === 'string') {
        onPathChange(selected);
      }
    } catch (error) {
      console.error('Failed to open directory picker:', error);
    }
  };

  const handleUseDefault = () => {
    onPathChange(defaultPath);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Select Installation Directory
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose where to store your application data, projects, and configuration files.
          </p>
        </div>

        {/* Default Path Suggestion */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Recommended Location
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 font-mono truncate">
                {defaultPath}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUseDefault}
                className="mt-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Use Default
              </Button>
            </div>
          </div>
        </div>

        {/* Path Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Installation Path
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={selectedPath}
              onChange={(e) => onPathChange(e.target.value)}
              placeholder="Select installation directory..."
              className="flex-1 font-mono text-sm"
            />
            <Button
              onClick={handleBrowse}
              variant="outline"
              className="flex-shrink-0"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Browse
            </Button>
          </div>
        </div>

        {/* Path Validation */}
        {selectedPath && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>Selected: <span className="font-mono">{selectedPath}</span></p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
