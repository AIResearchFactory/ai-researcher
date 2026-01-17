import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check, Loader2,
  FolderOpen, Layout, Cpu
} from 'lucide-react';
import { tauriApi, GlobalSettings, ProviderType } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';
import { open } from '@tauri-apps/plugin-dialog';

type SettingsSection = 'general' | 'ai';

export default function GlobalSettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [settings, setSettings] = useState<GlobalSettings>({} as GlobalSettings);
  const [apiKey, setApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localModels, setLocalModels] = useState<{ ollama: boolean; claudeCode: boolean; gemini: boolean }>({ ollama: false, claudeCode: false, gemini: false });

  const { toast } = useToast();

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [loadedSettings, secrets, ollamaInfo, claudeInfo, geminiInfo] = await Promise.all([
          tauriApi.getGlobalSettings(),
          tauriApi.getSecrets(),
          tauriApi.detectOllama(),
          tauriApi.detectClaudeCode(),
          tauriApi.detectGemini()
        ]);

        setSettings(loadedSettings);
        setApiKey(secrets.claude_api_key ? '••••••••••••••••' : '');
        setGeminiApiKey(secrets.gemini_api_key ? '••••••••••••••••' : '');

        setLocalModels({
          ollama: ollamaInfo?.installed || false,
          claudeCode: claudeInfo?.installed || false,
          gemini: geminiInfo?.installed || false
        });

        applyTheme(loadedSettings.theme || 'dark');
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  // Auto-save settings with debounce
  useEffect(() => {
    if (loading) return;

    const saveSettings = async () => {
      setSaving(true);
      try {
        await tauriApi.saveGlobalSettings(settings);

        // Save API key if changed and not the placeholder
        if (apiKey && apiKey !== '••••••••••••••••') {
          await tauriApi.saveSecret('ANTHROPIC_API_KEY', apiKey);
          await tauriApi.saveSecret('claude_api_key', apiKey);
        }

        if (geminiApiKey && geminiApiKey !== '••••••••••••••••') {
          await tauriApi.saveSecret('GEMINI_API_KEY', geminiApiKey);
        }

        applyTheme(settings.theme);
      } catch (error) {
        console.error('Failed to save settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to save settings',
          variant: 'destructive',
        });
      } finally {
        setTimeout(() => setSaving(false), 800);
      }
    };

    const debouncedSave = setTimeout(saveSettings, 1000);
    return () => clearTimeout(debouncedSave);
  }, [settings, apiKey, geminiApiKey, loading, toast]);

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

  const handleDataDirChange = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Data Directory',
      });

      if (selected) {
        setSettings(prev => ({
          ...prev,
          projectsPath: selected as string
        }));
      }
    } catch (err) {
      console.error('Failed to pick directory:', err);
    }
  };

  const handleProviderChange = (value: string) => {
    setSettings(prev => ({ ...prev, activeProvider: value as ProviderType }));
  };

  const handleThemeChange = (value: string) => {
    setSettings(prev => ({ ...prev, theme: value }));
    applyTheme(value);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Settings Navigation Sidebar */}
      <div className="w-64 border-r border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Settings</h2>
          <p className="text-xs text-gray-500 mt-1 truncate">Global Configuration</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <button
              onClick={() => setActiveSection('general')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeSection === 'general'
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
            >
              <Layout className="w-4 h-4" />
              General
            </button>
            <button
              onClick={() => setActiveSection('ai')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeSection === 'ai'
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
            >
              <Cpu className="w-4 h-4" />
              AI & Models
            </button>
          </div>
        </ScrollArea>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 mt-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving changes...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span>All changes saved</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950">
        <ScrollArea className="flex-1">
          <div className="max-w-3xl p-8 space-y-12">

            {/* General Section */}
            {activeSection === 'general' && (
              <div className="space-y-10">
                {/* Theme */}
                <section className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Appearance</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customize how the application looks</p>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="theme" className="text-sm font-medium">Application Theme</Label>
                    <Select value={settings.theme} onValueChange={handleThemeChange}>
                      <SelectTrigger id="theme" className="w-full bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                {/* Storage */}
                <section className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Storage</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage where your data is stored</p>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="data-dir" className="text-sm font-medium">Data Directory</Label>
                    <div className="flex gap-2">
                      <Input
                        id="data-dir"
                        value={settings.projectsPath}
                        readOnly
                        className="bg-gray-50/50 dark:bg-gray-900/50 font-mono text-xs text-gray-900 dark:text-gray-100"
                      />
                      <Button variant="outline" size="icon" onClick={handleDataDirChange} title="Change Directory">
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400">
                      Location where all projects and data are stored
                    </p>
                  </div>
                </section>

                {/* Notifications */}
                <section className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Control application alerts</p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20 max-w-md">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Enable Notifications</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mr-8">
                        Get notified about important events
                      </p>
                    </div>
                    <Switch
                      checked={settings.notificationsEnabled}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notificationsEnabled: checked }))}
                    />
                  </div>
                </section>
              </div>
            )}

            {/* AI Section */}
            {activeSection === 'ai' && (
              <div className="space-y-10">

                {/* Active Provider */}
                <section className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Default AI Provider</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select the primary AI provider for your chats</p>
                  </div>
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="active-provider" className="text-sm font-medium">Provider</Label>
                    <Select value={settings.activeProvider} onValueChange={handleProviderChange}>
                      <SelectTrigger id="active-provider" className="w-full bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hostedApi">Hosted Claude (API)</SelectItem>
                        <SelectItem value="ollama" disabled={!localModels.ollama}>Ollama {localModels.ollama ? '(Detected)' : '(Not Detected)'}</SelectItem>
                        <SelectItem value="claudeCode" disabled={!localModels.claudeCode}>Claude Code CLI {localModels.claudeCode ? '(Detected)' : '(Not Detected)'}</SelectItem>
                        <SelectItem value="geminiCli" disabled={!localModels.gemini}>Gemini CLI {localModels.gemini ? '(Detected)' : '(Not Detected)'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                <hr className="border-gray-100 dark:border-gray-800" />

                {/* Hosted Configuration */}
                <section className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Hosted Claude API</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configuration for Anthology's Hosted API</p>
                  </div>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="api-key" className="text-xs font-medium">Anthropic API Key</Label>
                      <Input
                        id="api-key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="font-mono text-xs bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hosted-model" className="text-xs font-medium">Default Model ID</Label>
                      <Input
                        id="hosted-model"
                        value={settings.hosted?.model || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, hosted: { ...prev.hosted, model: e.target.value } }))}
                        placeholder="claude-3-5-sonnet-20241022"
                        className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </section>

                {/* Ollama Configuration */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Ollama</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Local LLM Runner</p>
                    </div>
                    {localModels.ollama && <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded border border-green-200 dark:border-green-800">Detected</span>}
                  </div>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="ollama-url" className="text-xs font-medium">API URL</Label>
                      <Input
                        id="ollama-url"
                        value={settings.ollama?.apiUrl || 'http://localhost:11434'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ollama: { ...prev.ollama, apiUrl: e.target.value } }))}
                        className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ollama-model" className="text-xs font-medium">Default Model</Label>
                      <Input
                        id="ollama-model"
                        value={settings.ollama?.model || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, ollama: { ...prev.ollama, model: e.target.value } }))}
                        placeholder="llama3"
                        className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </section>

                {/* Gemini CLI Configuration */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Gemini CLI</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Google's Gemini Command Line</p>
                    </div>
                    {localModels.gemini && <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded border border-green-200 dark:border-green-800">Detected</span>}
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="gemini-command" className="text-xs font-medium">Command</Label>
                      <Input
                        id="gemini-command"
                        value={settings.geminiCli?.command || 'gemini'}
                        onChange={(e) => setSettings(prev => ({ ...prev, geminiCli: { ...prev.geminiCli, command: e.target.value } }))}
                        className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gemini-alias" className="text-xs font-medium">Model Alias</Label>
                      <Input
                        id="gemini-alias"
                        value={settings.geminiCli?.modelAlias || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, geminiCli: { ...prev.geminiCli, modelAlias: e.target.value } }))}
                        placeholder="pro"
                        className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gemini-api-key" className="text-xs font-medium">API Key</Label>
                      <Input
                        id="gemini-api-key"
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIza..."
                        className="font-mono text-xs bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </section>

                {/* Claude Code Configuration */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Claude Code CLI</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Anthropic's Local CLI Agent</p>
                    </div>
                    {localModels.claudeCode && <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded border border-green-200 dark:border-green-800">Detected</span>}
                  </div>
                  <div className="space-y-4 max-w-md">
                    <p className="text-xs text-gray-500">Claude Code configures itself via the CLI. Ensure it is authenticated in your terminal.</p>
                  </div>
                </section>

              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
