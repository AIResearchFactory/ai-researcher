import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Edit3, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { tauriApi } from '../../api/tauri';
import { useToast } from '@/hooks/use-toast';

interface MarkdownEditorProps {
  document: {
    id: string;
    name: string;
    type: string;
    content?: string;
  };
  projectId?: string;
}

export default function MarkdownEditor({ document, projectId }: MarkdownEditorProps) {
  const [content, setContent] = useState(document.content || '');
  const [mode, setMode] = useState('view'); // 'view' or 'edit'
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load document content when document changes
  useEffect(() => {
    const loadContent = async () => {
      if (!projectId || !document.name) return;

      try {
        setLoading(true);
        const fileContent = await tauriApi.readMarkdownFile(projectId, document.name);
        setContent(fileContent);
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to load document:', error);
        // If file doesn't exist yet, it's a new document
        setContent(document.content || '');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [document.id, document.name, projectId]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!projectId || !document.name) {
      toast({
        title: 'Error',
        description: 'Cannot save: missing project or document name',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await tauriApi.writeMarkdownFile(projectId, document.name, content);
      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Document saved successfully'
      });
    } catch (error) {
      console.error('Failed to save document:', error);
      toast({
        title: 'Error',
        description: 'Failed to save document',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !content) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading document...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 border-b border-white/5 bg-background/20 backdrop-blur-sm flex items-center justify-between px-3">
        <div className="flex gap-2">
          <Button
            variant={mode === 'view' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('view')}
            className="gap-2 h-7"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Button>
          <Button
            variant={mode === 'edit' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('edit')}
            className="gap-2 h-7"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>

        {hasChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading}
            className="gap-2 bg-green-600 hover:bg-green-700 h-7"
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {mode === 'view' ? (
          <div className="p-8 prose dark:prose-invert max-w-3xl mx-auto">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto h-full min-h-full px-8 py-6">
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="h-full min-h-full border-0 rounded-none resize-none focus-visible:ring-0 p-0 font-mono text-sm bg-transparent"
              placeholder="Start writing your markdown here..."
            />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
