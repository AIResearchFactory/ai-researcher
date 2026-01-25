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
  const [showLogs, setShowLogs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header with Selectors */}
      <div className="h-10 border-b border-white/5 flex items-center justify-between px-3 bg-background/20 backdrop-blur-sm shrink-0">
        <div className="flex items-center">
          <Bot className="w-4 h-4 mr-2 text-primary" />
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-widest">AI Researcher</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Skill Selector */}
          <Select value={activeSkillId || 'no-skill'} onValueChange={(val) => setActiveSkillId(val === 'no-skill' ? undefined : val)}>
            <SelectTrigger className="w-[120px] h-7 text-[10px] bg-background/20 border-white/10 backdrop-blur-md focus:ring-0">
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
            <SelectTrigger className="w-[120px] h-7 text-[10px] bg-background/20 border-white/10 backdrop-blur-md focus:ring-0">
              <SelectValue>
                {providerLabels[activeProvider] || activeProvider.replace('custom-', '')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-[10px] text-muted-foreground font-normal px-2 py-1">Standard</SelectLabel>
                <SelectItem value="hostedApi">Hosted Claude</SelectItem>
                {availableProviders.includes('ollama') && <SelectItem value="ollama">Ollama</SelectItem>}
                {availableProviders.includes('claudeCode') && <SelectItem value="claudeCode">Claude Code</SelectItem>}
                {availableProviders.includes('geminiCli') && <SelectItem value="geminiCli">Gemini CLI</SelectItem>}
              </SelectGroup>

              {globalSettings?.customClis?.some((cli: any) => availableProviders.includes(`custom-${cli.id}`)) && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground font-normal px-2 py-1 border-t mt-1">Custom</SelectLabel>
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
            <SelectTrigger className="w-[120px] h-7 text-[10px] bg-background/20 border-white/10 backdrop-blur-md focus:ring-0">
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
            className={`h-7 w-7 ${showLogs ? 'text-blue-400 bg-blue-500/10' : 'text-muted-foreground'}`}
            onClick={() => setShowLogs(!showLogs)}
            title="Toggle Trace Logs"
          >
            <Terminal className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-6 max-w-4xl mx-auto pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar className="w-8 h-8 shrink-0 border border-white/10">
                  <AvatarFallback className={
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>

                <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                  <div className={`rounded-2xl px-5 py-3 text-sm leading-relaxed border shadow-sm ${message.role === 'user'
                    ? 'bg-primary text-primary-foreground border-primary rounded-tr-sm'
                    : 'bg-card text-card-foreground border-white/10 rounded-tl-sm'
                    }`}>
                    <div className="prose dark:prose-invert prose-sm max-w-none break-words">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <Avatar className="w-8 h-8 shrink-0 border border-white/10">
                  <AvatarFallback className="bg-indigo-500/20 text-indigo-400">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card border border-white/10 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <TraceLogs isOpen={showLogs} onClose={() => setShowLogs(false)} />
      </div>

      {/* Input section */}
      <div className="p-4 bg-gradient-to-t from-background to-transparent pb-8">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="min-h-[56px] max-h-48 resize-none py-4 px-5 pr-14 bg-card border-white/10 rounded-2xl focus:bg-card transition-all shadow-lg focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50 text-base relative z-10"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-3 bottom-3 h-8 w-8 rounded-xl transition-all shadow-md z-20 ${input.trim() ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}