import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2, Terminal, Star, Sparkles, PanelRightClose, PlusCircle, Play } from 'lucide-react';
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

  // ...

  const [projectWorkflows, setProjectWorkflows] = useState<any[]>([]);
  const [showWorkflowSuggestions, setShowWorkflowSuggestions] = useState(false);
  const [workflowSuggestions, setWorkflowSuggestions] = useState<any[]>([]);

  const { generateWorkflow, isLoading: isGeneratingWorkflow, status: workflowStatus, error: workflowError } = useWorkflowGenerator();

  // ... (existing state)

  useEffect(() => {
    if (activeProject?.id) {
      tauriApi.getProjectFiles(activeProject.id).then(setProjectFiles).catch(console.error);
      tauriApi.getProjectWorkflows(activeProject.id).then(setProjectWorkflows).catch(console.error);
    }
  }, [activeProject]);

  const renderMessageContent = (content: string) => {
    // Split by thinking tags
    const parts = content.split(/(\<thinking\>[\s\S]*?\<\/thinking\>|\<SUGGEST_WORKFLOW\>[\s\S]*?\<\/SUGGEST_WORKFLOW\>)/g);

    return parts.map((part, index) => {
      if (part.startsWith('<thinking>') && part.endsWith('</thinking>')) {
        const thinkingContent = part.slice(10, -11);
        return <ThinkingBlock key={index} content={thinkingContent} />;
      }

      if (part.startsWith('<SUGGEST_WORKFLOW>') && part.endsWith('</SUGGEST_WORKFLOW>')) {
        try {
          const jsonContent = part.slice(18, -19).trim();
          const data = JSON.parse(jsonContent);
          return (
            <div key={index} className="bg-primary/10 border border-primary/20 rounded-lg p-4 my-2 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-primary">Suggested Workflow</h3>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                The AI suggests running a workflow with the following configuration:
              </div>
              {data.parameters && Object.keys(data.parameters).length > 0 && (
                <div className="bg-black/20 rounded-md p-2 mb-3 border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Parameters</div>
                  <pre className="text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(data.parameters, null, 2)}
                  </pre>
                </div>
              )}
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (data.project_id && data.workflow_id) {
                    toast({ title: "Starting Workflow", description: "Initiating workflow execution..." });
                    tauriApi.executeWorkflow(data.project_id, data.workflow_id, data.parameters)
                      .then(() => toast({ title: "Workflow Started", description: "Workflow execution has begun." }))
                      .catch(err => toast({ title: "Execution Failed", description: err.message || "Failed to start workflow", variant: "destructive" }));
                  }
                }}
              >
                <Play className="w-3.5 h-3.5 mr-2" />
                Execute Workflow
              </Button>
            </div>
          );
        } catch (e) {
          console.error("Failed to parse suggest workflow tag", e);
          return <div key={index} className="text-red-500 text-xs">Error parsing workflow suggestion</div>;
        }
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


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showFileSuggestions && fileSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Handle selection scrolling? For now just simple
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectSuggestion(fileSuggestions[0], 'file');
        return;
      } else if (e.key === 'Escape') {
        setShowFileSuggestions(false);
        return;
      }
    }

    if (showWorkflowSuggestions && workflowSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectSuggestion(workflowSuggestions[0].name, 'workflow');
        return;
      } else if (e.key === 'Escape') {
        setShowWorkflowSuggestions(false);
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
    const lastHash = textBeforeCursor.lastIndexOf('#');

    // Prioritize the closest trigger
    if (lastAt !== -1 && (lastHash === -1 || lastAt > lastHash) && !textBeforeCursor.substring(lastAt).includes(' ')) {
      const query = textBeforeCursor.substring(lastAt + 1).toLowerCase();
      const filtered = projectFiles.filter(f => f.toLowerCase().includes(query)).slice(0, 5);
      setFileSuggestions(filtered);
      setShowFileSuggestions(filtered.length > 0);
      setShowWorkflowSuggestions(false);
    } else if (lastHash !== -1 && (lastAt === -1 || lastHash > lastAt) && !textBeforeCursor.substring(lastHash).includes(' ')) {
      const query = textBeforeCursor.substring(lastHash + 1).toLowerCase();
      const filtered = projectWorkflows.filter(w => w.name.toLowerCase().includes(query)).slice(0, 5);
      setWorkflowSuggestions(filtered);
      setShowWorkflowSuggestions(filtered.length > 0);
      setShowFileSuggestions(false);
    } else {
      setShowFileSuggestions(false);
      setShowWorkflowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (value: string, type: 'file' | 'workflow') => {
    const trigger = type === 'file' ? '@' : '#';
    const textBeforeTrigger = input.substring(0, input.lastIndexOf(trigger, cursorPos - 1));
    const textAfterCursor = input.substring(cursorPos);
    const newValue = textBeforeTrigger + trigger + value + ' ' + textAfterCursor;
    setInput(newValue);
    setShowFileSuggestions(false);
    setShowWorkflowSuggestions(false);

    // Set focus back and move cursor
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        const newPos = textBeforeTrigger.length + value.length + 2;
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check for workflow generation request
      if (input.toLowerCase().startsWith('create a workflow') || input.toLowerCase().startsWith('generate a workflow')) {
        const prompt = input.replace(/^(create|generate) a workflow (to|for)?/i, '').trim();
        if (prompt && activeProject?.id) {
          toast({ title: "Analyzing Request", description: "Designing your workflow..." });

          // We need to pass the current output target, defaulting to empty for auto-generation
          const result = await generateWorkflow(prompt, '', skills);

          if (result) {
            await tauriApi.createWorkflow(activeProject.id, {
              name: result.name,
              description: `Generated from prompt: ${prompt}`,
              steps: result.steps
            });

            // Refresh workflows
            const updatedWorkflows = await tauriApi.getProjectWorkflows(activeProject.id);
            setProjectWorkflows(updatedWorkflows);

            const aiMessage = {
              id: Date.now() + 1,
              role: 'assistant',
              content: `I've created a new workflow for you: **${result.name}**.\n\nIt has ${result.steps.length} steps. You can run it by typing \`#${result.name}\` or clicking the button below.\n\n<SUGGEST_WORKFLOW>\n${JSON.stringify({
                project_id: activeProject.id,
                workflow_id: result.name, // Assuming name is ID/Name for now, ideally get ID
                parameters: {}
              }, null, 2)}\n</SUGGEST_WORKFLOW>`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsLoading(false);
            return;
          }
        }
      }

      // Handle @ file references and # workflow references
      let enrichedInput = input;
      const fileMentions = input.match(/@(\S+)/g);
      const workflowMentions = input.match(/#(\S+)/g);

      const contextParts = [];

      if (fileMentions && activeProject?.id) {
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
      }

      if (workflowMentions && activeProject?.id) {
        for (const mention of workflowMentions) {
          const workflowName = mention.substring(1);
          const matchedWorkflow = projectWorkflows.find(w => w.name.toLowerCase() === workflowName.toLowerCase());

          if (matchedWorkflow) {
            contextParts.push(`\n--- WORKFLOW: ${matchedWorkflow.name} (ID: ${matchedWorkflow.id}) ---\n${JSON.stringify(matchedWorkflow, null, 2)}\n--- END WORKFLOW ---\n`);
          }
        }
      }

      if (contextParts.length > 0) {
        enrichedInput = `User is referencing these items:\n${contextParts.join('\n')}\n\nUser Question: ${input}`;
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
                        </div>
                        {/* Subdued timestamp */}
                        <span className={`text-[9px] mt-1 opacity-40 font-bold uppercase tracking-tighter ${message.role === 'user' ? 'text-primary/60 pr-1' : 'text-muted-foreground pl-1'
                          }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
                    onClick={() => handleSelectSuggestion(file, 'file')}
                  >
                    <span className="truncate flex-1">{file}</span>
                    <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Enter</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showWorkflowSuggestions && (
            <div className="absolute bottom-full left-0 w-64 mb-2 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="px-3 py-2 border-b border-white/5 bg-white/5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Workflow</span>
              </div>
              <div className="py-1">
                {workflowSuggestions.map((workflow) => (
                  <button
                    key={workflow.id}
                    className="w-full px-4 py-2 text-left text-xs hover:bg-primary/20 transition-colors flex items-center justify-between group"
                    onClick={() => handleSelectSuggestion(workflow.name, 'workflow')}
                  >
                    <span className="truncate flex-1">{workflow.name}</span>
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
            placeholder="Describe your research objective... (Use @ to reference files, # for workflows)"
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