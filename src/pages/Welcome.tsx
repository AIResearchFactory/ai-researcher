import { Card, CardContent } from '@/components/ui/card';
import {
  BrainCircuit,
  FolderPlus,
  MessageSquare,
  FileText,
  Sparkles,
  Shield,
  Zap,
  Book
} from 'lucide-react';

import { Activity } from 'lucide-react';

interface WelcomePageProps {
  onCreateProject: () => void;
  onTabChange?: (tab: string) => void;
}

export default function WelcomePage({ onCreateProject, onTabChange }: WelcomePageProps) {
  const features = [
    {
      icon: FolderPlus,
      title: 'Organized Projects',
      description: 'Structure your research into projects with markdown documents',
      color: 'text-blue-600 dark:text-blue-500'
    },
    {
      icon: MessageSquare,
      title: 'AI-Powered Chat',
      description: 'Interact with Claude AI for insights and analysis',
      color: 'text-purple-600 dark:text-purple-500'
    },
    {
      icon: Sparkles,
      title: 'Custom Skills',
      description: 'Create specialized AI agents for different research tasks',
      color: 'text-pink-600 dark:text-pink-500'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'All data stored locally with encryption',
      color: 'text-green-600 dark:text-green-500'
    }
  ];

  const quickActions = [
    {
      icon: FolderPlus,
      title: 'Create New Project',
      description: 'Start organizing your research',
      action: onCreateProject
    },
    {
      icon: Activity,
      title: 'Explore Workflows',
      description: 'Select a project to see existing workflows or create a new workflow.',
      action: () => onTabChange?.('workflows')
    },
    {
      icon: Zap,
      title: 'Explore Skills',
      description: 'Discover pre-built AI skills',
      action: () => onTabChange?.('skills')
    }
  ];

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
              <BrainCircuit className="w-11 h-11 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to AI Research Assistant
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your intelligent companion for organizing research, analyzing data, and collaborating with AI
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <Card key={feature.title} className="border-2 border-transparent bg-gray-50/50 dark:bg-gray-800/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gray-100 dark:bg-gray-800 ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Get Started
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-300 dark:hover:border-blue-700"
                onClick={action.action}
              >
                <CardContent className="p-6 pt-16 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pro Tips
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>Use <kbd className="px-2 py-1 text-xs bg-white dark:bg-gray-800 rounded border">Cmd/Ctrl + N</kbd> to quickly create new documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Chat conversations are automatically saved as markdown files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 font-bold">•</span>
                  <span>Create custom skills to fine-tune AI behavior for specific tasks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                  <span>All your data stays on your machine and is encrypted</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <a
              href="https://github.com/AIResearchFactory/ai-researcher/blob/main/docs/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full transition-colors"
            >
              <Book className="w-4 h-4" />
              View Project Documentation on GitHub
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
          <p>You can reopen this welcome page anytime from the Help menu</p>
        </div>
      </div>
    </div>
  );
}