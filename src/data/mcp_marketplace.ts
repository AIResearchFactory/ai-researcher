export interface McpMarketplaceItem {
    id: string;
    name: string;
    description: string;
    command: 'npx' | 'python' | 'local';
    args: string[];
    logo?: string; // Optional URL or icon name
    readmeUrl?: string;
}

export const COMMUNTIY_MCP_SERVERS: McpMarketplaceItem[] = [
    {
        id: 'brave-search',
        name: 'Brave Search',
        description: 'Web search capabilities via Brave Search API',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search']
    },
    {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Secure access to local files and directories',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/username/Desktop']
    },
    {
        id: 'ollama',
        name: 'Ollama',
        description: 'Local LLM integration via Ollama',
        command: 'npx',
        args: ['-y', 'ollama-mcp-server']
    },
    {
        id: 'github',
        name: 'GitHub',
        description: 'Access GitHub repositories, issues, and PRs',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github']
    },
    {
        id: 'claude-code',
        name: 'Claude Code',
        description: 'Anthropic\'s coding assistant tools',
        command: 'npx',
        args: ['-y', '@anthropic-ai/claude-code']
    },
    {
        id: 'mcp-server-git',
        name: 'Git',
        description: 'Tools to read, analyze, and manipulate Git repositories',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-git']
    },
    {
        id: 'mcp-server-postgres',
        name: 'PostgreSQL',
        description: 'Read-only database access and querying',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb']
    }
];
