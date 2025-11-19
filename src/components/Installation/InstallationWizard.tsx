import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { tauriApi, ClaudeCodeInfo, OllamaInfo, InstallationProgress as TauriInstallationProgress } from '@/api/tauri';
import ProgressDisplay, { ProgressStep } from './ProgressDisplay';
import DirectorySelector from './DirectorySelector';
import DependencyStatus from './DependencyStatus';
import InstallationInstructions from './InstallationInstructions';
import { BrainCircuit, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type WizardStep =
  | 'welcome'
  | 'directory'
  | 'detecting'
  | 'dependencies'
  | 'instructions'
  | 'installing'
  | 'complete';

interface InstallationWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function InstallationWizard({ onComplete, onSkip }: InstallationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [selectedPath, setSelectedPath] = useState('');
  const [defaultPath, setDefaultPath] = useState('');
  const [claudeCodeInfo, setClaudeCodeInfo] = useState<ClaudeCodeInfo | null>(null);
  const [ollamaInfo, setOllamaInfo] = useState<OllamaInfo | null>(null);
  const [claudeCodeInstructions, setClaudeCodeInstructions] = useState('');
  const [ollamaInstructions, setOllamaInstructions] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installationProgress, setInstallationProgress] = useState<TauriInstallationProgress | null>(null);
  const { toast } = useToast();

  // Load default path on mount
  useEffect(() => {
    const loadDefaultPath = async () => {
      try {
        const config = await tauriApi.checkInstallationStatus();
        setDefaultPath(config.app_data_path);
        setSelectedPath(config.app_data_path);
      } catch (error) {
        console.error('Failed to load default path:', error);
      }
    };
    loadDefaultPath();
  }, []);

  const detectDependencies = async () => {
    setIsDetecting(true);
    try {
      const [claude, ollama, claudeInstr, ollamaInstr] = await Promise.all([
        tauriApi.detectClaudeCode(),
        tauriApi.detectOllama(),
        tauriApi.getClaudeCodeInstallInstructions(),
        tauriApi.getOllamaInstallInstructions()
      ]);

      setClaudeCodeInfo(claude);
      setOllamaInfo(ollama);
      setClaudeCodeInstructions(claudeInstr);
      setOllamaInstructions(ollamaInstr);
    } catch (error) {
      console.error('Failed to detect dependencies:', error);
      toast({
        title: 'Detection Error',
        description: 'Failed to detect dependencies. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleNext = async () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('directory');
        break;
      case 'directory':
        setCurrentStep('detecting');
        await detectDependencies();
        setCurrentStep('dependencies');
        break;
      case 'dependencies':
        if (!claudeCodeInfo?.installed || !ollamaInfo?.installed) {
          setCurrentStep('instructions');
        } else {
          setCurrentStep('installing');
          await runInstallation();
        }
        break;
      case 'instructions':
        setCurrentStep('installing');
        await runInstallation();
        break;
      case 'complete':
        onComplete();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'directory':
        setCurrentStep('welcome');
        break;
      case 'dependencies':
        setCurrentStep('directory');
        break;
      case 'instructions':
        setCurrentStep('dependencies');
        break;
    }
  };

  const handleRedetect = async () => {
    await detectDependencies();
  };

  const runInstallation = async () => {
    setIsInstalling(true);
    try {
      const result = await tauriApi.runInstallation((progress) => {
        setInstallationProgress(progress);
      });

      if (result.success) {
        setCurrentStep('complete');
        toast({
          title: 'Installation Complete',
          description: 'Application setup completed successfully!'
        });
      } else {
        toast({
          title: 'Installation Error',
          description: result.error_message || 'Installation failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Installation failed:', error);
      toast({
        title: 'Installation Error',
        description: `Failed to complete installation: ${error}`,
        variant: 'destructive'
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const getProgressSteps = (): ProgressStep[] => {
    const baseSteps: ProgressStep[] = [
      {
        id: 'init',
        label: 'Initialize',
        status: installationProgress ?
          (installationProgress.stage === 'initializing' ? 'in_progress' : 'completed') :
          'pending',
        message: installationProgress?.stage === 'initializing' ? installationProgress.message : undefined
      },
      {
        id: 'structure',
        label: 'Create Directory Structure',
        status: installationProgress ?
          (installationProgress.stage === 'creating_structure' ? 'in_progress' :
           ['initializing'].includes(installationProgress.stage) ? 'pending' : 'completed') :
          'pending',
        message: installationProgress?.stage === 'creating_structure' ? installationProgress.message : undefined
      },
      {
        id: 'detect',
        label: 'Detect Dependencies',
        status: installationProgress ?
          (installationProgress.stage === 'detecting_dependencies' ? 'in_progress' :
           ['initializing', 'creating_structure'].includes(installationProgress.stage) ? 'pending' : 'completed') :
          'pending',
        message: installationProgress?.stage === 'detecting_dependencies' ? installationProgress.message : undefined
      },
      {
        id: 'finalize',
        label: 'Finalize Setup',
        status: installationProgress ?
          (installationProgress.stage === 'finalizing' ? 'in_progress' :
           installationProgress.stage === 'complete' ? 'completed' : 'pending') :
          'pending',
        message: installationProgress?.stage === 'finalizing' ? installationProgress.message : undefined
      }
    ];

    return baseSteps;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl">
                <BrainCircuit className="w-14 h-14 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Welcome to AI Research Assistant
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Let's set up your application. This wizard will guide you through the installation
                process and ensure all dependencies are properly configured.
              </p>
            </div>
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
                  What will be set up:
                </h3>
                <ul className="space-y-2 text-left text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Application data directory and folder structure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Detection of required dependencies (Claude Code & Ollama)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Default configuration files and templates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Initial projects and skills setup</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 'directory':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Choose Installation Directory
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select where to store your application data
              </p>
            </div>
            <DirectorySelector
              selectedPath={selectedPath}
              onPathChange={setSelectedPath}
              defaultPath={defaultPath}
            />
          </div>
        );

      case 'detecting':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-3xl">🔍</span>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Detecting Dependencies
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we check for required software...
              </p>
            </div>
          </div>
        );

      case 'dependencies':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Dependency Check
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Review detected dependencies
              </p>
            </div>
            <DependencyStatus
              claudeCodeInfo={claudeCodeInfo}
              ollamaInfo={ollamaInfo}
              isDetecting={isDetecting}
            />
          </div>
        );

      case 'instructions':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Installation Instructions
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Follow these steps to install missing dependencies
              </p>
            </div>
            <InstallationInstructions
              claudeCodeInstructions={claudeCodeInstructions}
              ollamaInstructions={ollamaInstructions}
              claudeCodeMissing={!claudeCodeInfo?.installed}
              ollamaMissing={!ollamaInfo?.installed}
              onRedetect={handleRedetect}
              isRedetecting={isDetecting}
            />
          </div>
        );

      case 'installing':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Installing...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Setting up your application
              </p>
            </div>
            <ProgressDisplay
              steps={getProgressSteps()}
              currentStepId={installationProgress?.stage || 'init'}
              progressPercentage={installationProgress?.progress_percentage || 0}
            />
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Installation Complete!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Your AI Research Assistant is now ready to use. Click below to start exploring!
              </p>
            </div>
            <Card className="max-w-2xl mx-auto bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
                  What's Next?
                </h3>
                <ul className="space-y-2 text-left text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">→</span>
                    <span>Create your first research project</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">→</span>
                    <span>Explore pre-built AI skills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">→</span>
                    <span>Configure your Claude API key in settings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">→</span>
                    <span>Start chatting with AI assistants</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'directory':
        return selectedPath.length > 0;
      case 'instructions':
        return true; // Allow proceeding even with missing deps
      default:
        return true;
    }
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case 'welcome':
        return 'Get Started';
      case 'instructions':
        return 'Continue Anyway';
      case 'complete':
        return 'Launch Application';
      default:
        return 'Next';
    }
  };

  const showBackButton = ['directory', 'dependencies', 'instructions'].includes(currentStep);
  const showNextButton = !['detecting', 'installing'].includes(currentStep);
  const showSkipButton = currentStep === 'welcome' && onSkip;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div>
                {showBackButton && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isDetecting || isInstalling}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                {showSkipButton && (
                  <Button
                    variant="ghost"
                    onClick={onSkip}
                  >
                    Skip Setup
                  </Button>
                )}
              </div>

              <div>
                {showNextButton && (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || isDetecting || isInstalling}
                    size="lg"
                  >
                    {getNextButtonText()}
                    {currentStep !== 'complete' && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
