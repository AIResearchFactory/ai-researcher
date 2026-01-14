import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Loader2, AlertCircle, Shield, ShieldCheck } from 'lucide-react';
import { ClaudeCodeInfo, OllamaInfo, GeminiInfo } from '@/api/tauri';

interface DependencyStatusProps {
  claudeCodeInfo: ClaudeCodeInfo | null;
  ollamaInfo: OllamaInfo | null;
  geminiInfo: GeminiInfo | null;
  isDetecting: boolean;
}

interface BaseInfo {
  installed?: boolean;
  version?: string;
  path?: string;
  in_path?: boolean;
}

interface DependencyInfo extends BaseInfo {
  running?: boolean;
  authenticated?: boolean;
}

function DetectingState({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">Detecting...</span>
    </div>
  );
}

function StatusIcon({ isInstalled }: { isInstalled: boolean }) {
  return isInstalled ? (
    <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
  ) : (
    <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
  );
}

function VersionInfo({ version }: { version?: string }) {
  if (!version) return null;
  return (
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Version: <span className="font-mono">{version}</span>
    </p>
  );
}

function PathInfo({ path }: { path?: string }) {
  if (!path) return null;
  return (
    <p className="text-xs text-gray-500 dark:text-gray-500 font-mono truncate">
      {String(path)}
    </p>
  );
}

function InPathBadge({ inPath }: { inPath?: boolean }) {
  if (!inPath) return null;
  return (
    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 rounded">
      Available in PATH
    </span>
  );
}

function RunningStatus({ running }: { running?: boolean }) {
  if (running === undefined) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      {running ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">
            Running
          </span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Not Running
          </span>
        </>
      )}
    </div>
  );
}

function AuthenticationStatus({ authenticated }: { authenticated?: boolean }) {
  if (authenticated === undefined) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      {authenticated ? (
        <>
          <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">
            Authenticated
          </span>
        </>
      ) : (
        <>
          <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm text-yellow-700 dark:text-yellow-300">
            Not Authenticated
          </span>
        </>
      )}
    </div>
  );
}

function InstalledDetails({ info }: { info: DependencyInfo }) {
  return (
    <div className="mt-1 space-y-1">
      <VersionInfo version={info.version} />
      <PathInfo path={info.path} />
      <InPathBadge inPath={info.in_path} />
      <RunningStatus running={info.running} />
      <AuthenticationStatus authenticated={info.authenticated} />
    </div>
  );
}

function NotInstalledMessage() {
  return (
    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
      Not detected on this system
    </p>
  );
}

function DependencyCard({ name, info, isInstalled }: { name: string; info: DependencyInfo; isInstalled: boolean }) {
  const containerClass = isInstalled
    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
    : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';

  return (
    <div className={`p-4 rounded-lg border-2 ${containerClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <StatusIcon isInstalled={isInstalled} />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{name}</h4>
            {isInstalled ? <InstalledDetails info={info} /> : <NotInstalledMessage />}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeDependencyInfo(
  info: ClaudeCodeInfo | OllamaInfo | GeminiInfo | null,
  showRunning: boolean,
  showAuthenticated: boolean
): DependencyInfo {
  if (!info) {
    return { installed: false };
  }

  const normalized: DependencyInfo = {
    installed: info.installed ?? false,
    version: info.version,
    path: info.path,
    in_path: info.in_path
  };

  if (showRunning && 'running' in info) {
    normalized.running = info.running;
  }

  if (showAuthenticated && 'authenticated' in info) {
    normalized.authenticated = info.authenticated;
  }

  return normalized;
}

function DependencyItem({ 
  name, 
  info, 
  isDetecting, 
  showRunning = false, 
  showAuthenticated = false 
}: { 
  name: string; 
  info: ClaudeCodeInfo | OllamaInfo | GeminiInfo | null; 
  isDetecting: boolean;
  showRunning?: boolean;
  showAuthenticated?: boolean;
}) {
  if (isDetecting) {
    return <DetectingState name={name} />;
  }

  const normalizedInfo = normalizeDependencyInfo(info, showRunning, showAuthenticated);
  return <DependencyCard name={name} info={normalizedInfo} isInstalled={normalizedInfo.installed ?? false} />;
}

function MissingDependenciesWarning() {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
        <div className="text-sm text-yellow-800 dark:text-yellow-200">
          <p className="font-medium mb-1">Missing Dependencies</p>
          <p>
            Some dependencies are not installed. You'll be provided with installation
            instructions in the next step.
          </p>
        </div>
      </div>
    </div>
  );
}

function hasMissingDependencies(
  claudeCodeInfo: ClaudeCodeInfo | null,
  ollamaInfo: OllamaInfo | null,
  geminiInfo: GeminiInfo | null
): boolean {
  return !claudeCodeInfo?.installed || !ollamaInfo?.installed || !geminiInfo?.installed;
}

export default function DependencyStatus({
  claudeCodeInfo,
  ollamaInfo,
  geminiInfo,
  isDetecting
}: DependencyStatusProps) {
  const showWarning = !isDetecting && hasMissingDependencies(claudeCodeInfo, ollamaInfo, geminiInfo);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Dependency Detection
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Checking for required dependencies on your system
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <DependencyItem name="Claude Code" info={claudeCodeInfo} isDetecting={isDetecting} />
          <DependencyItem name="Ollama" info={ollamaInfo} isDetecting={isDetecting} showRunning={true} />
          <DependencyItem name="Gemini CLI" info={geminiInfo} isDetecting={isDetecting} showAuthenticated={true} />
        </div>

        {showWarning && <MissingDependenciesWarning />}
      </CardContent>
    </Card>
  );
}

// Made with Bob
