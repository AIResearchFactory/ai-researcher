import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Key, Bell, Palette, Database, Shield, Check, Loader2, FolderOpen, X, Plus, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tauriApi, GlobalSettings } from '../api/tauri';
import { useToast } from '@/hooks/use-toast';
import { open } from '@tauri-apps/plugin-dialog';


const RECOMMENDED_MCP_SERVERS = [
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web search capabilities via Brave',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search']
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Access to local files',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/username/Desktop']
  },
  {
    id: 'ollama',
    name: 'Ollama (via MCP)',
    description: 'Local LLM integration. Requires running Ollama server.',
    command: 'npx',
    args: ['-y', 'ollama-mcp-server']
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Access GitHub repositories and issues',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github']
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Anthropic\'s coding assistant tools',
    command: 'npx',
    args: ['-y', '@anthropic-ai/claude-code']
  }
];

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings>({} as GlobalSettings);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localModels, setLocalModels] = useState<{ ollama: boolean; claudeCode: boolean }>({ ollama: false, claudeCode: false });
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [newMcpServer, setNewMcpServer] = useState({
    id: '',
    name: '',
    command: 'npx',
    args: '',
    enabled: true
  });
  const [showAddMcp, setShowAddMcp] = useState(false);
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

        setSettings(loadedSettings);

        setApiKey(secrets.claude_api_key ? '••••••••••••••••' : '');

        // Check if current model is one of the presets
        const presets = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet', 'ollama', 'claude-code'];
        if (loadedSettings.defaultModel && !presets.includes(loadedSettings.defaultModel)) {
          setIsCustomModel(true);
        }

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

  const handleAddMcpServer = () => {
    if (!newMcpServer.id || !newMcpServer.command) {
      toast({
        title: 'Validation Error',
        description: 'ID and Command are required',
        variant: 'destructive'
      });
      return;
    }

    const server = {
      ...newMcpServer,
      args: newMcpServer.args.split(',').map(a => a.trim()).filter(a => a),
      env: {} // Default empty env for now
    };

    setSettings(prev => ({
      ...prev,
      mcpServers: [...(prev.mcpServers || []), server]
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
              <div className="flex items-center justify-between">
                <Label htmlFor="default-model">Default AI Model</Label>
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
                  />
                  <p className="text-[10px] text-gray-500">
                    Enter the exact model identifier from the provider's API documentation.
                  </p>
                </div>
              ) : (
                <select
                  id="default-model"
                  value={settings.defaultModel}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultModel: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Hosted Models (Requires API Key)">
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="claude-3-opus">Claude 3 Opus</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                  </optgroup>

                  {(localModels.ollama || localModels.claudeCode) && (
                    <optgroup label="Local Models">
                      {localModels.ollama && <option value="ollama">Ollama (Local MCP)</option>}
                      {localModels.claudeCode && <option value="claude-code">Claude Code (Local)</option>}
                    </optgroup>
                  )}
                </select>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This model will be used by default for new chats and research tasks.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* MCP Servers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle>MCP Servers</CardTitle>
              </div>
              <Button size="sm" onClick={() => setShowAddMcp(!showAddMcp)}>
                {showAddMcp ? 'Cancel' : 'Add Server'}
              </Button>
            </div>
            <CardDescription>
              Manage Model Context Protocol servers to extend AI capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* MCP Marketplace / Recommended Servers */}
            <div className="mb-8 p-4 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">MCP Marketplace</h3>
                  <p className="text-[11px] text-purple-700/70 dark:text-purple-400/70">Quickly add powerful capabilities to your AI</p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg">
                <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  <strong>How it works:</strong> Recommended servers use <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">npx</code> to automatically download and run the server locally on your computer. Make sure you have <a href="https://nodejs.org" target="_blank" className="underline font-medium hover:text-blue-600">Node.js</a> installed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RECOMMENDED_MCP_SERVERS.map(server => (
                  <div key={server.id} className="group relative border dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900/50 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">{server.name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600"
                        onClick={() => {
                          setNewMcpServer({
                            id: server.id,
                            name: server.name,
                            command: server.command,
                            args: server.args.join(', '),
                            enabled: true
                          });
                          setShowAddMcp(true);
                        }}
                        title="Use this template"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight pr-6">
                      {server.description}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 font-medium lowercase">
                        {server.command === 'npx' ? 'auto-run (npx)' : 'local'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-gray-500 italic text-center">
                Note: "auto-run" servers require Node.js installed on your system.
              </p>
            </div>

            <div className="flex items-center justify-between border-t pt-4 dark:border-gray-800">
              <h3 className="text-sm font-medium">Configured Servers</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddMcp(!showAddMcp)} className="gap-2 h-8 text-xs">
                <Plus className="w-3 h-3" />
                {showAddMcp ? 'Cancel' : 'Add Custom'}
              </Button>
            </div>

            {showAddMcp && (
              <div className="p-4 border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-lg space-y-3 mb-4 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Internal ID (e.g. "search")</Label>
                    <Input
                      placeholder="id"
                      value={newMcpServer.id}
                      onChange={e => setNewMcpServer(prev => ({ ...prev, id: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Display Name</Label>
                    <Input
                      placeholder="Google Search"
                      value={newMcpServer.name}
                      onChange={e => setNewMcpServer(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Executable Command</Label>
                  <Input
                    placeholder="npx, python, etc."
                    value={newMcpServer.command}
                    onChange={e => setNewMcpServer(prev => ({ ...prev, command: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Arguments (comma separated)</Label>
                  <Input
                    placeholder="-y, @modelcontextprotocol/server-everything"
                    value={newMcpServer.args}
                    onChange={e => setNewMcpServer(prev => ({ ...prev, args: e.target.value }))}
                  />
                </div>
                <Button className="w-full mt-2" onClick={handleAddMcpServer}>Save Server</Button>
              </div>
            )}

            <div className="space-y-3">
              {settings.mcpServers?.length === 0 ? (
                <p className="text-sm text-center py-4 text-gray-500 italic">No MCP servers configured.</p>
              ) : (
                settings.mcpServers?.map(server => (
                  <div key={server.id} className="flex items-center justify-between p-3 border dark:border-gray-800 rounded-md bg-white dark:bg-gray-900/50">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{server.name || server.id}</span>
                        {!server.enabled && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Disabled</span>}
                      </div>
                      <code className="text-[10px] text-gray-500 mt-1">{server.command} {server.args.join(' ')}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={server.enabled}
                        onCheckedChange={() => handleToggleMcpServer(server.id)}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteMcpServer(server.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
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
    </ScrollArea >
  );
}
