import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen } from 'lucide-react';
import { tauriApi } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';

interface ProjectSettingsPageProps {
  activeProject: { id: string; name: string; description?: string } | null;
}

export default function ProjectSettingsPage({ activeProject }: ProjectSettingsPageProps) {
  const [projectSettings, setProjectSettings] = useState({
    name: activeProject?.name || '',
    goal: activeProject?.description || '',
    autoSave: true,
    encryptData: true
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load project settings when activeProject changes
  useEffect(() => {
    const loadProjectSettings = async () => {
      if (!activeProject?.id) return;

      try {
        const settings = await tauriApi.getProjectSettings(activeProject.id);
        setProjectSettings({
          name: settings.name || activeProject.name,
          goal: settings.goal || '',
          autoSave: settings.auto_save ?? true,
          encryptData: settings.encryption_enabled ?? true
        });
      } catch (error) {
        console.error('Failed to load project settings:', error);
      }
    };

    loadProjectSettings();
  }, [activeProject]);

  const handleSaveProject = async () => {
    if (!activeProject?.id) return;

    setLoading(true);
    try {
      await tauriApi.saveProjectSettings(activeProject.id, {
        name: projectSettings.name,
        goal: projectSettings.goal,
        auto_save: projectSettings.autoSave,
        encryption_enabled: projectSettings.encryptData
      });

      toast({
        title: 'Success',
        description: 'Project settings saved successfully'
      });
    } catch (error) {
      console.error('Failed to save project settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const [activeSection, setActiveSection] = useState('general');

  if (!activeProject) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        No project selected
      </div>
    );
  }

  const sections = [
    { id: 'general', label: 'General', icon: FolderOpen },
    { id: 'features', label: 'Features', icon: Switch }
  ];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Settings Navigation Sidebar */}
      <div className="w-64 border-r border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Project Settings</h2>
          <p className="text-xs text-gray-500 mt-1 truncate">{activeProject.name}</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeSection === section.id
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950">
        <ScrollArea className="flex-1">
          <div className="max-w-3xl p-8 space-y-10">
            {activeSection === 'general' && (
              <section className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">General</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Basic project information and metadata</p>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="project-name" className="text-sm font-medium">Project Name</Label>
                    <Input
                      id="project-name"
                      value={projectSettings.name}
                      onChange={(e) => setProjectSettings({ ...projectSettings, name: e.target.value })}
                      className="max-w-md bg-gray-50/50 dark:bg-gray-900/50"
                    />
                    <p className="text-xs text-gray-400">Visible name of your project folder</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="project-desc" className="text-sm font-medium">Description</Label>
                    <Input
                      id="project-desc"
                      value={projectSettings.goal}
                      onChange={(e) => setProjectSettings({ ...projectSettings, goal: e.target.value })}
                      className="max-w-md bg-gray-50/50 dark:bg-gray-900/50"
                      placeholder="Enter project goal or description"
                    />
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'features' && (
              <section className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Features</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure project behavior and security</p>
                </div>

                <div className="space-y-6 max-w-md">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Auto-save Documents</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mr-8">
                        Automatically save changes as you type. Disabling this requires manual saving for each document.
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.autoSave}
                      onCheckedChange={(checked) => setProjectSettings({ ...projectSettings, autoSave: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Encrypt Project Data</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mr-8">
                        Use AES-256 encryption for documents. Recommended for sensitive research.
                      </p>
                    </div>
                    <Switch
                      checked={projectSettings.encryptData}
                      onCheckedChange={(checked) => setProjectSettings({ ...projectSettings, encryptData: checked })}
                    />
                  </div>
                </div>
              </section>
            )}

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button onClick={handleSaveProject} className="min-w-[120px]" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}