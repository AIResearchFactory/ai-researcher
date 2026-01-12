import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Key, Check, Loader2,
  FolderOpen, X, Plus, Layout, Cpu, Server, Globe
} from 'lucide-react';
import { tauriApi, GlobalSettings } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';
import { open } from '@tauri-apps/plugin-dialog';
import { COMMUNTIY_MCP_SERVERS } from '@/data/mcp_marketplace';

type SettingsSection = 'general' | 'ai';

export default function GlobalSettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [settings, setSettings] = useState<GlobalSettings>({} as GlobalSettings);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localModels, setLocalModels] = useState<{ ollama: boolean; claudeCode: boolean }>({ ollama: false, claudeCode: false });
  const [ollamaModelsList, setOllamaModelsList] = useState<string[]>([]);
  const [isCustomModel, setIsCustomModel] = useState(false);

  // MCP Management
  const [newMcpServer, setNewMcpServer] = useState({
    id: '',
    name: '',
    command: 'npx',
    args: '',
    enabled: true
  });
  const [showAddMcp, setShowAddMcp] = useState(false);
  const addMcpFormRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [loadedSettings, secrets, ollamaInfo, claudeInfo] = await Promise.all([
          tauriApi.getGlobalSettings(),
          tauriApi.getSecrets(),
          tauriApi.detectOllama(),
          tauriApi.detectClaudeCode()
        ]);

        setSettings(loadedSettings);
        setApiKey(secrets.claude_api_key ? '••••••••••••••••' : '');

        // Check if current model is one of the presets
        const presets = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet', 'ollama', 'claude-code'];
        if (loadedSettings.defaultModel && !presets.includes(loadedSettings.defaultModel)) {
          setIsCustomModel(true);
        }

        setLocalModels({
          ollama: ollamaInfo?.installed || false,
          claudeCode: claudeInfo?.installed || false
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

    const fetchOllamaModels = async () => {
      try {
        const models = await tauriApi.getOllamaModels();
        setOllamaModelsList(models);
      } catch (error) {
        console.error('Failed to fetch Ollama models:', error);
      }
    };

    loadSettings();
    // Try to fetch Ollama models if we suspect it might be there (or just try anyway)
    fetchOllamaModels();
  }, [toast]);

  // Auto-save settings
  useEffect(() => {
    if (loading) return;

    const saveSettings = async () => {
      setSaving(true);
      try {
        await tauriApi.saveGlobalSettings(settings);

        // Save API key if changed and not the placeholder
        if (apiKey && apiKey !== '••••••••••••••••') {
          // If the model is a hosted one, save the legacy key too for backward compat
          await tauriApi.saveSecret('ANTHROPIC_API_KEY', apiKey);
          await tauriApi.saveSecret('claude_api_key', apiKey);
        }

        // Re-apply theme
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
  }, [settings, apiKey, loading, toast]);

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

  const handleAddMcpServer = () => {
    if (!newMcpServer.id || !newMcpServer.command) {
      toast({ title: 'Error', description: 'ID and Command are required', variant: 'destructive' });
      return;
    }

    const argsList = newMcpServer.args.split(',').map(s => s.trim()).filter(Boolean);

    setSettings(prev => ({
      ...prev,
      mcpServers: [
        ...(prev.mcpServers || []),
        {
          ...newMcpServer,
          args: argsList,
          env: {}
        }
      ]
    }));

    setNewMcpServer({ id: '', name: '', command: 'npx', args: '', enabled: true });
    setShowAddMcp(false);
    toast({ title: 'Success', description: 'MCP Server added' });
  };

  const handleDeleteMcpServer = (id: string) => {
    setSettings(prev => ({
      ...prev,
      mcpServers: prev.mcpServers.filter(s => s.id !== id)
    }));
    toast({ title: 'Removed', description: 'MCP Server removed' });
  };

  const handleToggleMcpServer = (id: string) => {
    setSettings(prev => ({
      ...prev,
      mcpServers: prev.mcpServers.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    }));
  };

  const loadFromMarketplace = (server: typeof COMMUNTIY_MCP_SERVERS[0]) => {
    setNewMcpServer({
      id: server.id,
      name: server.name,
      command: server.command,
      args: server.args.join(', '),
      enabled: true
    });
    setShowAddMcp(true);
    // Use timeout to allow state update and DOM render
    setTimeout(() => {
      addMcpFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleThemeChange = (value: string) => {
    setSettings(prev => ({ ...prev, theme: value }));
    applyTheme(value);
  }

  const handleModelChange = (value: string) => {
    const isOllamaModel = ollamaModelsList.includes(value);
    const isClaudeCode = value === 'claude-code';
    const isHosted = !isOllamaModel && !isClaudeCode;

    setSettings(prev => {
      let newSettings = { ...prev, defaultModel: value };

      if (isOllamaModel) {
        newSettings.activeProvider = 'ollamaViaMcp';
        newSettings.ollama = { ...prev.ollama, model: value };
      } else if (isClaudeCode) {
        newSettings.activeProvider = 'claudeCode';
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

                {/* Detected AI */}
                <section className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Detected Local AI</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI models found running on your local machine</p>
                  </div>

                  <div className="flex gap-4 max-w-2xl">
                    {/* Ollama Status */}
                    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border flex-1 ${localModels.ollama ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${localModels.ollama ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Ollama</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">{localModels.ollama ? 'Running on localhost:11434' : 'Not detected'}</div>
                        </div>
                      </div>
                      {localModels.ollama && !settings.mcpServers?.some(s => s.id === 'ollama') && (
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-white dark:bg-black" onClick={() => loadFromMarketplace(COMMUNTIY_MCP_SERVERS.find(s => s.id === 'ollama')!)}>
                          Configure
                        </Button>
                      )}
                      {settings.mcpServers?.some(s => s.id === 'ollama') && <Check className="w-4 h-4 text-green-600" />}
                    </div>

                    {/* Claude Code Status */}
                    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border flex-1 ${localModels.claudeCode ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${localModels.claudeCode ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Claude Code</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">{localModels.claudeCode ? 'Installed on system' : 'Not detected'}</div>
                        </div>
                      </div>
                      {localModels.claudeCode && !settings.mcpServers?.some(s => s.id === 'claude-code') && (
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-white dark:bg-black" onClick={() => loadFromMarketplace(COMMUNTIY_MCP_SERVERS.find(s => s.id === 'claude-code')!)}>
                          Configure
                        </Button>
                      )}
                      {settings.mcpServers?.some(s => s.id === 'claude-code') && <Check className="w-4 h-4 text-green-600" />}
                    </div>
                  </div>
                </section>

                {/* MCP Servers */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">MCP Servers</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage Model Context Protocol servers</p>
                    </div>
                    <div className="flex gap-2">
                      {!showAddMcp && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => {
                            // Scroll to marketplace
                            document.getElementById('mcp-marketplace')?.scrollIntoView({ behavior: 'smooth' });
                          }}>
                            Marketplace
                          </Button>
                          <Button size="sm" onClick={() => {
                            setNewMcpServer({ id: '', name: '', command: 'npx', args: '', enabled: true });
                            setShowAddMcp(true);
                            setTimeout(() => addMcpFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                          }}>
                            Add Custom
                          </Button>
                        </>
                      )}
                      {showAddMcp && (
                        <Button size="sm" variant="ghost" onClick={() => setShowAddMcp(false)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Add/Edit Form */}
                  {showAddMcp && (
                    <div ref={addMcpFormRef} className="p-4 border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-lg space-y-3 animate-in slide-in-from-top-2 max-w-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-sm text-indigo-900 dark:text-indigo-100">Add New Server</h4>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddMcp(false)}><X className="w-4 h-4" /></Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Internal ID (e.g. "search")</Label>
                          <Input
                            placeholder="id"
                            value={newMcpServer.id}
                            onChange={e => setNewMcpServer(prev => ({ ...prev, id: e.target.value }))}
                            className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Display Name</Label>
                          <Input
                            placeholder="Google Search"
                            value={newMcpServer.name}
                            onChange={e => setNewMcpServer(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Executable Command</Label>
                        <Input
                          placeholder="npx, python, etc."
                          value={newMcpServer.command}
                          onChange={e => setNewMcpServer(prev => ({ ...prev, command: e.target.value }))}
                          className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Arguments (comma separated)</Label>
                        <Input
                          placeholder="-y, @modelcontextprotocol/server-everything"
                          value={newMcpServer.args}
                          onChange={e => setNewMcpServer(prev => ({ ...prev, args: e.target.value }))}
                          className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <Button className="w-full mt-2" onClick={handleAddMcpServer}>Save Server</Button>
                    </div>
                  )}

                  {/* Configured Servers List */}
                  <div className="space-y-3 max-w-2xl">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px] mb-2">Active Configuration</h3>
                    {settings.mcpServers?.length === 0 ? (
                      <p className="text-sm text-center py-8 border-2 border-dashed rounded-lg text-gray-400 italic">No MCP servers configured yet.</p>
                    ) : (
                      settings.mcpServers?.map(server => (
                        <div key={server.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg bg-gray-50/30 dark:bg-gray-900/20">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{server.name || server.id}</span>
                              {!server.enabled && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">Disabled</span>}
                            </div>
                            <code className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 max-w-[300px] truncate" title={`${server.command} ${server.args.join(' ')}`}>
                              {server.command} {server.args.join(' ')}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={server.enabled}
                              onCheckedChange={() => handleToggleMcpServer(server.id)}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleDeleteMcpServer(server.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Marketplace */}
                  <div id="mcp-marketplace" className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-4 h-4 text-purple-500" />
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">MCP Marketplace</h3>
                    </div>

                    <div className="mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg max-w-2xl">
                      <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                        <strong>Required:</strong> "Auto-run" servers use <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">npx</code> and require <a href="https://nodejs.org" target="_blank" className="underline font-medium hover:text-blue-600">Node.js</a> installed locally.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
                      {COMMUNTIY_MCP_SERVERS.map(server => {
                        const isInstalled = settings.mcpServers?.some(s => s.id === server.id);
                        return (
                          <div key={server.id} className={`group relative border dark:border-gray-800 rounded-lg p-3 ${isInstalled ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-gray-50/30 dark:bg-gray-900/20'} hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-sm`}>
                            <div className="flex justify-between items-start mb-1 h-full flex-col">
                              <div className="w-full flex justify-between items-start">
                                <div>
                                  <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">{server.name}</div>
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-1 mb-2">
                                    {server.description}
                                  </div>
                                </div>
                                {isInstalled ? (
                                  <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">
                                    <Check className="w-3 h-3" /> Installed
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 text-[10px] gap-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                    onClick={() => loadFromMarketplace(server)}
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </Button>
                                )}
                              </div>
                              <div className="mt-auto pt-2 flex items-center gap-1.5 w-full">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium lowercase ${server.command === 'npx' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-500' : 'bg-gray-100 text-gray-500'}`}>
                                  {server.command === 'npx' ? 'requires node.js' : 'local'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>

                {/* API Configuration */}
                <section className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Claude Hosted API</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure credentials for hosted models (only if not using MCP)</p>
                  </div>

                  <div className="space-y-6 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="api-key" className="text-sm font-medium">Anthropic API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="api-key"
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="sk-ant-..."
                          className="font-mono text-xs bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <p className="text-xs text-gray-400">
                        Securely stored in your system keychain.
                      </p>
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
                              <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                              <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                              <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                              <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                            </SelectGroup>

                            {(localModels.ollama || localModels.claudeCode) && (
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
                              </SelectGroup>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
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
