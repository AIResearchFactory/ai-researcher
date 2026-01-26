import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2, Terminal, Star, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { tauriApi, ProviderType } from '../../api/tauri';
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import TraceLogs from './TraceLogs';
import { motion, AnimatePresence } from 'framer-motion';

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
    'hostedApi': 'Claude API',
    'ollama': 'Ollama Local',
    'claudeCode': 'Claude Code CLI',
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
      models = ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-7-sonnet-20250219', 'claude-3-haiku-20240307'];
      current = settings.hosted?.model || 'claude-3-5-sonnet-20241022';
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

      // Update provider to apply model change
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
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    };
    scrollToBottom();
  }, [messages, isLoading]);

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
    <div className="h-full flex flex-col bg-background/20 backdrop-blur-3xl overflow-hidden shadow-2xl">
      {/* Header with Selectors */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-background/40 backdrop-blur-xl shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] leading-none">Neural</span>
            <span className="text-xs font-bold text-foreground leading-tight tracking-tight">Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Skill Selector */}
          <Select value={activeSkillId || 'no-skill'} onValueChange={(val) => setActiveSkillId(val === 'no-skill' ? undefined : val)}>
            <SelectTrigger className="w-[110px] h-8 text-[10px] bg-white/5 border-white/5 hover:bg-white/10 transition-colors focus:ring-0 rounded-lg">
              <Star className={`w-3 h-3 mr-1.5 ${activeSkillId ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
              <SelectValue placeholder="Skill" />
            </SelectTrigger>
            <SelectContent className="bg-background/80 backdrop-blur-xl border-white/10">
              <SelectItem value="no-skill" className="text-xs">No Skill</SelectItem>
              {skills.map(skill => (
                <SelectItem key={skill.id} value={skill.id} className="text-xs">{skill.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Provider Selector */}
          <Select value={activeProvider} onValueChange={handleProviderChange}>
            <SelectTrigger className="w-[110px] h-8 text-[10px] bg-white/5 border-white/5 hover:bg-white/10 transition-colors focus:ring-0 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <SelectValue>
                  {providerLabels[activeProvider] || activeProvider.replace('custom-', '')}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-background/80 backdrop-blur-xl border-white/10">
              <SelectGroup>
                <SelectLabel className="text-[10px] text-muted-foreground font-bold px-2 py-1.5 uppercase tracking-wider">Cloud Engine</SelectLabel>
                <SelectItem value="hostedApi" className="text-xs">Claude API</SelectItem>
                <SelectItem value="claudeCode" className="text-xs">Claude CLI</SelectItem>
                <SelectItem value="geminiCli" className="text-xs">Gemini CLI</SelectItem>
              </SelectGroup>

              {availableProviders.includes('ollama') && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground font-bold px-2 py-1.5 border-t mt-1 uppercase tracking-wider">Local Engine</SelectLabel>
                  <SelectItem value="ollama" className="text-xs">Ollama</SelectItem>
                </SelectGroup>
              )}

              {globalSettings?.customClis?.some((cli: any) => availableProviders.includes(`custom-${cli.id}`)) && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground font-bold px-2 py-1.5 border-t mt-1 uppercase tracking-wider">Custom</SelectLabel>
                  {globalSettings.customClis.map((cli: any) => {
                    const val = `custom-${cli.id}`;
                    if (availableProviders.includes(val)) {
                      return <SelectItem key={cli.id} value={val} className="text-xs">{cli.name}</SelectItem>;
                    }
                    return null;
                  })}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-lg transition-all ${showLogs ? 'text-primary bg-primary/10 border border-primary/20' : 'text-muted-foreground hover:bg-white/5'}`}
            onClick={() => setShowLogs(!showLogs)}
            title="Toggle Trace Logs"
          >
            <Terminal className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-8 max-w-4xl mx-auto pb-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                    className="shrink-0 pt-1"
                  >
                    <Avatar className="w-9 h-9 border border-white/5 shadow-inner">
                      <AvatarFallback className={
                        message.role === 'user'
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-white/5 text-primary border border-white/5'
                      }>
                        {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>

                  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                    <div className={`relative px-5 py-4 text-sm leading-relaxed shadow-lg backdrop-blur-md rounded-2xl ${message.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm border border-primary/20'
                      : 'bg-white/5 dark:bg-black/20 text-foreground border border-white/10 rounded-tl-sm'
                      }`}>
                      <div className="prose dark:prose-invert prose-sm max-w-none break-words leading-relaxed font-medium">
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      {/* Subdued timestamp */}
                      <span className={`text-[9px] absolute bottom-1 right-3 opacity-40 font-bold uppercase tracking-tighter ${message.role === 'user' ? 'text-white' : 'text-muted-foreground'
                        }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <div className="shrink-0 pt-1">
                  <Avatar className="w-9 h-9 border border-white/5 animate-pulse">
                    <AvatarFallback className="bg-white/5 text-primary">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-2xl rounded-tl-sm px-5 py-5 shadow-inner backdrop-blur-md">
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.3, 1, 0.3],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.2,
                          delay: i * 0.2,
                          ease: "easeInOut"
                        }}
                        className="w-1.5 h-1.5 bg-primary/60 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
        <TraceLogs isOpen={showLogs} onClose={() => setShowLogs(false)} />
      </div>

      {/* Input section */}
      <div className="p-6 bg-gradient-to-t from-background via-background/80 to-transparent pb-10 z-20">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 to-indigo-500/40 rounded-[22px] blur-lg opacity-0 group-focus-within:opacity-100 transition duration-700 pointer-events-none" />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your research objective..."
            className="min-h-[64px] max-h-48 resize-none py-5 px-6 pr-16 bg-white/5 dark:bg-black/30 border-white/5 rounded-[20px] focus:bg-white/10 dark:focus:bg-black/50 transition-all shadow-2xl backdrop-blur-2xl focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40 text-base relative z-10 font-medium leading-normal"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-3.5 bottom-3.5 h-10 w-10 rounded-2xl transition-all shadow-sm z-20 ${input.trim()
              ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95'
              : 'bg-white/5 text-muted-foreground'
              }`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="mt-3 flex justify-center">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40 px-2 py-1 rounded-full border border-white/5 bg-white/5 backdrop-blur-md">
            Agentic Intelligence Subsystem • Active
          </p>
        </div>
      </div>
    </div>
  );
}