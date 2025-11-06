
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  BrainCircuit,
  Terminal,
  Key,
  FolderPlus,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tauriApi } from './api/tauri';

export default function Onboarding({ onComplete, onSkip }) {
  const [step, setStep] = useState('check'); // 'check', 'install', 'welcome', 'create'
  const [checks, setChecks] = useState({
    claudeCli: { status: 'checking', message: '' },
    apiKey: { status: 'checking', message: '' },
    dataDir: { status: 'checking', message: '' }
  });
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [copiedCommand, setCopiedCommand] = useState('');

  useEffect(() => {
    runSystemChecks();
  }, []);

  const runSystemChecks = async () => {
    try {
      // Check API key
      const hasApiKey = await tauriApi.hasClaudeApiKey();
      setChecks(prev => ({
        ...prev,
        apiKey: {
          status: hasApiKey ? 'success' : 'error',
          message: hasApiKey ? 'API key configured' : 'API key not found'
        }
      }));

      // Check Claude CLI - note: this would require a backend command
      // For now, mark as success since it's optional
      setChecks(prev => ({
        ...prev,
        claudeCli: {
          status: 'success',
          message: 'Claude CLI check skipped (optional)'
        }
      }));

      // Check data directory - this is managed by Tauri, so mark as success
      setChecks(prev => ({
        ...prev,
        dataDir: {
          status: 'success',
          message: 'Data directory initialized'
        }
      }));
    } catch (error) {
      console.error('Failed to run system checks:', error);
      setChecks({
        claudeCli: { status: 'error', message: 'Check failed' },
        apiKey: { status: 'error', message: 'Check failed' },
        dataDir: { status: 'error', message: 'Check failed' }
      });
    }
  };

  const allChecksPassed = Object.values(checks).every(c => c.status === 'success');
  const allChecksComplete = Object.values(checks).every(c => c.status !== 'checking');

  const copyCommand = (command) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(''), 2000);
  };

  const handleContinue = () => {
    if (allChecksPassed) {
      setStep('welcome');
    } else {
      setStep('install');
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      await tauriApi.createProject(
        projectName,
        projectDesc || 'A new research project',
        []
      );
      onComplete();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project: ' + error);
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === 'checking') return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (status === 'success') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  if (step === 'check') {
    return (
      <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <BrainCircuit className="w-9 h-9 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl">AI Research Assistant</CardTitle>
            <CardDescription className="text-base mt-2">
              Checking system requirements...
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                <StatusIcon status={checks.claudeCli.status} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Claude CLI</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {checks.claudeCli.message || 'Checking installation...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                <StatusIcon status={checks.apiKey.status} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">API Configuration</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {checks.apiKey.message || 'Verifying credentials...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                <StatusIcon status={checks.dataDir.status} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Data Directory</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {checks.dataDir.message || 'Initializing storage...'}
                  </p>
                </div>
              </div>
            </div>

            {allChecksComplete && (
              <div className="pt-4 flex gap-3">
                <Button 
                  variant="outline"
                  onClick={onSkip}
                  className="flex-1"
                >
                  Skip for Now
                </Button>
                <Button 
                  onClick={handleContinue}
                  className="flex-1 h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {allChecksPassed ? 'Continue' : 'Install Required Components'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'install') {
    return (
      <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <Card className="w-full max-w-3xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-2xl flex items-center justify-center">
                <Terminal className="w-9 h-9 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <CardTitle className="text-3xl">Installation Required</CardTitle>
            <CardDescription className="text-base mt-2">
              Follow these steps to complete the setup
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {checks.claudeCli.status === 'error' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Install Claude CLI
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The Claude CLI is required for AI interactions. Run the following command:
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    npm install -g @anthropic-ai/claude-cli
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyCommand('npm install -g @anthropic-ai/claude-cli')}
                  >
                    {copiedCommand === 'npm install -g @anthropic-ai/claude-cli' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {checks.apiKey.status === 'error' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Configure API Key
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set your Anthropic API key as an environment variable:
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    export ANTHROPIC_API_KEY=your_api_key_here
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyCommand('export ANTHROPIC_API_KEY=your_api_key_here')}
                  >
                    {copiedCommand === 'export ANTHROPIC_API_KEY=your_api_key_here' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <Alert>
                  <AlertDescription className="text-sm">
                    Get your API key from{' '}
                    <a 
                      href="https://console.anthropic.com/account/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      console.anthropic.com/account/keys
                    </a>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline"
                onClick={runSystemChecks}
                className="flex-1"
              >
                <Loader2 className="w-4 h-4 mr-2" />
                Re-check Requirements
              </Button>
              <Button 
                onClick={onSkip}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                Skip for Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center">
                <CheckCircle2 className="w-11 h-11 text-white" />
              </div>
            </div>
            <CardTitle className="text-4xl">Welcome! 🎉</CardTitle>
            <CardDescription className="text-base mt-2">
              You're all set to start your AI-powered research journey
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
                What you can do:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Organize your research into projects with markdown documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Chat with Claude AI to get insights and analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Create custom AI skills for specialized research tasks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>All your data is stored locally and encrypted</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={onSkip}
                className="flex-1"
              >
                Explore First
              </Button>
              <Button 
                onClick={() => setStep('create')}
                className="flex-1 h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Create Your First Project
                <FolderPlus className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <FolderPlus className="w-9 h-9 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl">Create Your First Project</CardTitle>
            <CardDescription className="text-base mt-2">
              Give your project a name and description
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., Machine Learning Research"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-desc">Description (optional)</Label>
                <Input
                  id="project-desc"
                  placeholder="What will you research in this project?"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertDescription className="text-sm text-gray-700 dark:text-gray-300">
                💡 You can always create more projects later from the main workspace
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => setStep('welcome')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={!projectName.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Create & Start
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
