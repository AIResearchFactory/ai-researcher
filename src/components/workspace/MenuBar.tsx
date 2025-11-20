import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuProvider } from '@/components/ui/dropdown-menu';
import {
  FileText,
  FolderPlus,
  X,
  Edit3,
  Search,
  Info,
  Settings,
  Sparkles
} from 'lucide-react';

interface MenuBarProps {
  onNewProject: () => void;
  onNewFile: () => void;
  onCloseFile: () => void;
  onCloseProject: () => void;
  onOpenWelcome: () => void;
  onOpenGlobalSettings: () => void;
  onFind: () => void;
  onReplace: () => void;
  onExtractSelection: () => void;
  onExit: () => void;
}

export default function MenuBar({
  onNewProject,
  onNewFile,
  onCloseFile,
  onCloseProject,
  onOpenWelcome,
  onOpenGlobalSettings,
  onFind,
  onReplace,
  onExtractSelection,
  onExit
}: MenuBarProps) {
  return (
    <DropdownMenuProvider>
      <div className="h-8 bg-gray-900 dark:bg-gray-950 border-b border-gray-700 flex items-center px-2 text-sm">
      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="px-3 py-1 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100 outline-none">
          File
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem onClick={onNewProject} className="gap-2">
            <FolderPlus className="w-4 h-4" />
            New Project...
            <span className="ml-auto text-xs text-gray-500">⌘N</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNewFile} className="gap-2">
            <FileText className="w-4 h-4" />
            New File...
            <span className="ml-auto text-xs text-gray-500">⌘⇧N</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCloseFile} className="gap-2">
            <X className="w-4 h-4" />
            Close File
            <span className="ml-auto text-xs text-gray-500">⌘W</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCloseProject} className="gap-2">
            <X className="w-4 h-4" />
            Close Project
            <span className="ml-auto text-xs text-gray-500">⌘⇧W</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onExit} className="gap-2">
            <X className="w-4 h-4" />
            Exit
            <span className="ml-auto text-xs text-gray-500">⌘Q</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="px-3 py-1 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100 outline-none">
          Edit
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem className="gap-2">
            <Edit3 className="w-4 h-4" />
            Undo
            <span className="ml-auto text-xs text-gray-500">⌘Z</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Edit3 className="w-4 h-4" />
            Redo
            <span className="ml-auto text-xs text-gray-500">⌘⇧Z</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2">
            Cut
            <span className="ml-auto text-xs text-gray-500">⌘X</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            Copy
            <span className="ml-auto text-xs text-gray-500">⌘C</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            Paste
            <span className="ml-auto text-xs text-gray-500">⌘V</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onFind} className="gap-2">
            <Search className="w-4 h-4" />
            Find
            <span className="ml-auto text-xs text-gray-500">⌘F</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onReplace} className="gap-2">
            <Search className="w-4 h-4" />
            Replace
            <span className="ml-auto text-xs text-gray-500">⌘H</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2">
            Find in Files
            <span className="ml-auto text-xs text-gray-500">⌘⇧F</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            Replace in Files
            <span className="ml-auto text-xs text-gray-500">⌘⇧H</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selection Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="px-3 py-1 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100 outline-none">
          Selection
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem className="gap-2">
            Select All
            <span className="ml-auto text-xs text-gray-500">⌘A</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            Expand Selection
            <span className="ml-auto text-xs text-gray-500">⌥⇧→</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            Shrink Selection
            <span className="ml-auto text-xs text-gray-500">⌥⇧←</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onExtractSelection} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Extract to New File
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <FileText className="w-4 h-4" />
            Copy as Markdown
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="px-3 py-1 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100 outline-none">
          Help
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem onClick={onOpenWelcome} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Welcome
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Info className="w-4 h-4" />
            Release Notes
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Info className="w-4 h-4" />
            Check for Updates
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenGlobalSettings} className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
            <span className="ml-auto text-xs text-gray-500">⌘,</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </DropdownMenuProvider>
  );
}