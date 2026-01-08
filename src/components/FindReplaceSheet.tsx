import { useState, useCallback, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, Replace, ChevronUp, ChevronDown, X, CaseSensitive, WholeWord } from 'lucide-react';
import { toast } from 'sonner';

interface FindReplaceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onContentChange: (content: string) => void;
  editorRef: React.RefObject<HTMLDivElement>;
}

const HIGHLIGHT_COLOR = '#3c78f0';
const HIGHLIGHT_BG_COLOR = 'rgba(60, 120, 240, 0.3)';

export const FindReplaceSheet = ({
  isOpen,
  onClose,
  content,
  onContentChange,
  editorRef,
}: FindReplaceSheetProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const originalContentRef = useRef<string>('');

  // Store original content when opening
  useEffect(() => {
    if (isOpen) {
      originalContentRef.current = content;
    }
  }, [isOpen]);

  // Clear highlights when closing
  const handleClose = useCallback(() => {
    clearHighlights();
    setSearchTerm('');
    setReplaceTerm('');
    setMatchCount(0);
    setCurrentMatchIndex(0);
    onClose();
  }, [onClose]);

  // Clear all highlights from the editor
  const clearHighlights = useCallback(() => {
    if (editorRef.current) {
      const highlights = editorRef.current.querySelectorAll('mark[data-find-highlight]');
      highlights.forEach((mark) => {
        const parent = mark.parentNode;
        if (parent) {
          const textNode = document.createTextNode(mark.textContent || '');
          parent.replaceChild(textNode, mark);
          parent.normalize();
        }
      });
    }
  }, [editorRef]);

  // Escape special regex characters
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Build regex pattern based on options
  const buildSearchRegex = useCallback((term: string, forMatch: boolean = false) => {
    if (!term.trim()) return null;
    
    let pattern = escapeRegex(term);
    
    // Add word boundary if whole word is enabled
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    
    // Build flags
    const flags = forMatch ? 'g' : 'gi';
    const finalFlags = matchCase ? flags.replace('i', '') : flags;
    
    try {
      return new RegExp(forMatch ? `(${pattern})` : pattern, finalFlags);
    } catch {
      return null;
    }
  }, [matchCase, wholeWord]);

  // Highlight all matches in the editor
  const highlightMatches = useCallback(() => {
    if (!editorRef.current || !searchTerm.trim()) {
      clearHighlights();
      setMatchCount(0);
      return;
    }

    // First clear existing highlights
    clearHighlights();

    const searchRegex = buildSearchRegex(searchTerm, true);
    if (!searchRegex) {
      setMatchCount(0);
      return;
    }

    let count = 0;

    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent && searchRegex.test(node.textContent)) {
        textNodes.push(node);
      }
      // Reset regex lastIndex
      searchRegex.lastIndex = 0;
    }

    textNodes.forEach((textNode) => {
      const text = textNode.textContent || '';
      const countRegex = buildSearchRegex(searchTerm, false);
      if (countRegex) {
        const matches = text.match(new RegExp(countRegex.source, countRegex.flags + (countRegex.flags.includes('g') ? '' : 'g')));
        if (matches) {
          count += matches.length;
        }
      }

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      const regex = buildSearchRegex(searchTerm, false);
      if (!regex) return;
      
      // Ensure global flag for exec loop
      const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');

      while ((match = globalRegex.exec(text)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        // Add highlighted match
        const mark = document.createElement('mark');
        mark.setAttribute('data-find-highlight', 'true');
        mark.style.backgroundColor = HIGHLIGHT_BG_COLOR;
        mark.style.color = HIGHLIGHT_COLOR;
        mark.style.borderRadius = '2px';
        mark.style.padding = '0 2px';
        mark.textContent = match[0];
        fragment.appendChild(mark);

        lastIndex = globalRegex.lastIndex;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    });

    setMatchCount(count);
    setCurrentMatchIndex(count > 0 ? 1 : 0);

    // Scroll to first match
    if (count > 0) {
      scrollToMatch(0);
    }
  }, [searchTerm, editorRef, clearHighlights, buildSearchRegex]);

  // Scroll to a specific match
  const scrollToMatch = useCallback((index: number) => {
    if (!editorRef.current) return;

    const highlights = editorRef.current.querySelectorAll('mark[data-find-highlight]');
    if (highlights.length === 0) return;

    // Reset all highlights
    highlights.forEach((mark) => {
      (mark as HTMLElement).style.backgroundColor = HIGHLIGHT_BG_COLOR;
      (mark as HTMLElement).style.color = HIGHLIGHT_COLOR;
      (mark as HTMLElement).style.outline = 'none';
    });

    // Highlight current match
    const currentMatch = highlights[index] as HTMLElement;
    if (currentMatch) {
      currentMatch.style.backgroundColor = HIGHLIGHT_COLOR;
      currentMatch.style.color = 'white';
      currentMatch.style.outline = `2px solid ${HIGHLIGHT_COLOR}`;
      currentMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [editorRef]);

  // Navigate to next match
  const goToNextMatch = useCallback(() => {
    if (matchCount === 0) return;
    const newIndex = currentMatchIndex >= matchCount ? 1 : currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    scrollToMatch(newIndex - 1);
  }, [matchCount, currentMatchIndex, scrollToMatch]);

  // Navigate to previous match
  const goToPrevMatch = useCallback(() => {
    if (matchCount === 0) return;
    const newIndex = currentMatchIndex <= 1 ? matchCount : currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    scrollToMatch(newIndex - 1);
  }, [matchCount, currentMatchIndex, scrollToMatch]);

  // Replace current match
  const replaceCurrentMatch = useCallback(() => {
    if (!editorRef.current || matchCount === 0) return;

    const highlights = editorRef.current.querySelectorAll('mark[data-find-highlight]');
    if (highlights.length === 0) return;

    const currentMatch = highlights[currentMatchIndex - 1];
    if (currentMatch) {
      const textNode = document.createTextNode(replaceTerm);
      currentMatch.parentNode?.replaceChild(textNode, currentMatch);
      
      // Update content
      if (editorRef.current) {
        onContentChange(editorRef.current.innerHTML);
      }

      // Re-highlight remaining matches
      setTimeout(() => {
        highlightMatches();
      }, 50);

      toast.success('Replaced 1 occurrence');
    }
  }, [editorRef, matchCount, currentMatchIndex, replaceTerm, onContentChange, highlightMatches]);

  // Replace all matches
  const replaceAllMatches = useCallback(() => {
    if (!editorRef.current || matchCount === 0 || !searchTerm.trim()) return;

    // Clear highlights first
    clearHighlights();

    // Get the content and replace all occurrences
    const currentContent = editorRef.current.innerHTML;
    const searchRegex = buildSearchRegex(searchTerm, false);
    if (!searchRegex) return;
    
    // Ensure global flag
    const globalRegex = new RegExp(searchRegex.source, searchRegex.flags.includes('g') ? searchRegex.flags : searchRegex.flags + 'g');
    const newContent = currentContent.replace(globalRegex, replaceTerm);

    editorRef.current.innerHTML = newContent;
    onContentChange(newContent);

    const replacedCount = matchCount;
    setMatchCount(0);
    setCurrentMatchIndex(0);

    toast.success(`Replaced ${replacedCount} occurrence${replacedCount !== 1 ? 's' : ''}`);
  }, [editorRef, matchCount, searchTerm, replaceTerm, onContentChange, clearHighlights, buildSearchRegex]);

  // Debounced search - re-run when options change
  useEffect(() => {
    const timer = setTimeout(() => {
      highlightMatches();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, matchCase, wholeWord, highlightMatches]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" style={{ color: HIGHLIGHT_COLOR }} />
            Find & Replace
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Search Options */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Switch
                id="match-case"
                checked={matchCase}
                onCheckedChange={setMatchCase}
              />
              <Label htmlFor="match-case" className="text-sm flex items-center gap-1.5 cursor-pointer">
                <CaseSensitive className="h-4 w-4" />
                Match Case
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="whole-word"
                checked={wholeWord}
                onCheckedChange={setWholeWord}
              />
              <Label htmlFor="whole-word" className="text-sm flex items-center gap-1.5 cursor-pointer">
                <WholeWord className="h-4 w-4" />
                Whole Word
              </Label>
            </div>
          </div>

          {/* Search Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: HIGHLIGHT_COLOR }}>
              Find this in the text:
            </Label>
            <div className="relative">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="pr-24"
                autoFocus
              />
              {matchCount > 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {currentMatchIndex}/{matchCount}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={goToPrevMatch}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={goToNextMatch}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {searchTerm && (
              <p className="text-sm text-muted-foreground">
                {matchCount === 0 ? (
                  'No matches found'
                ) : (
                  <span>
                    Found <strong style={{ color: HIGHLIGHT_COLOR }}>{matchCount}</strong> match{matchCount !== 1 ? 'es' : ''}
                    {(matchCase || wholeWord) && (
                      <span className="text-xs ml-2">
                        ({matchCase && 'case-sensitive'}{matchCase && wholeWord && ', '}{wholeWord && 'whole word'})
                      </span>
                    )}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Replace Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: HIGHLIGHT_COLOR }}>
              and replace it with:
            </Label>
            <Input
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace with..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={replaceCurrentMatch}
              disabled={matchCount === 0}
              className="flex-1"
              style={{ 
                backgroundColor: matchCount > 0 ? HIGHLIGHT_COLOR : undefined,
              }}
            >
              <Replace className="h-4 w-4 mr-2" />
              Replace
            </Button>
            <Button
              onClick={replaceAllMatches}
              disabled={matchCount === 0}
              variant="outline"
              className="flex-1"
              style={{ 
                borderColor: HIGHLIGHT_COLOR,
                color: matchCount > 0 ? HIGHLIGHT_COLOR : undefined,
              }}
            >
              Replace All ({matchCount})
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
