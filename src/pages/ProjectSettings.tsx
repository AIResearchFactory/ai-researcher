import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen } from 'lucide-react';
import { tauriApi } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';

export default function ProjectSettingsPage({ activeProject }) {
  const [projectSettings, setProjectSettings] = useState({
    name: activeProject?.name || '',
    description: activeProject?.description || '',
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
          description: settings.description || '',
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
        description: projectSettings.description,
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

  if (!activeProject) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        No project selected
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Project Settings</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure settings for {activeProject.name}
            </p>
          </div>
        </div>

        {/* Project Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Basic project information and metadata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectSettings.name}
                  onChange={(e) => setProjectSettings({ ...projectSettings, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-desc">Description</Label>
                <Input
                  id="project-desc"
                  value={projectSettings.description}
                  onChange={(e) => setProjectSettings({ ...projectSettings, description: e.target.value })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save Documents</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically save changes as you type
                  </p>
                </div>
                <Switch
                  checked={projectSettings.autoSave}
                  onCheckedChange={(checked) => setProjectSettings({ ...projectSettings, autoSave: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Encrypt Project Data</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Use encryption for sensitive documents
                  </p>
                </div>
                <Switch
                  checked={projectSettings.encryptData}
                  onCheckedChange={(checked) => setProjectSettings({ ...projectSettings, encryptData: checked })}
                />
              </div>
            </div>

            <Button onClick={handleSaveProject} className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}