import { useState, useEffect } from 'react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Note } from '@/types/note';
import { NoteEditor } from '@/components/NoteEditor';
import { Layers, Settings, Pin, Download, ListTodo, FileText, Archive, ArchiveRestore, Trash2, RotateCcw, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { exportNoteToDocx } from '@/utils/exportToDocx';
import { exportNoteToMarkdown } from '@/utils/markdownExport';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import appLogo from '@/assets/app-logo.png';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STICKY_COLORS: Record<string, string> = {
  yellow: 'hsl(var(--sticky-yellow))',
  blue: 'hsl(var(--sticky-blue))',
  green: 'hsl(var(--sticky-green))',
  pink: 'hsl(var(--sticky-pink))',
  orange: 'hsl(var(--sticky-orange))',
};

// Vibrant colors for notes display
const RANDOM_COLORS = [
  'hsl(330, 100%, 75%)', // Vibrant Pink
  'hsl(160, 70%, 70%)', // Vibrant Mint
  'hsl(280, 70%, 75%)', // Vibrant Lavender
  'hsl(20, 95%, 75%)', // Vibrant Coral
  'hsl(140, 65%, 70%)', // Vibrant Green
  'hsl(350, 80%, 75%)', // Vibrant Rose
  'hsl(45, 90%, 75%)', // Vibrant Peach
  'hsl(270, 65%, 75%)', // Vibrant Purple
  'hsl(200, 80%, 70%)', // Vibrant Sky Blue
  'hsl(60, 90%, 75%)', // Vibrant Yellow
];

const Notes = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'archived' | 'trash'>('active');

  useEffect(() => {
    const saved = localStorage.getItem('notes');
    if (saved) {
      const parsed = JSON.parse(saved);
      setNotes(parsed.map((n: Note) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
        voiceRecordings: n.voiceRecordings?.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        })) || [],
      })));
    }
  }, []);

  const handleSaveNote = (note: Note) => {
    const existingIndex = notes.findIndex((n) => n.id === note.id);
    let updatedNotes;
    if (existingIndex >= 0) {
      updatedNotes = notes.map((n) => (n.id === note.id ? note : n));
    } else {
      updatedNotes = [note, ...notes];
    }
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
  };

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  const handleTogglePin = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedNotes = notes.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          isPinned: !n.isPinned,
          pinnedOrder: !n.isPinned ? Date.now() : undefined,
        };
      }
      return n;
    });
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
  };

  const handleToggleArchive = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedNotes = notes.map((n) => {
      if (n.id === noteId) {
        const isArchiving = !n.isArchived;
        return {
          ...n,
          isArchived: isArchiving,
          archivedAt: isArchiving ? new Date() : undefined,
          isPinned: isArchiving ? false : n.isPinned, // Unpin when archiving
        };
      }
      return n;
    });
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    const noteBeforeUpdate = notes.find(n => n.id === noteId);
    toast.success(noteBeforeUpdate?.isArchived ? 'Note restored' : 'Note archived');
  };

  const handleMoveToTrash = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedNotes = notes.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          isDeleted: true,
          deletedAt: new Date(),
          isArchived: false,
          isPinned: false,
        };
      }
      return n;
    });
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    toast.success('Note moved to trash');
  };

  const handleRestoreFromTrash = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedNotes = notes.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          isDeleted: false,
          deletedAt: undefined,
        };
      }
      return n;
    });
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    toast.success('Note restored from trash');
  };

  const handleDeletePermanently = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    toast.success('Note permanently deleted');
  };

  // Auto-delete notes older than 30 days in trash
  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const updatedNotes = notes.filter((n) => {
      if (n.isDeleted && n.deletedAt) {
        return new Date(n.deletedAt) > thirtyDaysAgo;
      }
      return true;
    });
    
    if (updatedNotes.length !== notes.length) {
      setNotes(updatedNotes);
      localStorage.setItem('notes', JSON.stringify(updatedNotes));
    }
  }, [notes]);

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', noteId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetNoteId: string) => {
    e.preventDefault();
    const draggedNoteId = e.dataTransfer.getData('text/html');

    if (draggedNoteId === targetNoteId) return;

    const draggedNote = notes.find(n => n.id === draggedNoteId);
    const targetNote = notes.find(n => n.id === targetNoteId);

    if (!draggedNote || !targetNote) return;

    // Only allow reordering within pinned or unpinned sections
    if (draggedNote.isPinned !== targetNote.isPinned) return;

    const updatedNotes = [...notes];
    const draggedIndex = updatedNotes.findIndex(n => n.id === draggedNoteId);
    const targetIndex = updatedNotes.findIndex(n => n.id === targetNoteId);

    const [removed] = updatedNotes.splice(draggedIndex, 1);
    updatedNotes.splice(targetIndex, 0, removed);

    // Update pinned order for all pinned notes
    if (draggedNote.isPinned) {
      updatedNotes.forEach((note, idx) => {
        if (note.isPinned) {
          note.pinnedOrder = idx;
        }
      });
    }

    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
  };

  // Filter notes based on view mode
  const filteredNotes = notes.filter(note => {
    if (viewMode === 'trash') return note.isDeleted;
    if (viewMode === 'archived') return note.isArchived && !note.isDeleted;
    return !note.isArchived && !note.isDeleted;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isPinned && b.isPinned) {
      return (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const activeCount = notes.filter(n => !n.isArchived && !n.isDeleted).length;
  const archivedCount = notes.filter(n => n.isArchived && !n.isDeleted).length;
  const trashCount = notes.filter(n => n.isDeleted).length;

  const getDaysRemaining = (deletedAt: Date | undefined) => {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  const handleEmptyTrash = () => {
    const updatedNotes = notes.filter(n => !n.isDeleted);
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    toast.success('Trash emptied');
  };

  const getCardColor = (note: Note) => {
    if (note.type === 'sticky' && note.color) {
      return STICKY_COLORS[note.color];
    }
    // Use random colors for other notes (excluding yellow and sky blue)
    const index = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return RANDOM_COLORS[index % RANDOM_COLORS.length];
  };

  return (
    <div className="min-h-screen min-h-screen-dynamic bg-background pb-16 sm:pb-20 flex justify-center">
      <div className="w-full max-w-lg lg:max-w-2xl">
        <header className="border-b bg-background sticky top-0 z-10">
          <div className="px-2 xs:px-3 sm:px-4 py-2">
            <div className="flex items-center justify-between gap-1 xs:gap-2">
              <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 flex-shrink-0">
                <img src={appLogo} alt="Npd" className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 flex-shrink-0" />
                <h1 className="text-base xs:text-lg sm:text-xl font-bold">Notes</h1>
              </div>
              <div className="flex gap-0.5 xs:gap-1 sm:gap-2 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleDarkMode}
                  className="h-7 w-7 xs:h-8 xs:w-8 sm:h-10 sm:w-10 touch-target"
                  title="Toggle theme"
                >
                  {isDarkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => navigate('/todo/today')}
                  title="Switch to To-Do"
                  className="h-7 w-7 xs:h-8 xs:w-8 sm:h-10 sm:w-10 touch-target"
                >
                  <ListTodo className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-2 xs:px-3 sm:px-4 py-3 xs:py-4 sm:py-6">
        {/* Archive & Trash Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'active' | 'archived' | 'trash')} className="mb-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="active" className="flex items-center gap-1 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Notes</span> ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-1 text-xs sm:text-sm">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Archived</span> ({archivedCount})
            </TabsTrigger>
            <TabsTrigger value="trash" className="flex items-center gap-1 text-xs sm:text-sm">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Trash</span> ({trashCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Empty Trash Button */}
        {viewMode === 'trash' && trashCount > 0 && (
          <div className="mb-4 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Empty Trash ({trashCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {trashCount} note{trashCount !== 1 ? 's' : ''}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {sortedNotes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {viewMode === 'trash' ? 'Trash is empty' : viewMode === 'archived' ? 'No archived notes' : 'No notes yet'}
            </p>
          </div>
        ) : (
          <div className="columns-2 gap-3 space-y-3">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                draggable={!note.isArchived && !note.isDeleted}
                onDragStart={(e) => handleDragStart(e, note.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, note.id)}
                className={cn(
                  "break-inside-avoid cursor-move transition-all hover:scale-105 relative group",
                  (note.isArchived || note.isDeleted) && "opacity-75"
                )}
                style={{ backgroundColor: getCardColor(note) }}
                onClick={() => !note.isDeleted && handleEditNote(note)}
              >
                <div className="p-4 rounded-2xl">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title="Export"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card z-50" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => {
                          exportNoteToDocx(note);
                          toast.success('Note exported to Word');
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Export to Word
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          exportNoteToMarkdown(note);
                          toast.success('Note exported to Markdown');
                        }}>
                          <FileText className="h-4 w-4 mr-2" />
                          Export to Markdown
                        </DropdownMenuItem>
                        {!note.isDeleted && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(note.id, e as unknown as React.MouseEvent);
                            }}>
                              {note.isArchived ? (
                                <>
                                  <ArchiveRestore className="h-4 w-4 mr-2" />
                                  Restore from Archive
                                </>
                              ) : (
                                <>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive Note
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleMoveToTrash(note.id, e as unknown as React.MouseEvent)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Move to Trash
                            </DropdownMenuItem>
                          </>
                        )}
                        {note.isDeleted && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleRestoreFromTrash(note.id, e as unknown as React.MouseEvent)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleDeletePermanently(note.id, e as unknown as React.MouseEvent)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Permanently
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {!note.isArchived && !note.isDeleted && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleTogglePin(note.id, e)}
                        className={cn(
                          "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                          note.isPinned && "opacity-100"
                        )}
                      >
                        <Pin className={cn("h-4 w-4", note.isPinned && "fill-current")} />
                      </Button>
                    )}
                    {note.isArchived && !note.isDeleted && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleToggleArchive(note.id, e)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Restore"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    )}
                    {note.isDeleted && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleRestoreFromTrash(note.id, e)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Restore from Trash"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {note.title && (
                    <h3 className="font-bold text-base mb-2 text-gray-900 pr-10">
                      {note.title}
                    </h3>
                  )}
                  {note.content && (
                    <p className="text-sm text-gray-800 mb-3 line-clamp-4">
                      {note.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-block px-3 py-1 rounded-full border border-gray-900/20 text-xs text-gray-900">
                      {new Date(note.updatedAt).toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: '2-digit'
                      })} {new Date(note.updatedAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                    {note.isDeleted && note.deletedAt && (
                      <div className="inline-block px-2 py-1 rounded-full bg-destructive/20 text-xs text-destructive font-medium">
                        {getDaysRemaining(note.deletedAt)} days left
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <NoteEditor
        note={selectedNote}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedNote(null);
        }}
        onSave={handleSaveNote}
        allNotes={notes}
        returnTo="/notes"
      />

        <BottomNavigation />
      </div>
    </div>
  );
};

export default Notes;
