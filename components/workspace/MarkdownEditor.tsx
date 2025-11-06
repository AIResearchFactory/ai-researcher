import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Edit3, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

export default function MarkdownEditor({ document }) {
  const [content, setContent] = useState(document.content || '');
  const [mode, setMode] = useState('view'); // 'view' or 'edit'
  const [hasChanges, setHasChanges] = useState(false);

  const handleContentChange = (newContent) => {
    setContent(newContent);
    setHasChanges(true);
  };

  const handleSave = () => {
    // TODO: Integrate with Tauri IPC
    // await invoke('save_markdown', {
    //   projectId: document.projectId,
    //   documentId: document.id,
    //   content: content
    // });
    console.log('Saving document:', document.id, content);
    setHasChanges(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 bg-gray-50 dark:bg-gray-900">
        <div className="flex gap-2">
          <Button
            variant={mode === 'view' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('view')}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          <Button
            variant={mode === 'edit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('edit')}
            className="gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </Button>
        </div>
        
        {hasChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
 