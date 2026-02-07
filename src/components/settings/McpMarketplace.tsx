import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Check, Download, Search, Trash2, Globe, Server, Database, Github, FolderOpen, Plus, FileJson, Copy } from 'lucide-react';
import { tauriApi, McpServerConfig } from '@/api/tauri';
import { useToast } from '@/hooks/use-toast';

export default function McpMarketplace() {
    const [installedServers, setInstalledServers] = useState<McpServerConfig[]>([]);
    const [marketplaceServers, setMarketplaceServers] = useState<McpServerConfig[]>([]);
    const [loadingMarketplace, setLoadingMarketplace] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newServer, setNewServer] = useState({ id: '', name: '', command: '', args: '' });
    const { toast } = useToast();

    // Load installed servers
    const loadServers = async () => {
        try {
            const servers = await tauriApi.getMcpServers();
            setInstalledServers(servers || []);
        } catch (error) {
            console.error('Failed to load MCP servers:', error);
            toast({
                title: 'Error',
                description: 'Failed to load configured MCP servers',
                variant: 'destructive',
            });
        } finally {
            // Loading handled implicitly
        }
    };

    const loadMarketplace = async (query?: string) => {
        setLoadingMarketplace(true);
        try {
            const servers = await tauriApi.fetchMcpMarketplace(query);
            setMarketplaceServers(servers || []);
        } catch (error) {
            console.error('Failed to load MCP marketplace:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch MCP marketplace',
                variant: 'destructive',
            });
        } finally {
            setLoadingMarketplace(false);
        }
    };

    useEffect(() => {
        loadServers();
        loadMarketplace();
    }, []);

    useEffect(() => {
        if (searchQuery.length >= 3) {
            const timeoutId = setTimeout(() => {
                loadMarketplace(searchQuery);
            }, 500);
            return () => clearTimeout(timeoutId);
        } else if (searchQuery.length === 0) {
            loadMarketplace();
        }
    }, [searchQuery]);

    const handleInstall = async (item: McpServerConfig) => {
        try {
            // Check if already installed
            if (isInstalled(item.id)) {
                toast({
                    title: 'Already Installed',
                    description: `${item.name} is already configured.`,
                });
                return;
            }

            const config: McpServerConfig = {
                ...item,
                enabled: true,
            };

            await tauriApi.addMcpServer(config);
            await loadServers();
            toast({
                title: 'Server Added',
                description: `${item.name} has been added to your configuration.`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: String(error),
                variant: 'destructive',
            });
        }
    };

    const handleAddCustom = async () => {
        if (!newServer.id || !newServer.name || !newServer.command) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }

        try {
            const config: McpServerConfig = {
                id: newServer.id,
                name: newServer.name,
                command: newServer.command,
                args: newServer.args.split(' ').filter(a => a.length > 0),
                enabled: true,
                description: 'Custom MCP Server',
            };

            await tauriApi.addMcpServer(config);
            await loadServers();
            setNewServer({ id: '', name: '', command: '', args: '' });
            setIsDialogOpen(false);
            toast({
                title: 'Server Added',
                description: 'Custom MCP server configured successfully.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: String(error),
                variant: 'destructive',
            });
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await tauriApi.removeMcpServer(id);
            await loadServers();
            toast({
                title: 'Server Removed',
                description: 'MCP server has been removed.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: String(error),
                variant: 'destructive',
            });
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        try {
            await tauriApi.toggleMcpServer(id, enabled);
            // Optimistic update
            setInstalledServers(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
        } catch (error) {
            await loadServers(); // Revert on error
            toast({
                title: 'Error',
                description: String(error),
                variant: 'destructive',
            });
        }
    };

    const isInstalled = (id: string) => installedServers.some(s => s.id === id);

    const getIcon = (id: string) => {
        if (id.includes('github') || id.includes('git')) return <Github className="w-5 h-5" />;
        if (id.includes('postgres') || id.includes('sql')) return <Database className="w-5 h-5" />;
        if (id.includes('file')) return <FolderOpen className="w-5 h-5" />;
        if (id.includes('search')) return <Globe className="w-5 h-5" />;
        return <Server className="w-5 h-5" />;
    };

    const filteredMarketplace = marketplaceServers.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">MCP Servers</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Connect AI models to external tools and data sources using the Model Context Protocol.
                </p>
            </div>

            <Tabs defaultValue="installed" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
                        <TabsTrigger value="installed">Installed ({installedServers.length})</TabsTrigger>
                        <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                        <TabsTrigger value="raw">Raw Data</TabsTrigger>
                    </TabsList>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" /> Add Custom Server
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Custom MCP Server</DialogTitle>
                                <DialogDescription>
                                    Configure a local MCP server manually.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="id">ID</Label>
                                    <Input
                                        id="id"
                                        placeholder="unique-id"
                                        value={newServer.id}
                                        onChange={(e) => setNewServer({ ...newServer, id: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Display Name"
                                        value={newServer.name}
                                        onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="command">Command</Label>
                                    <Input
                                        id="command"
                                        placeholder="npx or python"
                                        value={newServer.command}
                                        onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="args">Arguments</Label>
                                    <Input
                                        id="args"
                                        placeholder="-y @modelcontextprotocol/server-..."
                                        value={newServer.args}
                                        onChange={(e) => setNewServer({ ...newServer, args: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddCustom}>Save Server</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <TabsContent value="installed" className="mt-0 space-y-4">
                    {installedServers.length === 0 ? (
                        <Card className="border-dashed border-2">
                            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                                <Server className="w-10 h-10 text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No MCP Servers Configured</h3>
                                <p className="text-sm text-gray-500 max-w-sm mt-2 mb-6">
                                    Add servers from the marketplace or configure a custom one to give your AI access to tools.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {installedServers.map(server => (
                                <Card key={server.id} className="overflow-hidden">
                                    <div className="flex items-center p-4 gap-4">
                                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                            {getIcon(server.id)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-sm truncate">{server.name}</h4>
                                                {server.enabled ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1 py-0 h-5">Active</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-500 text-[10px] px-1 py-0 h-5">Disabled</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate mt-0.5">{server.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={server.enabled}
                                                onCheckedChange={(checked) => handleToggle(server.id, checked)}
                                            />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => handleRemove(server.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <code className="text-[10px] text-gray-500 font-mono truncate max-w-[300px]">
                                            {server.command} {server.args.join(' ')}
                                        </code>
                                        <Button variant="link" size="sm" className="h-auto p-0 text-[10px]">
                                            Configure
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="marketplace" className="mt-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search available servers..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {loadingMarketplace ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {filteredMarketplace.map(item => {
                                const installed = isInstalled(item.id);
                                return (
                                    <Card key={item.id} className={`flex flex-col ${installed ? 'border-blue-200 dark:border-blue-900 bg-blue-50/20' : ''}`}>
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-start">
                                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2 inline-flex">
                                                    {getIcon(item.id)}
                                                </div>
                                                {installed && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Installed</Badge>}
                                            </div>
                                            <CardTitle className="text-base truncate" title={item.name}>{item.name}</CardTitle>
                                            <CardDescription className="text-xs line-clamp-2 mt-1 min-h-[2.5em]" title={item.description || ''}>
                                                {item.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 flex-1">
                                            <div className="text-xs text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded mt-2 truncate">
                                                {item.command} {item.args[0]} ...
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-4 pt-0">
                                            {installed ? (
                                                <Button variant="outline" className="w-full gap-2" disabled>
                                                    <Check className="w-4 h-4" /> Installed
                                                </Button>
                                            ) : (
                                                <Button className="w-full gap-2" onClick={() => handleInstall(item)}>
                                                    <Download className="w-4 h-4" /> Install
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="raw" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileJson className="w-4 h-4 text-gray-500" />
                            <h4 className="text-sm font-medium">Marketplace Data (JSON)</h4>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(filteredMarketplace, null, 2));
                                toast({ title: 'Copied', description: 'JSON copied to clipboard' });
                            }}
                        >
                            <Copy className="w-3.5 h-3.5" /> Copy JSON
                        </Button>
                    </div>
                    <Card className="bg-slate-950 text-slate-50 border-slate-800">
                        <CardContent className="p-0">
                            <pre className="p-4 text-xs font-mono overflow-auto max-h-[600px] whitespace-pre-wrap">
                                {JSON.stringify(filteredMarketplace, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
