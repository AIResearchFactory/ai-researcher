import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, BrainCircuit, CheckCircle2, Circle } from 'lucide-react';
import { Skill, tauriApi } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';

interface ProjectSettingsPageProps {
  activeProject: { id: string; name: string; description?: string } | null;
}

export default function ProjectSettingsPage({ activeProject }: ProjectSettingsPageProps) {
  const [projectSettings, setProjectSettings] = useState<{
    name: string;
    goal: string;
    autoSave: boolean;
    encryptData: boolean;
    preferredSkills: string[];
  }>({
    name: activeProject?.name || '',
    goal: activeProject?.description || '',
    autoSave: true,
    encryptData: true,
    preferredSkills: []
  });
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load project settings when activeProject changes
  useEffect(() => {
    const loadData = async () => {
      if (!activeProject?.id) return;

      try {
        const [settings, skills] = await Promise.all([
          tauriApi.getProjectSettings(activeProject.id),
          tauriApi.getAllSkills()
        ]);

        setProjectSettings({
          name: settings.name || activeProject.name,
          goal: settings.goal || '',
          autoSave: settings.auto_save ?? true,
          encryptData: settings.encryption_enabled ?? true,
          preferredSkills: settings.preferred_skills || []
        });
        setAvailableSkills(skills);
      } catch (error) {
        console.error('Failed to load project settings or skills:', error);
      }
    };

    loadData();
  }, [activeProject]);

  const handleSaveProject = async () => {
    if (!activeProject?.id) return;

    setLoading(true);
    try {
      await tauriApi.saveProjectSettings(activeProject.id, {
        name: projectSettings.name,
        goal: projectSettings.goal,
        auto_save: projectSettings.autoSave,
        encryption_enabled: projectSettings.encryptData,
        preferred_skills: projectSettings.preferredSkills
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
    { id: 'skills', label: 'Skills', icon: BrainCircuit },
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

            {activeSection === 'skills' && (
              <section className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Skills</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select the skills available for this project</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {availableSkills.map((skill) => {
                    const isSelected = projectSettings.preferredSkills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        onClick={() => {
                          const newSkills = isSelected
                            ? projectSettings.preferredSkills.filter(id => id !== skill.id)
                            : [...projectSettings.preferredSkills, skill.id];
                          setProjectSettings({ ...projectSettings, preferredSkills: newSkills });
                        }}
                        className={`group relative p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-md ${isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 ring-1 ring-blue-200 dark:ring-blue-800'
                          : 'bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 group-hover:text-blue-500'}`}>
                            <BrainCircuit className="w-5 h-5" />
                          </div>
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 dark:text-gray-700 group-hover:text-gray-400" />
                          )}
                        </div>

                        <div>
                          <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                            {skill.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 min-h-[32px]">
                            {skill.description || 'No description provided'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-3">
                          {skill.version && (
                            <span className="px-1.5 py-0 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-sm">
                              v{skill.version}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}

                  {availableSkills.length === 0 && (
                    <div className="col-span-full py-12 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                      <BrainCircuit className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No skills found. Create some skills first.</p>
                    </div>
                  )}
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