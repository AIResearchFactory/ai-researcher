import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Key, Bell, Palette, Database, Shield, Check, Loader2, FolderOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tauriApi, GlobalSettings } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';
import { open } from '@tauri-apps/plugin-dialog';

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings>({
    defaultModel: 'claude-3-opus',
    theme: 'dark',
    notificationsEnabled: true,
    projectsPath: ''
  });
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localModels, setLocalModels] = useState<{ ollama: boolean; claudeCode: boolean }>({ ollama: false, claudeCode: false });
  const { toast } = useToast();

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [loadedSettings, secrets, installStatus] = await Promise.all([
          tauriApi.getGlobalSettings(),
          tauriApi.getSecrets(),
          tauriApi.checkInstallationStatus()
        ]);

        // Map backend response to interface if needed, assume mapped by tauriApi or match perfectly
        // Rust returns camelCase due to serde rename_all

        setSettings({
          defaultModel: loadedSettings.defaultModel || 'claude-3-opus',
          theme: loadedSettings.theme || 'dark',
          notificationsEnabled: loadedSettings.notificationsEnabled ?? true,
          projectsPath: loadedSettings.projectsPath || ''
        });

        setApiKey(secrets.claude_api_key ? '••••••••••••••••' : '');

        setLocalModels({
          ollama: installStatus.ollama_detected,
          claudeCode: installStatus.claude_code_detected
        });

        // Apply initial theme
        applyTheme(loadedSettings.theme || 'dark');
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings: ' + error,
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const applyTheme = (theme: string) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (loading) return;

    const saveSettings = async () => {
      setSaving(true);
      try {
        await tauriApi.saveGlobalSettings(settings);

        // Save API key if changed and not masked
        if (apiKey && apiKey !== '••••••••••••••••') {
          await tauriApi.saveSecrets({ claude_api_key: apiKey });
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to save settings',
          variant: 'destructive'
        });
      } finally {
        setSaving(false);
      }
    };

    const debounceTimer = setTimeout(saveSettings, 1000);
    return () => clearTimeout(debounceTimer);
  }, [settings, apiKey, loading]);

  const handleThemeChange = (newTheme: string) => {
    setSettings(prev => ({ ...prev, theme: newTheme }));
    applyTheme(newTheme);
  };

  const handleDataDirChange = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: settings.projectsPath || undefined,
      });

      if (selected && typeof selected === 'string') {
        setSettings(prev => ({ ...prev, projectsPath: selected }));
      }
    } catch (error) {
      console.error('Failed to open directory picker:', error);
      toast({
        title: 'Error',
        description: 'Failed to open directory picker',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Global Settings</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Application-wide preferences and configuration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span>Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Security Banner */}
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-gray-700 dark:text-gray-300">
            All sensitive data including API keys are encrypted using AES-256 encryption. Settings are saved automatically.
          </AlertDescription>
        </Alert>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600 dark:text-purple-500" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <select
                id="theme"
                value={settings.theme}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              <CardTitle>Storage</CardTitle>
            </div>
            <CardDescription>
              Manage where your data is stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data-dir">Data Directory</Label>
              <div className="flex gap-2">
                <Input
                  id="data-dir"
                  value={settings.projectsPath}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-900 font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleDataDirChange} title="Change Directory">
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Location where all projects and data are stored
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-500" />
              <CardTitle>API Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure your AI model and API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Only show API Key for hosted models */}
            {(!['ollama', 'claude-code'].includes(settings.defaultModel)) && (
              <div className="space-y-2">
                <Label htmlFor="api-key">Anthropic API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Required for hosted Claude models
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label>Detected Local Models</Label>
                <div className="flex gap-2 mt-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${localModels.ollama ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${localModels.ollama ? 'bg-green-500' : 'bg-gray-400'}`} />
                    Ollama
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${localModels.claudeCode ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${localModels.claudeCode ? 'bg-green-500' : 'bg-gray-400'}`} />
                    Claude Code
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-model">Default AI Model</Label>
                <select
                  id="default-model"
                  value={settings.defaultModel}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultModel: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Hosted Models (Requires API Key)">
                    <option value="claude-3-opus">Claude 3 Opus</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                  </optgroup>

                  {(localModels.ollama || localModels.claudeCode) && (
                    <optgroup label="Local Models">
                      {localModels.ollama && <option value="ollama">Ollama (Local)</option>}
                      {localModels.claudeCode && <option value="claude-code">Claude Code (Local)</option>}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This is the default AI model to be used in the AI chats and as the model agent.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-600 dark:text-green-500" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Manage how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Notifications</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get notified about important events
                </p>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notificationsEnabled: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
