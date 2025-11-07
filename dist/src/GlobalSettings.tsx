
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Key, Bell, Palette, Database, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tauriApi } from './api/tauri';
import { useToast } from '@/hooks/use-toast';

export default function GlobalSettingsPage() {
  const [globalSettings, setGlobalSettings] = useState({
    apiKey: '',
    defaultModel: 'claude-3-opus',
    theme: 'dark',
    notifications: true,
    dataDirectory: ''
  });
  const [loading, setLoading] = useState(false);
  const [isApiKeyMasked, setIsApiKeyMasked] = useState(true);
  const { toast } = useToast();

  // Load settings and secrets on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settings, secrets] = await Promise.all([
          tauriApi.getGlobalSettings(),
          tauriApi.getSecrets()
        ]);

        setGlobalSettings({
          apiKey: secrets.claude_api_key ? '••••••••••••••••' : '',
          defaultModel: settings.model || 'claude-3-opus',
          theme: settings.theme || 'dark',
          notifications: settings.notifications_enabled ?? true,
          dataDirectory: settings.data_directory || ''
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive'
        });
      }
    };

    loadSettings();
  }, [toast]);

  const handleSaveGlobal = async () => {
    setLoading(true);
    try {
      // Save global settings
      await tauriApi.saveGlobalSettings({
        model: globalSettings.defaultModel,
        theme: globalSettings.theme,
        notifications_enabled: globalSettings.notifications,
        data_directory: globalSettings.dataDirectory
      });

      // Save API key if it was changed (not masked)
      if (globalSettings.apiKey && globalSettings.apiKey !== '••••••••••••••••') {
        await tauriApi.saveSecrets({
          claude_api_key: globalSettings.apiKey
        });
      }

      toast({
        title: 'Success',
        description: 'Global settings saved successfully'
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
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

        {/* Security Banner */}
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-gray-700 dark:text-gray-300">
            All sensitive data including API keys are encrypted using AES-256 encryption
          </AlertDescription>
        </Alert>

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
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Anthropic API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={globalSettings.apiKey}
                onChange={(e) => setGlobalSettings({ ...globalSettings, apiKey: e.target.value })}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your API key is stored securely and encrypted
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-model">Default AI Model</Label>
              <select
                id="default-model"
                value={globalSettings.defaultModel}
                onChange={(e) => setGlobalSettings({ ...globalSettings, defaultModel: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
              >
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </select>
            </div>
          </CardContent>
        </Card>

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
                value={globalSettings.theme}
                onChange={(e) => setGlobalSettings({ ...globalSettings, theme: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
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
                checked={globalSettings.notifications}
                onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, notifications: checked })}
              />
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
              <Input
                id="data-dir"
                value={globalSettings.dataDirectory}
                readOnly
                className="bg-gray-50 dark:bg-gray-900"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Location where all projects and data are stored
              </p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSaveGlobal} className="w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Save Global Settings'}
        </Button>
      </div>
    </ScrollArea>
  );
}
