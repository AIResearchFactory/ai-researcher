import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Replace, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FindReplaceDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'find' | 'replace';
  onFind: (searchText: string, options: FindOptions) => void;
  onReplace: (searchText: string, replaceText: string, replaceAll: boolean) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  matchCount?: number;
  currentMatch?: number;
}

export interface FindOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export default function FindReplaceDialog({
  open,
  onClose,
  mode,
  onFind,
  onReplace,
  onNext,
  onPrevious,
  matchCount = 0,
  currentMatch = 0
}: FindReplaceDialogProps) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const handleFind = () => {
    if (searchText.trim()) {
      onFind(searchText, { caseSensitive, wholeWord, useRegex });
    }
  };

  const handleReplace = () => {
    if (searchText.trim()) {
      onReplace(searchText, replaceText, false);
    }
  };

  const handleReplaceAll = () => {
    if (searchText.trim()) {
      onReplace(searchText, replaceText, true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPrevious?.();
      } else {
        handleFind();
        onNext?.();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'find' ? (
              <>
                <Search className="w-5 h-5" />
                Find
              </>
            ) : (
              <>
                <Replace className="w-5 h-5" />
                Find and Replace
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search">Find</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter search text..."
                className="flex-1"
                autoFocus
              />
              <Button
                variant="outline"
                size="icon"
                onClick={onPrevious}
                disabled={matchCount === 0}
                title="Previous match (Shift+Enter)"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onNext}
                disabled={matchCount === 0}
                title="Next match (Enter)"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            {matchCount > 0 && (
              <p className="text-sm text-gray-500">
                {currentMatch} of {matchCount} matches
              </p>
            )}
          </div>

          {/* Replace Input (only in replace mode) */}
          {mode === 'replace' && (
            <div className="space-y-2">
              <Label htmlFor="replace">Replace with</Label>
              <Input
                id="replace"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter replacement text..."
              />
            </div>
          )}

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Match case</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Whole word</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Use regex</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            {mode === 'replace' && (
              <>
                <Button onClick={handleReplace} disabled={!searchText.trim()}>
                  Replace
                </Button>
                <Button onClick={handleReplaceAll} disabled={!searchText.trim()}>
                  Replace All
                </Button>
              </>
            )}
            {mode === 'find' && (
              <Button onClick={handleFind} disabled={!searchText.trim()}>
                <Search className="w-4 h-4 mr-2" />
                Find
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Made with Bob
