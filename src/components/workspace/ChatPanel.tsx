import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2, Terminal, Star, Sparkles, PanelRightClose, PlusCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { tauriApi, ProviderType } from '../../api/tauri';
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TraceLogs from './TraceLogs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import FileFormDialog from './FileFormDialog';
import ThinkingBlock from './ThinkingBlock';

interface ChatPanelProps {
  activeProject?: { id: string; name?: string } | null;
  skills?: any[];
  onToggleChat?: () => void;
}

export default function ChatPanel({ activeProject, skills = [], onToggleChat }: ChatPanelProps) {
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
  const [activeSkillId, setActiveSkillId] = useState<string | undefined>(undefined);
  const [showLogs, setShowLogs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // File Extraction State
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [showFileSuggestions, setShowFileSuggestions] = useState(false);
  const [fileSuggestions, setFileSuggestions] = useState<string[]>([]);
  const [cursorPos, setCursorPos] = useState(0);

  const providerLabels: Record<string, string> = {
    'hostedApi': 'Claude API',
    'ollama': 'Ollama Local',
    'claudeCode': 'Claude Code CLI',
    'geminiCli': 'Gemini CLI'
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
        }
      } catch (err) {
        console.error('Failed to load initial settings:', err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeProject?.id) {
      tauriApi.getProjectFiles(activeProject.id).then(setProjectFiles).catch(console.error);
    }
  }, [activeProject]);

  const renderMessageContent = (content: string) => {
    // Split by thinking tags
    const parts = content.split(/(<thinking>[\s\S]*?<\/thinking>)/g);

    return parts.map((part, index) => {
      if (part.startsWith('<thinking>') && part.endsWith('</thinking>')) {
        const thinkingContent = part.slice(10, -11);
        return <ThinkingBlock key={index} content={thinkingContent} />;
      }

      if (!part.trim()) return null;

      return (
        <div key={index} className="prose dark:prose-invert prose-sm max-w-none break-words leading-relaxed font-medium mb-2 last:mb-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {part}
          </ReactMarkdown>
        </div>
      );
    });
  };

  const handleProviderChange = async (value: string) => {
    const newProvider = value as ProviderType;
    try {
      await tauriApi.switchProvider(newProvider);
      setActiveProvider(newProvider);

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

  const handleNewChat = () => {
    if (messages.length > 1) {
      if (confirm('Are you sure you want to start a new chat? Your current conversation history will be cleared from this view.')) {
        setMessages([
          {
            id: Date.now(),
            role: 'assistant',
            content: 'Hello! I\'m your AI research assistant. How can I help you with your research today?',
            timestamp: new Date()
          }
        ]);
        toast({
          title: 'New Chat Started',
          description: 'Conversation history cleared.',
        });
      }
    }
  };

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
      // Handle @ file references
      let enrichedInput = input;
      const fileMentions = input.match(/@(\S+)/g);

      if (fileMentions && activeProject?.id) {
        const contextParts = [];
        for (const mention of fileMentions) {
          const fileName = mention.substring(1);
          // Try to find the file in projectFiles
          const matchedFile = projectFiles.find(f => f.toLowerCase() === fileName.toLowerCase() || f.toLowerCase().endsWith('/' + fileName.toLowerCase()));

          if (matchedFile) {
            try {
              const content = await tauriApi.readMarkdownFile(activeProject.id, matchedFile);
              contextParts.push(`\n--- FILE: ${matchedFile} ---\n${content}\n--- END FILE ---\n`);
            } catch (err) {
              console.warn(`Failed to read referenced file: ${matchedFile}`, err);
            }
          }
        }

        if (contextParts.length > 0) {
          enrichedInput = `User is referencing these files:\n${contextParts.join('\n')}\n\nUser Question: ${input}`;
        }
      }

      const chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
      chatMessages.push({ role: 'user', content: enrichedInput });

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
    if (showFileSuggestions && fileSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Handle selection scrolling? For now just simple
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectSuggestion(fileSuggestions[0]);
        return;
      } else if (e.key === 'Escape') {
        setShowFileSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setInput(value);
    setCursorPos(pos);

    // Check for @ mention
    const textBeforeCursor = value.substring(0, pos);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1 && !textBeforeCursor.substring(lastAt).includes(' ')) {
      const query = textBeforeCursor.substring(lastAt + 1).toLowerCase();
      const filtered = projectFiles.filter(f => f.toLowerCase().includes(query)).slice(0, 5);
      setFileSuggestions(filtered);
      setShowFileSuggestions(filtered.length > 0);
    } else {
      setShowFileSuggestions(false);
    }
  };

  const handleSelectSuggestion = (fileName: string) => {
    const textBeforeAt = input.substring(0, input.lastIndexOf('@', cursorPos - 1));
    const textAfterCursor = input.substring(cursorPos);
    const newValue = textBeforeAt + '@' + fileName + ' ' + textAfterCursor;
    setInput(newValue);
    setShowFileSuggestions(false);

    // Set focus back and move cursor
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        const newPos = textBeforeAt.length + fileName.length + 2;
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
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
    <div className="h-full flex flex-col bg-background/20 backdrop-blur-3xl overflow-hidden shadow-2xl">
      <FileFormDialog
        open={fileDialogOpen}
        onOpenChange={setFileDialogOpen}
        onSubmit={handleFileCreate}
        projectName={activeProject?.name}
      />

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
                  {(() => {
                    const label = providerLabels[activeProvider];
                    if (label) return label;

                    if (activeProvider.startsWith('custom-') && globalSettings?.customClis) {
                      const id = activeProvider.replace('custom-', '');
                      const cli = globalSettings.customClis.find((c: any) => c.id === id);
                      if (cli) return cli.name;
                    }

                    return activeProvider.replace('custom-', '');
                  })()}
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
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-primary transition-all"
            onClick={handleNewChat}
            title="New Chat"
          >
            <PlusCircle className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-lg transition-all ${showLogs ? 'text-primary bg-primary/10 border border-primary/20' : 'text-muted-foreground hover:bg-white/5'}`}
            onClick={() => setShowLogs(!showLogs)}
            title="Toggle Trace Logs"
          >
            <Terminal className="w-3.5 h-3.5" />
          </Button>

          {onToggleChat && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-primary transition-all"
              onClick={onToggleChat}
              title="Hide Chat"
            >
              <PanelRightClose className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <ContextMenu onOpenChange={(open: boolean) => {
        if (open) {
          const selection = window.getSelection()?.toString();
          if (selection && selection.trim().length > 0) {
            setSelectedText(selection);
          }
        }
      }}>
        <ContextMenuTrigger className="flex-1 flex flex-col overflow-hidden relative outline-none">
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
                            {renderMessageContent(message.content)}
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
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem onSelect={() => {
            if (selectedText && selectedText.trim().length > 0) {
              setFileDialogOpen(true);
            } else {
              toast({
                title: "No text selected",
                description: "Please select text from the chat to extract to a new file.",
                variant: "destructive"
              });
            }
          }}>
            Extract Selection to New File
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Input section */}
      <div className="p-6 bg-gradient-to-t from-background via-background/80 to-transparent pb-10 z-20">
        <div className="max-w-4xl mx-auto relative group">
          {showFileSuggestions && (
            <div className="absolute bottom-full left-0 w-64 mb-2 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="px-3 py-2 border-b border-white/5 bg-white/5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select File</span>
              </div>
              <div className="py-1">
                {fileSuggestions.map((file) => (
                  <button
                    key={file}
                    className="w-full px-4 py-2 text-left text-xs hover:bg-primary/20 transition-colors flex items-center justify-between group"
                    onClick={() => handleSelectSuggestion(file)}
                  >
                    <span className="truncate flex-1">{file}</span>
                    <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Enter</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 to-indigo-500/40 rounded-[22px] blur-lg opacity-0 group-focus-within:opacity-100 transition duration-700 pointer-events-none" />
          <Textarea
            value={input}
            onChange={handleInputChange}
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