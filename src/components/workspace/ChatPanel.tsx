import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { tauriApi, ProviderType } from '../../api/tauri';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

import { Star } from 'lucide-react';

interface ChatPanelProps {
  activeProject?: { id: string } | null;
  skills?: any[];
}

export default function ChatPanel({ activeProject, skills = [] }: ChatPanelProps) {
  const [messages, setMessages] = useState<Array<{
    id: number;
    role: string;
    content: string;
    timestamp: Date;
  }>>([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your AI research assistant. How can I help you with your research today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderType>('hostedApi');
  const [currentModel, setCurrentModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [activeSkillId, setActiveSkillId] = useState<string | undefined>(undefined);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Helper to update available models based on provider
  const updateAvailableModels = async (provider: ProviderType, settingsArg?: any) => {
    let models: string[] = [];
    let current = '';

    // If settings not passed, fetch them
    const settings = settingsArg || await tauriApi.getGlobalSettings();

    if (provider === 'ollama') {
      try {
        models = await tauriApi.getOllamaModels();
      } catch (e) {
        console.error("Failed to fetch ollama models", e);
        models = ['llama3']; // Fallback
      }
      current = settings.ollama?.model || models[0] || 'llama3';
    } else if (provider === 'hostedApi') {
      models = ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
      current = settings.hosted?.model || 'claude-3-5-sonnet';
    } else if (provider === 'claudeCode') {
      models = ['default'];
      current = 'default';
    } else if (provider === 'geminiCli') {
      models = [settings.geminiCli?.modelAlias || 'default'];
      current = settings.geminiCli?.modelAlias || 'default';
    }

    setAvailableModels(models);
    setCurrentModel(current);
  };

  useEffect(() => {
    // Load initial settings to get active provider
    const loadSettings = async () => {
      try {
        const settings = await tauriApi.getGlobalSettings();
        if (settings.activeProvider) {
          setActiveProvider(settings.activeProvider);
          await updateAvailableModels(settings.activeProvider, settings);
        }
      } catch (err) {
        console.error('Failed to load global settings:', err);
      }
    };
    loadSettings();
  }, []);

  const handleProviderChange = async (value: string) => {
    const newProvider = value as ProviderType;
    try {
      await tauriApi.switchProvider(newProvider);
      setActiveProvider(newProvider);
      await updateAvailableModels(newProvider);

      toast({
        title: 'Provider Switched',
        description: `Now using ${newProvider}`,
      });
    } catch (err) {
      console.error('Failed to switch provider:', err);
      toast({
        title: 'Error',
        description: 'Failed to switch AI provider',
        variant: 'destructive',
      });
    }
  };

  const handleModelChange = async (value: string) => {
    setCurrentModel(value);
    try {
      // fetch current settings
      const settings = await tauriApi.getGlobalSettings();

      // update specific config depending on active provider
      if (activeProvider === 'ollama') {
        settings.ollama.model = value;
      } else if (activeProvider === 'hostedApi') {
        settings.hosted.model = value;
      } else if (activeProvider === 'geminiCli') {
        settings.geminiCli.modelAlias = value;
      }

      // save global settings
      await tauriApi.saveGlobalSettings(settings);

      // Force reload of provider in backend to pick up new config
      await tauriApi.switchProvider(activeProvider);
      toast({
        title: 'Model Updated',
        description: `Switched to ${value}`,
      });

    } catch (e) {
      console.error("Failed to update model", e);
      toast({ title: 'Error', description: 'Failed to update model preference', variant: 'destructive' });
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    const scrollToBottom = () => {
      if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      // Prepare messages in the format expected by the backend
      const chatMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content }
      ];

      // Use a ref to accumulate streaming content
      let fullResponse = '';

      // Send message using unified service
      const response = await tauriApi.sendMessage(chatMessages, activeProject?.id, activeSkillId);
      fullResponse = response.content;

      // After streaming completes, add the full response to messages
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setStreamingContent('');
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message to AI',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3">
        <div className="flex items-center">
          <Bot className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            AI Chat
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Skill Selector */}
          <Select value={activeSkillId || 'no-skill'} onValueChange={(val) => setActiveSkillId(val === 'no-skill' ? undefined : val)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Star className="w-3 h-3 mr-2" />
              <SelectValue placeholder="Apply Skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-skill">No Skill</SelectItem>
              {skills.map(skill => (
                <SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Provider Selector */}
          <Select value={activeProvider} onValueChange={handleProviderChange}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hostedApi">Hosted Claude</SelectItem>
              <SelectItem value="ollama">Ollama</SelectItem>
              <SelectItem value="claudeCode">Claude Code</SelectItem>
              <SelectItem value="geminiCli">Gemini CLI</SelectItem>
            </SelectContent>
          </Select>

          {/* Model Selector (Hierarchical) */}
          <Select
            value={currentModel}
            onValueChange={handleModelChange}
            disabled={activeProvider === 'claudeCode'} // Claude Code usually manages its own model or is single-purpose
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className={
                  message.role === 'user'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                }>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`inline-block max-w-[85%] p-3 rounded-lg ${message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {streamingContent ? (
                  <div className="inline-block max-w-[85%] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded-lg">
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2">
                      <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    </div>
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600 dark:text-gray-400 mt-2 inline-block" />
                  </div>
                ) : (
                  <div className="inline-block bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-gray-200 dark:border-gray-800 p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your research..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}