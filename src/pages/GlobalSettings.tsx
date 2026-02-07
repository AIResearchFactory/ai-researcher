import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check, Loader2,
  FolderOpen, Layout, Cpu,
  ChevronDown, ChevronUp, Plus, Trash2, Key, Info,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react';
import { tauriApi, GlobalSettings, ProviderType, CustomCliConfig, GeminiInfo, ClaudeCodeInfo, OllamaInfo } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';
import { open } from '@tauri-apps/plugin-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type SettingsSection = 'general' | 'ai';

export default function GlobalSettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [settings, setSettings] = useState<GlobalSettings>({} as GlobalSettings);
  const [apiKey, setApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [customApiKeys, setCustomApiKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localModels, setLocalModels] = useState<{
    ollama: OllamaInfo | null;
    claudeCode: ClaudeCodeInfo | null;
    gemini: GeminiInfo | null
  }>({ ollama: null, claudeCode: null, gemini: null });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hosted: true,
    ollama: false,
    claudeCode: false,
    geminiCli: false,
    custom: true
  });
  const [isAuthenticatingGemini, setIsAuthenticatingGemini] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [ollamaModelsList, setOllamaModelsList] = useState<string[]>([]);

  // Status check helper
  const isConfigured = (provider: ProviderType, customId?: string) => {
    switch (provider) {
      case 'hostedApi':
        return !!apiKey && !!settings.hosted?.model;
      case 'ollama':
        return !!localModels.ollama?.installed;
      case 'claudeCode':
        return !!localModels.claudeCode?.installed;
      case 'geminiCli':
        return !!localModels.gemini?.installed;
      case 'custom':
        const custom = settings.customClis?.find(c => c.id === customId);
        return custom?.isConfigured;
      default:
        return false;
    }
  };

  const { toast } = useToast();

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [loadedSettings, ollamaInfo, claudeInfo, geminiInfo] = await Promise.all([
          tauriApi.getGlobalSettings(),
          tauriApi.detectOllama(),
          tauriApi.detectClaudeCode(),
          tauriApi.detectGemini()
        ]);

        setSettings(loadedSettings);

        // Secrets will be loaded when switching to AI section
        // Secrets generally loaded when switching to AI section


        // Check if current model is one of the presets
        const presets = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet', 'gemini-2.0-flash', 'ollama', 'claude-code', 'gemini-cli'];
        if (loadedSettings.defaultModel && !presets.includes(loadedSettings.defaultModel)) {
          setIsCustomModel(true);
        }

        setLocalModels({
          ollama: ollamaInfo,
          claudeCode: claudeInfo,
          gemini: geminiInfo
        });

        // Update settings with detected paths if they changed
        let updated = false;
        const newSettings = { ...loadedSettings };

        // Ensure sub-objects exist
        if (!newSettings.ollama) newSettings.ollama = { model: 'llama3', apiUrl: 'http://localhost:11434' };
        if (!newSettings.claude) newSettings.claude = { model: 'claude-3-5-sonnet-20241022' };
        if (!newSettings.geminiCli) newSettings.geminiCli = { command: 'gemini', modelAlias: 'pro', apiKeySecretId: 'GEMINI_API_KEY' };

        if (ollamaInfo?.path && ollamaInfo.path !== newSettings.ollama.detectedPath) {
          newSettings.ollama = { ...newSettings.ollama, detectedPath: ollamaInfo.path };
          updated = true;
        }
        if (claudeInfo?.path && claudeInfo.path !== newSettings.claude.detectedPath) {
          newSettings.claude = { ...newSettings.claude, detectedPath: claudeInfo.path };
          updated = true;
        }
        if (geminiInfo?.path && geminiInfo.path !== newSettings.geminiCli.detectedPath) {
          newSettings.geminiCli = { ...newSettings.geminiCli, detectedPath: geminiInfo.path };
          updated = true;
        }

        if (updated) {
          setSettings(newSettings);
          await tauriApi.saveGlobalSettings(newSettings);
        }

        applyTheme(loadedSettings.theme || 'dark');
      } catch (error) {
        console.error('CRITICAL: Failed to load settings:', error);
        toast({
          title: 'Settings Loading Error',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchOllamaModels = async () => {
      try {
        const models = await tauriApi.getOllamaModels();
        setOllamaModelsList(models);
      } catch (error) {
        console.error('Failed to fetch Ollama models:', error);
      }
    };

    loadSettings();
    fetchOllamaModels();
  }, [toast]);

  // Load secrets when switching to AI section
  useEffect(() => {
    if (activeSection === 'ai') {
      const loadSecrets = async () => {
        try {
          const secrets = await tauriApi.getSecrets();
          setApiKey(secrets?.claude_api_key ? '••••••••••••••••' : '');
          setGeminiApiKey(secrets?.gemini_api_key ? '••••••••••••••••' : '');

          const customKeys: Record<string, string> = {};
          if (secrets?.custom_api_keys) {
            Object.keys(secrets.custom_api_keys).forEach(key => {
              customKeys[key] = '••••••••••••••••';
            });
          }
          setCustomApiKeys(customKeys);
        } catch (error) {
          console.error('Failed to load secrets:', error);
          // Don't show toast for cancellation (common if user just closes prompt)
        }
      };

      loadSecrets();
    }
  }, [activeSection]);

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

        // Save custom API keys
        for (const [id, key] of Object.entries(customApiKeys)) {
          if (key && key !== '••••••••••••••••') {
            await tauriApi.saveSecret(id, key);
          }
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAuthenticateGemini = async () => {
    setIsAuthenticatingGemini(true);
    try {
      const result = await tauriApi.authenticateGemini();
      toast({
        title: 'Authentication',
        description: result,
      });
      // Refresh gemini info
      const geminiInfo = await tauriApi.detectGemini();
      setLocalModels(prev => ({ ...prev, gemini: geminiInfo }));
    } catch (error) {
      toast({
        title: 'Authentication Error',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsAuthenticatingGemini(false);
    }
  };

  const handleRedetect = async () => {
    setLoading(true);
    try {
      await tauriApi.clearAllCliDetectionCaches();
      const [ollamaInfo, claudeInfo, geminiInfo] = await Promise.all([
        tauriApi.detectOllama(),
        tauriApi.detectClaudeCode(),
        tauriApi.detectGemini()
      ]);

      setLocalModels({
        ollama: ollamaInfo,
        claudeCode: claudeInfo,
        gemini: geminiInfo
      });

      toast({
        title: 'Environment Scanned',
        description: 'Updated detection of local models'
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to redetect environment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleAddCustomCli = async () => {
    const newCli: CustomCliConfig = {
      id: crypto.randomUUID(),
      name: 'My Custom CLI',
      command: '',
      isConfigured: false
    };
    const updatedClis = [...(settings.customClis || []), newCli];
    setSettings(prev => ({ ...prev, customClis: updatedClis }));
    await tauriApi.addCustomCli(newCli);
  };

  const handleRemoveCustomCli = async (id: string) => {
    const updatedClis = (settings.customClis || []).filter(c => c.id !== id);
    setSettings(prev => ({ ...prev, customClis: updatedClis }));
    await tauriApi.removeCustomCli(id);
  };

  const handleUpdateCustomCli = (id: string, field: keyof CustomCliConfig, value: any) => {
    const updatedClis = (settings.customClis || []).map(c =>
      c.id === id ? { ...c, [field]: value, isConfigured: field === 'command' ? !!value : c.isConfigured } : c
    );
    setSettings(prev => ({ ...prev, customClis: updatedClis }));
  };

  const handleThemeChange = (value: string) => {
    setSettings(prev => ({ ...prev, theme: value }));
    applyTheme(value);
  }

  const handleModelChange = (value: string) => {
    const isOllamaModel = ollamaModelsList.includes(value);
    const isClaudeCode = value === 'claude-code';
    const isGeminiCli = value === 'gemini-cli' || value.startsWith('gemini-');
    const isHosted = !isOllamaModel && !isClaudeCode && !isGeminiCli;

    setSettings(prev => {
      let newSettings = { ...prev, defaultModel: value };

      if (isOllamaModel) {
        newSettings.activeProvider = 'ollama';
        newSettings.ollama = { ...prev.ollama, model: value };
      } else if (isClaudeCode) {
        newSettings.activeProvider = 'claudeCode';
      } else if (isGeminiCli) {
        newSettings.activeProvider = 'geminiCli';
        // If it's a specific Gemini model id, set it as the alias
        if (value.startsWith('gemini-')) {
          newSettings.geminiCli = { ...prev.geminiCli, modelAlias: value };
        }
      } else if (isHosted) {
        newSettings.activeProvider = 'hostedApi';
        newSettings.hosted = { ...prev.hosted, model: value };
      }

      return newSettings;
    });
  };

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
                        value={settings.projectsPath || ''}
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
              <div className="space-y-8">
                {/* Active Provider */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Active Provider</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select your default AI model provider</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRedetect}
                      className="gap-2 text-xs h-8 border-gray-200 dark:border-gray-800"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Scan Environment
                    </Button>
                  </div>
                  <div className="grid gap-2 max-w-md">
                    <Select value={settings.activeProvider} onValueChange={handleProviderChange}>
                      <SelectTrigger className="w-full bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>

                        <SelectItem value="ollama" disabled={!localModels.ollama?.installed}>
                          <div className="flex items-center gap-2">
                            <span>Ollama</span>
                            {localModels.ollama?.installed ? <Check className="w-3 h-3 text-green-500" /> : <AlertTriangle className="w-3 h-3 text-gray-400" />}
                          </div>
                        </SelectItem>
                        <SelectItem value="claudeCode" disabled={!localModels.claudeCode?.installed}>
                          <div className="flex items-center gap-2">
                            <span>Claude Code CLI</span>
                            {localModels.claudeCode?.installed ? <Check className="w-3 h-3 text-green-500" /> : <AlertTriangle className="w-3 h-3 text-gray-400" />}
                          </div>
                        </SelectItem>
                        <SelectItem value="geminiCli" disabled={!localModels.gemini?.installed}>
                          <div className="flex items-center gap-2">
                            <span>Gemini CLI</span>
                            {localModels.gemini?.installed ? <Check className="w-3 h-3 text-green-500" /> : <AlertTriangle className="w-3 h-3 text-gray-400" />}
                          </div>
                        </SelectItem>
                        <SelectItem value="hostedApi">
                          <div className="flex items-center gap-2">
                            <span>Hosted Claude (API)</span>
                            {isConfigured('hostedApi') ? <Check className="w-3 h-3 text-green-500" /> : <Info className="w-3 h-3 text-amber-500" />}
                          </div>
                        </SelectItem>
                        {settings.customClis?.map(cli => (
                          <SelectItem key={cli.id} value={`custom-${cli.id}`} disabled={!cli.isConfigured}>
                            <div className="flex items-center gap-2">
                              <span>{cli.name}</span>
                              {cli.isConfigured ? <Check className="w-3 h-3 text-green-500" /> : <Info className="w-3 h-3 text-amber-500" />}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isConfigured(settings.activeProvider) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" /> Selected provider is not fully configured
                      </p>
                    )}
                  </div>
                </section>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Models & Providers</h3>



                  {/* Ollama Card */}
                  <Card className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden transition-all ${!localModels.ollama?.installed ? 'opacity-60 bg-gray-50/50 dark:bg-gray-950' : ''}`}>
                    <CardHeader className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => toggleSection('ollama')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${localModels.ollama?.installed ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">Ollama</CardTitle>
                            <CardDescription className="text-xs">Run local open-source models</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {localModels.ollama?.installed ?
                            <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-medium">DETECTED</span> :
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded font-medium">NOT DETECTED</span>
                          }
                          {expandedSections.ollama ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                    </CardHeader>
                    {expandedSections.ollama && (
                      <CardContent className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800 space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500">API URL</Label>
                          <Input
                            value={settings.ollama?.apiUrl || 'http://localhost:11434'}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              ollama: {
                                ...(prev.ollama || { model: 'llama3', apiUrl: 'http://localhost:11434', detectedPath: undefined }),
                                apiUrl: e.target.value
                              }
                            }))}
                            className="text-xs bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                            disabled={!localModels.ollama?.installed}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500">Default Model</Label>
                          <Input
                            value={settings.ollama?.model || ''}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              ollama: {
                                ...(prev.ollama || { model: 'llama3', apiUrl: 'http://localhost:11434', detectedPath: undefined }),
                                model: e.target.value
                              }
                            }))}
                            placeholder="llama3"
                            className="text-xs bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                            disabled={!localModels.ollama?.installed}
                          />
                        </div>
                        {!localModels.ollama?.installed && (
                          <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/10 text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                            Ollama not found. <a href="https://ollama.ai" target="_blank" className="underline font-medium">Install Ollama</a> to use local models.
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>

                  {/* Gemini CLI Card */}
                  <Card className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden transition-all ${!localModels.gemini?.installed ? 'opacity-60 bg-gray-50/50 dark:bg-gray-950' : ''}`}>
                    <CardHeader className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => toggleSection('geminiCli')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${localModels.gemini?.installed ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">Gemini CLI</CardTitle>
                            <CardDescription className="text-xs">Google's advanced models via CLI</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {localModels.gemini?.installed ?
                            <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-medium">DETECTED</span> :
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded font-medium">NOT DETECTED</span>
                          }
                          {expandedSections.geminiCli ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                    </CardHeader>
                    {expandedSections.geminiCli && (
                      <CardContent className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800 space-y-4 mt-4">
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs text-gray-500">Command</Label>
                            <Input
                              value={settings.geminiCli?.command || 'gemini'}
                              onChange={(e) => setSettings(prev => ({
                                ...prev,
                                geminiCli: {
                                  ...(prev.geminiCli || { command: 'gemini', modelAlias: 'pro', apiKeySecretId: 'GEMINI_API_KEY', detectedPath: undefined }),
                                  command: e.target.value
                                }
                              }))}
                              className="text-xs bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                              disabled={!localModels.gemini?.installed}
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs text-gray-500">Model Alias</Label>
                            <Input
                              value={settings.geminiCli?.modelAlias || ''}
                              onChange={(e) => setSettings(prev => ({
                                ...prev,
                                geminiCli: {
                                  ...(prev.geminiCli || { command: 'gemini', modelAlias: 'pro', apiKeySecretId: 'GEMINI_API_KEY', detectedPath: undefined }),
                                  modelAlias: e.target.value
                                }
                              }))}
                              placeholder="pro"
                              className="text-xs bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                              disabled={!localModels.gemini?.installed}
                            />
                          </div>
                        </div>

                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Personal Google Account</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-2"
                                disabled={!localModels.gemini?.installed || isAuthenticatingGemini}
                                onClick={handleAuthenticateGemini}
                              >
                                {isAuthenticatingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                                Login / Change Method
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                              Open a dialog to select your personal Google account for authentication via <code>/auth</code>
                            </p>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <Label className="text-sm">Gemini API Key (Alternative)</Label>
                            <div className="relative">
                              <Input
                                type="password"
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                placeholder="AIza..."
                                className="font-mono text-xs bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                                disabled={!localModels.gemini?.installed}
                              />
                              <Key className="absolute right-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              Use an API key if you don't want to use a personal Google account.
                            </p>
                          </div>

                          <div className="pt-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-[10px] text-blue-600 dark:text-blue-400 gap-1"
                              onClick={() => window.open('https://geminicli.com/docs/get-started/authentication/#use-gemini-api-key', '_blank')}
                            >
                              <Info className="w-3 h-3" /> View Gemini CLI Authentication Docs
                            </Button>
                          </div>

                          {localModels.gemini?.authenticated && !geminiApiKey && (
                            <p className="text-[10px] text-green-600 flex items-center gap-1">
                              <Check className="w-3 h-3" /> CLI is authenticated via Google Account
                            </p>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Claude Code Card */}
                  <Card className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden transition-all ${!localModels.claudeCode?.installed ? 'opacity-60 bg-gray-50/50 dark:bg-gray-950' : ''}`}>
                    <CardHeader className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => toggleSection('claudeCode')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${localModels.claudeCode?.installed ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">Claude Code CLI</CardTitle>
                            <CardDescription className="text-xs">Run agentic workflows locally</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {localModels.claudeCode?.installed ?
                            <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-medium">DETECTED</span> :
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded font-medium">NOT DETECTED</span>
                          }
                          {expandedSections.claudeCode ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                    </CardHeader>
                    {expandedSections.claudeCode && (
                      <CardContent className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800 space-y-4 mt-4">
                        <p className="text-xs text-gray-500">
                          Claude Code is managed through your terminal. Once detected, the application can leverage its capabilities for complex tasks.
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                          <Button size="sm" variant="ghost" className="text-xs gap-2" onClick={() => window.open('https://claude.ai/code', '_blank')}>
                            <Info className="w-3.5 h-3.5" /> Documentation
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Hosted Card */}
                  <Card className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden transition-all ${!isConfigured('hostedApi') ? 'opacity-80' : ''}`}>
                    <CardHeader className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => toggleSection('hosted')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isConfigured('hostedApi') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">Hosted Claude API</CardTitle>
                            <CardDescription className="text-xs">Direct connection to Anthropic's Claude</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isConfigured('hostedApi') ?
                            <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-medium">CONFIGURED</span> :
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-medium">INCOMPLETE</span>
                          }
                          {expandedSections.hosted ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                    </CardHeader>
                    {expandedSections.hosted && (
                      <CardContent className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800 space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500">Anthropic API Key</Label>
                          <div className="relative">
                            <Input
                              type="password"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="sk-ant-..."
                              className="font-mono text-xs bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                            />
                            <Key className="absolute right-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500">Default Model ID</Label>
                          <Input
                            value={settings.hosted?.model || ''}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              hosted: {
                                ...(prev.hosted || { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', apiKeySecretId: 'ANTHROPIC_API_KEY' }),
                                model: e.target.value
                              }
                            }))}
                            placeholder="claude-3-5-sonnet-20241022"
                            className="text-xs bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                          />
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Custom CLIs */}
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom Models</h4>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleAddCustomCli}>
                        <Plus className="w-3 h-3" /> Add Custom CLI
                      </Button>
                    </div>

                    {settings.customClis?.map(cli => (
                      <Card key={cli.id} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 shadow-sm overflow-hidden">
                        <CardHeader className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Input
                                value={cli.name}
                                onChange={(e) => handleUpdateCustomCli(cli.id, 'name', e.target.value)}
                                className="h-7 text-xs font-medium bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-800 w-40 px-1"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              {cli.isConfigured && <Check className="w-3 h-3 text-green-500" />}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => handleRemoveCustomCli(cli.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 grid gap-3">
                          <div className="grid gap-1.5">
                            <Label className="text-[10px] text-gray-500">Executable Command</Label>
                            <Input
                              value={cli.command}
                              onChange={(e) => handleUpdateCustomCli(cli.id, 'command', e.target.value)}
                              placeholder="e.g. ./my-model-cli"
                              className="h-8 text-xs bg-gray-50/10 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-[10px] text-gray-500">API Key (Optional)</Label>
                            <div className="relative">
                              <Input
                                type="password"
                                value={customApiKeys[`CUSTOM_CLI_${cli.id}_KEY`] || ''}
                                onChange={(e) => {
                                  const secretId = `CUSTOM_CLI_${cli.id}_KEY`;
                                  setCustomApiKeys(prev => ({ ...prev, [secretId]: e.target.value }));
                                  handleUpdateCustomCli(cli.id, 'apiKeySecretId', secretId);
                                }}
                                placeholder="Enter API key if required"
                                className="h-8 text-xs bg-gray-50/10 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800 pr-8"
                              />
                              <Key className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {(!settings.customClis || settings.customClis.length === 0) && (
                      <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg">
                        <p className="text-xs text-gray-400">No custom CLIs added yet</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="default-model" className="text-sm font-medium">Default Model ID</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Custom ID</span>
                        <Switch
                          checked={isCustomModel}
                          onCheckedChange={setIsCustomModel}
                        />
                      </div>
                    </div>

                    {isCustomModel ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="e.g. claude-3-7-sonnet-latest"
                          value={settings.defaultModel}
                          onChange={(e) => setSettings(prev => ({ ...prev, defaultModel: e.target.value }))}
                          className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100"
                        />
                        <p className="text-[10px] text-gray-500">
                          Enter exact model identifier.
                        </p>
                      </div>
                    ) : (
                      <Select value={settings.defaultModel} onValueChange={handleModelChange}>
                        <SelectTrigger id="default-model" className="w-full bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Hosted Models</SelectLabel>
                            <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                            <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                            <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                            <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                            <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                          </SelectGroup>

                          {(localModels.ollama || localModels.claudeCode || localModels.gemini) && (
                            <SelectGroup>
                              <SelectLabel>Local Models</SelectLabel>
                              {localModels.ollama && ollamaModelsList.length > 0 ? (
                                ollamaModelsList.map(model => (
                                  <SelectItem key={model} value={model}>Ollama: {model}</SelectItem>
                                ))
                              ) : (
                                localModels.ollama && <SelectItem value="ollama">Ollama (Auto-detect)</SelectItem>
                              )}
                              {localModels.claudeCode && <SelectItem value="claude-code">Claude Code (Auto-detect)</SelectItem>}
                              {localModels.gemini && <SelectItem value="gemini-cli">Gemini CLI</SelectItem>}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
