import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EyeOff, Lock, FileText } from 'lucide-react';
import { useHardwareBackButton } from '@/hooks/useHardwareBackButton';
import { triggerHaptic } from '@/utils/haptics';
import { toast } from 'sonner';
import { Note } from '@/types/note';

interface BulkHideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onBulkHide: (noteIds: string[]) => void;
}

export const BulkHideSheet = ({
  isOpen,
  onClose,
  notes,
  onBulkHide,
}: BulkHideSheetProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useHardwareBackButton({
    onBack: onClose,
    enabled: isOpen,
    priority: 'sheet',
  });

  // Filter out already hidden notes
  const visibleNotes = notes.filter(n => !n.isHidden && !n.isDeleted && !n.isArchived);

  const handleToggle = (noteId: string) => {
    setSelectedIds(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === visibleNotes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleNotes.map(n => n.id));
    }
  };

  const handleBulkHide = async () => {
    await triggerHaptic('heavy');
    if (selectedIds.length === 0) {
      toast.error('Please select at least one note');
      return;
    }
    onBulkHide(selectedIds);
    toast.success(`${selectedIds.length} note${selectedIds.length > 1 ? 's' : ''} hidden`);
    setSelectedIds([]);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[70vh]">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-primary" />
            Hide Multiple Notes
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedIds.length === visibleNotes.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
          </div>

          <ScrollArea className="flex-1 -mx-4 px-4">
            <div className="space-y-2 pb-24">
              {visibleNotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No notes available to hide</p>
                </div>
              ) : (
                visibleNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleToggle(note.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <Checkbox
                      checked={selectedIds.includes(note.id)}
                      onCheckedChange={() => handleToggle(note.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {note.title || 'Untitled Note'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {note.content.replace(/<[^>]*>/g, '').slice(0, 50) || 'No content'}
                      </p>
                    </div>
                    {note.isProtected && (
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            <Button
              onClick={handleBulkHide}
              disabled={selectedIds.length === 0}
              className="w-full"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Hide {selectedIds.length > 0 ? `${selectedIds.length} Note${selectedIds.length > 1 ? 's' : ''}` : 'Selected'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
