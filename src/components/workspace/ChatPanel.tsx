import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2, Terminal, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { tauriApi, ProviderType } from '../../api/tauri';
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import TraceLogs from './TraceLogs';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import FileFormDialog from './FileFormDialog';

interface ChatPanelProps {
  activeProject?: { id: string; name?: string } | null;
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
  const [showLogs, setShowLogs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // File Extraction State
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const providerLabels: Record<string, string> = {
    'hostedApi': 'Hosted Claude',
    'ollama': 'Ollama',
    'claudeCode': 'Claude Code',
    'geminiCli': 'Gemini CLI'
  };

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
      models = ['pro', 'flash', 'ultra'];
      current = settings.geminiCli?.modelAlias || 'flash';
    } else if (provider && String(provider).startsWith('custom-')) {
      models = ['default'];
      current = 'default';
    }

    setAvailableModels(models);
    setCurrentModel(current);
  };

  const [availableProviders, setAvailableProviders] = useState<ProviderType[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settings, providers] = await Promise.all([
          tauriApi.getGlobalSettings(),
          tauriApi.listAvailableProviders()
        ]);

        setGlobalSettings(settings);
        setAvailableProviders(providers);

        if (settings.activeProvider) {
          setActiveProvider(settings.activeProvider);
          await updateAvailableModels(settings.activeProvider, settings);
        }
      } catch (err) {
        console.error('Failed to load initial settings:', err);
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
        description: `Now using ${providerLabels[newProvider] || newProvider}`,
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
      const settings = await tauriApi.getGlobalSettings();
      if (activeProvider === 'ollama') {
        settings.ollama.model = value;
      } else if (activeProvider === 'hostedApi') {
        settings.hosted.model = value;
      } else if (activeProvider === 'geminiCli') {
        settings.geminiCli.modelAlias = value;
      }
      await tauriApi.saveGlobalSettings(settings);
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
    const scrollToBottom = () => {
      if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };
    scrollToBottom();
  }, [messages]);

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

    try {
      const chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
      chatMessages.push({ role: 'user', content: userMessage.content });

      const response = await tauriApi.sendMessage(chatMessages, activeProject?.id, activeSkillId);

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
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

  const handleExtractToFile = () => {
    const selection = window.getSelection()?.toString();
    if (selection && selection.trim().length > 0) {
      setSelectedText(selection);
      setFileDialogOpen(true);
    } else {
      toast({
        title: "No text selected",
        description: "Please select text from the chat to extract to a new file.",
        variant: "destructive"
      });
    }
  };

  const handleFileCreate = async (fileName: string) => {
    setFileDialogOpen(false);
    try {
      if (!activeProject?.id) {
        toast({ title: "Error", description: "No active project", variant: "destructive" });
        return;
      }
      await tauriApi.writeMarkdownFile(activeProject.id, fileName, selectedText);
      toast({ title: "File created", description: `${fileName} created successfully.` });
    } catch (error) {
      console.error("Failed to create file", error);
      toast({ title: "Error", description: "Failed to create file.", variant: "destructive" });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      <FileFormDialog
        open={fileDialogOpen}
        onOpenChange={setFileDialogOpen}
        onSubmit={handleFileCreate}
        projectName={activeProject?.name}
      />

      {/* Header with Selectors */}
      <div className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 bg-gray-50/30 dark:bg-gray-900/10">
        <div className="flex items-center">
          <Bot className="w-4 h-4 mr-2 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">AI researcher</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Skill Selector */}
          <Select value={activeSkillId || 'no-skill'} onValueChange={(val) => setActiveSkillId(val === 'no-skill' ? undefined : val)}>
            <SelectTrigger className="w-[130px] h-8 text-[10px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
              <Star className="w-3 h-3 mr-1.5 text-amber-500 fill-amber-500" />
              <SelectValue placeholder="Skill" />
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
            <SelectTrigger className="w-[130px] h-8 text-[10px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
              <SelectValue>
                {providerLabels[activeProvider] || activeProvider.replace('custom-', '')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-[10px] text-gray-500 font-normal px-2 py-1">Standard</SelectLabel>
                <SelectItem value="hostedApi">Hosted Claude</SelectItem>
                {availableProviders.includes('ollama') && <SelectItem value="ollama">Ollama</SelectItem>}
                {availableProviders.includes('claudeCode') && <SelectItem value="claudeCode">Claude Code</SelectItem>}
                {availableProviders.includes('geminiCli') && <SelectItem value="geminiCli">Gemini CLI</SelectItem>}
              </SelectGroup>

              {globalSettings?.customClis?.some((cli: any) => availableProviders.includes(`custom-${cli.id}`)) && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-gray-500 font-normal px-2 py-1 border-t mt-1">Custom</SelectLabel>
                  {globalSettings.customClis.map((cli: any) => {
                    const val = `custom-${cli.id}`;
                    if (availableProviders.includes(val)) {
                      return <SelectItem key={cli.id} value={val}>{cli.name}</SelectItem>;
                    }
                    return null;
                  })}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>

          {/* Model Selector */}
          <Select
            value={currentModel}
            onValueChange={handleModelChange}
            disabled={activeProvider === 'claudeCode'}
          >
            <SelectTrigger className="w-[140px] h-8 text-[10px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${showLogs ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`}
            onClick={() => setShowLogs(!showLogs)}
            title="Toggle Trace Logs"
          >
            <Terminal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ContextMenu>
        <ContextMenuTrigger className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className={
                        message.role === 'user'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-purple-50 text-purple-600'
                      }>
                        {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>

                    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
                        }`}>
                        <div className="prose dark:prose-invert prose-sm max-w-none">
                          <ReactMarkdown>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-purple-50 text-purple-600">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5 py-1">
                        <div className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <TraceLogs isOpen={showLogs} onClose={() => setShowLogs(false)} />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem onSelect={handleExtractToFile}>
            Extract Selection to New File
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Input section */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="min-h-[56px] max-h-48 resize-none py-4 px-4 pr-12 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 rounded-xl focus:bg-white dark:focus:bg-gray-900 transition-colors shadow-inner"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2.5 bottom-2.5 h-8 w-8 transition-all ${input.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-200 dark:bg-gray-800'
              }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}