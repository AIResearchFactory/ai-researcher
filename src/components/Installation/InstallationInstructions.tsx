import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, ExternalLink, Check, AlertCircle } from 'lucide-react';

interface InstallationInstructionsProps {
  claudeCodeInstructions?: string;
  ollamaInstructions?: string;
  geminiInstructions?: string;
  claudeCodeMissing: boolean;
  ollamaMissing: boolean;
  geminiMissing: boolean;
  onRedetect: () => void;
  isRedetecting: boolean;
}

export default function InstallationInstructions({
  claudeCodeInstructions,
  ollamaInstructions,
  geminiInstructions,
  claudeCodeMissing,
  ollamaMissing,
  geminiMissing,
  onRedetect,
  isRedetecting
}: InstallationInstructionsProps) {
  const [copiedClaudeCode, setCopiedClaudeCode] = useState(false);
  const [copiedOllama, setCopiedOllama] = useState(false);
  const [copiedGemini, setCopiedGemini] = useState(false);

  const copyToClipboard = async (text: string, type: 'claude' | 'ollama' | 'gemini') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'claude') {
        setCopiedClaudeCode(true);
        setTimeout(() => setCopiedClaudeCode(false), 2000);
      } else if (type === 'ollama') {
        setCopiedOllama(true);
        setTimeout(() => setCopiedOllama(false), 2000);
      } else {
        setCopiedGemini(true);
        setTimeout(() => setCopiedGemini(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const extractInstallCommand = (instructions: string): string | null => {
    const curlMatch = instructions.match(/curl -fsSL [^\s]+/);
    const brewMatch = instructions.match(/brew install [^\s\n]+/);
    return curlMatch?.[0] || brewMatch?.[0] || null;
  };

  const renderInstructionCard = (
    name: string,
    instructions: string | undefined,
    isMissing: boolean,
    copiedState: boolean,
    copyType: 'claude' | 'ollama' | 'gemini'
  ) => {
    if (!isMissing || !instructions) return null;

    const installCommand = extractInstallCommand(instructions);

    return (
      <Card className="border-2 border-orange-200 dark:border-orange-800">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {name} Installation Required
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Follow these steps to install {name}
              </p>
            </div>
          </div>

          {/* Quick Install Command */}
          {installCommand && (
            <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Quick Install</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(installCommand, copyType)}
                  className="h-6 text-gray-400 hover:text-white"
                >
                  {copiedState ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <code className="text-sm text-green-400 font-mono block break-all">
                {installCommand}
              </code>
            </div>
          )}

          {/* Full Instructions */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
              {instructions}
            </pre>
          </div>

          {/* External Links */}
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <a
              href={copyType === 'claude' ? 'https://claude.ai/download' : (copyType === 'ollama' ? 'https://ollama.ai/download' : 'https://ai.google.dev/gemini-api/docs/quickstart')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Visit official download page
            </a>
          </div>
        </CardContent>
      </Card>
    );
  };

  if ((!claudeCodeMissing || !geminiMissing) && !ollamaMissing) {
    return (
      <Card className="border-2 border-green-200 dark:border-green-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                All Dependencies Installed
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                All required dependencies are detected and ready to use.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {renderInstructionCard(
        'Claude Code',
        claudeCodeInstructions,
        claudeCodeMissing,
        copiedClaudeCode,
        'claude'
      )}
      {renderInstructionCard(
        'Ollama',
        ollamaInstructions,
        ollamaMissing,
        copiedOllama,
        'ollama'
      )}
      {renderInstructionCard(
        'Gemini CLI',
        geminiInstructions,
        geminiMissing,
        copiedGemini,
        'gemini'
      )}

      {/* Re-detect Button */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Installed the dependencies?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the button below to check if the dependencies are now available on your system.
              </p>
            </div>
            <Button
              onClick={onRedetect}
              disabled={isRedetecting}
              className="flex-shrink-0"
            >
              {isRedetecting ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Checking...
                </>
              ) : (
                'Re-detect Dependencies'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
