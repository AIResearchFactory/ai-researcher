import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { ClaudeCodeInfo, OllamaInfo } from '@/api/tauri';

interface DependencyStatusProps {
  claudeCodeInfo: ClaudeCodeInfo | null;
  ollamaInfo: OllamaInfo | null;
  isDetecting: boolean;
}

export default function DependencyStatus({
  claudeCodeInfo,
  ollamaInfo,
  isDetecting
}: DependencyStatusProps) {
  const renderStatus = (
    name: string,
    info: ClaudeCodeInfo | OllamaInfo | null,
    showRunning?: boolean
  ) => {
    if (isDetecting) {
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

    const isInstalled = info?.installed ?? false;
    const hasVersion = info?.version;
    const isOllama = info && 'running' in info;
    const isRunning = isOllama && showRunning ? (info as OllamaInfo).running : undefined;

    return (
      <div
        className={`p-4 rounded-lg border-2 ${
          isInstalled
            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {isInstalled ? (
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">{name}</h4>
              {isInstalled ? (
                <div className="mt-1 space-y-1">
                  {hasVersion && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Version: <span className="font-mono">{info?.version}</span>
                    </p>
                  )}
                  {info?.path && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-mono truncate">
                      {String(info.path)}
                    </p>
                  )}
                  {info?.in_path && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 rounded">
                      Available in PATH
                    </span>
                  )}
                  {isRunning !== undefined && (
                    <div className="flex items-center gap-2 mt-2">
                      {isRunning ? (
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
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Not detected on this system
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
          {renderStatus('Claude Code', claudeCodeInfo, false)}
          {renderStatus('Ollama', ollamaInfo, true)}
        </div>

        {!isDetecting && (!claudeCodeInfo?.installed || !ollamaInfo?.installed) && (
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
        )}
      </CardContent>
    </Card>
  );
}
