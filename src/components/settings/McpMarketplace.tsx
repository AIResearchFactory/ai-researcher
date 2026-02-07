import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Check, Download, Search, Trash2, Globe, Server, Database, Github, FolderOpen, Plus, FileJson, Copy, Star, User } from 'lucide-react';
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
            setInstalledServers(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
        } catch (error) {
            await loadServers();
            toast({
                title: 'Error',
                description: String(error),
                variant: 'destructive',
            });
        }
    };

    const isInstalled = (id: string) => installedServers.some(s => s.id === id);

    const getIcon = (item: McpServerConfig) => {
        const id = item.id.toLowerCase();
        const name = item.name.toLowerCase();

        if (item.icon_url) {
            return <img src={item.icon_url} className="w-8 h-8 rounded" alt={item.name} />;
        }

        if (id.includes('monday') || name.includes('monday')) return <div className="w-8 h-8 bg-[#6161FF] rounded flex items-center justify-center text-white font-bold text-xs">M</div>;
        if (id.includes('github') || id.includes('git')) return <Github className="w-6 h-6" />;
        if (id.includes('postgres') || id.includes('sql')) return <Database className="w-6 h-6 text-blue-500" />;
        if (id.includes('file')) return <FolderOpen className="w-6 h-6 text-amber-500" />;
        if (id.includes('search')) return <Globe className="w-6 h-6 text-emerald-500" />;
        return <Server className="w-6 h-6 text-slate-400" />;
    };

    const filteredMarketplace = marketplaceServers.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white">
                    MCP Marketplace
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Discover and install Model Context Protocol servers to extend your AI's capabilities.
                </p>
            </div>

            <Tabs defaultValue="installed" className="w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <TabsList className="bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm p-1">
                        <TabsTrigger value="installed" className="px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                            Installed ({installedServers.length})
                        </TabsTrigger>
                        <TabsTrigger value="marketplace" className="px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                            Browse
                        </TabsTrigger>
                        <TabsTrigger value="raw" className="px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                            JSON
                        </TabsTrigger>
                    </TabsList>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2 border-dashed">
                                <Plus className="w-4 h-4" /> Add Custom Server
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add Custom MCP Server</DialogTitle>
                                <DialogDescription>
                                    Configure a local or community MCP server manually.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="id">Unique ID</Label>
                                    <Input
                                        id="id"
                                        placeholder="e.g. my-server"
                                        value={newServer.id}
                                        onChange={(e) => setNewServer({ ...newServer, id: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Display Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. My Tools"
                                        value={newServer.name}
                                        onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="command">Runtime Command</Label>
                                    <Input
                                        id="command"
                                        placeholder="npx, python, node"
                                        value={newServer.command}
                                        onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="args">Arguments</Label>
                                    <Input
                                        id="args"
                                        placeholder="-y @package-name"
                                        value={newServer.args}
                                        onChange={(e) => setNewServer({ ...newServer, args: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddCustom} className="w-full sm:w-auto">Save Server</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <TabsContent value="installed" className="mt-0">
                    {installedServers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                            <Server className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No Servers Installed</h3>
                            <p className="text-sm text-slate-500 max-w-xs text-center mt-2 px-4">
                                Start by browsing the marketplace to add tools and data sources to your AI.
                            </p>
                            <Button variant="default" className="mt-6" onClick={() => {
                                const tabTrigger = document.querySelector('[value="marketplace"]') as HTMLElement;
                                if (tabTrigger) tabTrigger.click();
                            }}>
                                Browse Marketplace
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {installedServers.map(server => (
                                <Card key={server.id} className="group relative overflow-hidden h-full flex flex-col hover:shadow-md transition-all border-slate-200 dark:border-slate-800">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-60" />
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                                {getIcon(server)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={server.enabled}
                                                    onCheckedChange={(checked) => handleToggle(server.id, checked)}
                                                    className="scale-90"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base font-bold truncate">{server.name}</CardTitle>
                                            {server.enabled ? (
                                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 flex-1">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
                                            {server.description || 'No description available.'}
                                        </p>
                                        <div className="mt-4 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <code className="text-[10px] text-slate-500 font-mono block truncate">
                                                {server.command} {server.args.join(' ')}
                                            </code>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-4 pt-0 flex justify-between gap-2 border-t border-slate-50 dark:border-slate-800 mt-2">
                                        <Button variant="ghost" size="sm" className="h-8 text-[11px] text-slate-400 hover:text-red-500 transition-colors" onClick={() => handleRemove(server.id)}>
                                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 text-[11px] text-slate-400">
                                            Settings
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="marketplace" className="mt-0 space-y-6">
                    <div className="relative group max-w-2xl mx-auto mb-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                            placeholder="Search 20,000+ servers (e.g. Monday, GitHub, Slack)..."
                            className="pl-12 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus-visible:ring-blue-500 text-base"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {loadingMarketplace ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20 animate-pulse" />
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 relative overflow-hidden" />
                            </div>
                            <span className="text-sm font-medium text-slate-500 animate-pulse">Fetching servers...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMarketplace.map(item => {
                                const installed = isInstalled(item.id);
                                return (
                                    <Card key={item.id} className={`flex flex-col relative overflow-hidden transition-all duration-300 border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 ${installed ? 'bg-blue-50/30 dark:bg-blue-900/10 ring-1 ring-blue-100 dark:ring-blue-900/30' : 'bg-white dark:bg-slate-900'}`}>
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-start">
                                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl shadow-sm">
                                                    {getIcon(item)}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {item.stars && (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 rounded-lg text-[10px] font-bold ring-1 ring-amber-100 dark:ring-amber-900/30">
                                                            <Star className="w-3 h-3 fill-amber-500" />
                                                            {item.stars.toLocaleString()}
                                                        </div>
                                                    )}
                                                    {installed && (
                                                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-100 text-[10px] px-2 py-0 h-6">Installed</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <CardTitle className="text-base font-bold leading-tight group-hover:text-blue-600 transition-colors" title={item.name}>{item.name}</CardTitle>
                                                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                                                    <User className="w-3 h-3" />
                                                    <span className="truncate">{item.author || 'Community'}</span>
                                                    {item.source === 'mcpmarket' && (
                                                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold text-slate-500">Global</span>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-2 flex-1 flex flex-col">
                                            <CardDescription className="text-xs line-clamp-3 text-slate-600 dark:text-slate-400 mb-4 leading-relaxed flex-1">
                                                {item.description || 'Harness the power of this MCP server to enhance your AI agents with specialized tools.'}
                                            </CardDescription>

                                            {item.categories && item.categories.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-auto">
                                                    {item.categories.slice(0, 2).map(cat => (
                                                        <span key={cat} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[9px] font-medium">
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="p-4 pt-0 border-t border-slate-50 dark:border-slate-800 mt-2">
                                            {installed ? (
                                                <Button variant="outline" className="w-full gap-2 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-slate-400" disabled>
                                                    <Check className="w-4 h-4" /> Configured
                                                </Button>
                                            ) : (
                                                <Button className="w-full gap-2 h-10 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20" onClick={() => handleInstall(item)}>
                                                    <Download className="w-4 h-4" /> Install Server
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
                            <FileJson className="w-4 h-4 text-slate-500" />
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 px-1">Marketplace Response</h4>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 rounded-lg"
                            onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(marketplaceServers, null, 2));
                                toast({ title: 'Copied', description: 'Raw JSON copied to clipboard' });
                            }}
                        >
                            <Copy className="w-3.5 h-3.5" /> Copy JSON
                        </Button>
                    </div>
                    <Card className="bg-[#0f172a] text-slate-300 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                        <CardContent className="p-0">
                            <pre className="p-6 text-[11px] font-mono overflow-auto max-h-[600px] whitespace-pre-wrap leading-relaxed">
                                {JSON.stringify(marketplaceServers, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
