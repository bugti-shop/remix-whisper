import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note, NoteType, StickyColor, VoiceRecording, Folder } from '@/types/note';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from './RichTextEditor';
import { FindReplaceSheet } from './FindReplaceSheet';
import { VoiceRecorder } from './VoiceRecorder';
import { SketchEditor } from './SketchEditor';
import { VirtualizedCodeEditor } from './VirtualizedCodeEditor';
import { MindMapEditor } from './MindMapEditor';
import { TemplateSelector } from './TemplateSelector';
import { ExpenseTrackerEditor } from './ExpenseTrackerEditor';
import { NoteVersionHistorySheet } from './NoteVersionHistorySheet';
import { NoteLinkingSheet } from './NoteLinkingSheet';
import { NoteTableOfContents, injectHeadingIds } from './NoteTableOfContents';
import { useHardwareBackButton } from '@/hooks/useHardwareBackButton';

import { ErrorBoundary } from './ErrorBoundary';
import { ArrowLeft, Folder as FolderIcon, Plus, CalendarIcon, History, FileDown, Link2, ChevronDown, FileText, BookOpen, BarChart3, MoreVertical, Mic, Share2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { scheduleNoteReminder, updateNoteReminder, cancelNoteReminder } from '@/utils/noteNotifications';
import { saveNoteVersion } from '@/utils/noteVersionHistory';
import { exportNoteToMarkdown } from '@/utils/markdownExport';
import { insertNoteLink, findBacklinks } from '@/utils/noteLinking';
import { calculateNoteStats, formatReadingTime } from '@/utils/noteStats';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface NoteEditorProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Note) => void;
  defaultType?: NoteType;
  defaultFolderId?: string;
  allNotes?: Note[];
  /** Route to navigate back to when editor closes. If not provided, stays on current route. */
  returnTo?: string;
}

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'sticky', name: 'Sticky Notes', noteType: 'sticky', isDefault: true, createdAt: new Date() },
  { id: 'lined', name: 'Lined Notes', noteType: 'lined', isDefault: true, createdAt: new Date() },
  { id: 'regular', name: 'Regular Notes', noteType: 'regular', isDefault: true, createdAt: new Date() },
  { id: 'sketch', name: 'Sketch Notes', noteType: 'sketch', isDefault: true, createdAt: new Date() },
  { id: 'code', name: 'Code Notes', noteType: 'code', isDefault: true, createdAt: new Date() },
  { id: 'mindmap', name: 'Mind Maps', noteType: 'mindmap', isDefault: true, createdAt: new Date() },
  { id: 'expense', name: 'Expense Tracker', noteType: 'expense', isDefault: true, createdAt: new Date() },
];

const STICKY_COLORS: StickyColor[] = ['yellow', 'blue', 'green', 'pink', 'orange'];

const STICKY_COLOR_VALUES = {
  yellow: 'hsl(var(--sticky-yellow))',
  blue: 'hsl(var(--sticky-blue))',
  green: 'hsl(var(--sticky-green))',
  pink: 'hsl(var(--sticky-pink))',
  orange: 'hsl(var(--sticky-orange))',
};

export const NoteEditor = ({ note, isOpen, onClose, onSave, defaultType = 'regular', defaultFolderId, allNotes = [], returnTo }: NoteEditorProps) => {
  const navigate = useNavigate();
  const draftIdRef = useRef<string | null>(null);
  const isOpenRef = useRef(isOpen);
  const pushedHistoryRef = useRef(false);
  const isPoppingHistoryRef = useRef(false);
  const returnToRef = useRef(returnTo);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Capture the returnTo route when editor opens
  useEffect(() => {
    if (isOpen && returnTo) {
      returnToRef.current = returnTo;
    }
  }, [isOpen, returnTo]);

  const getCurrentNoteId = useCallback(() => {
    if (note?.id) return note.id;
    if (!draftIdRef.current) draftIdRef.current = `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return draftIdRef.current;
  }, [note?.id]);

  const [noteType, setNoteType] = useState<NoteType>(defaultType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<StickyColor>('yellow');
  const [images, setImages] = useState<string[]>([]);
  const [voiceRecordings, setVoiceRecordings] = useState<VoiceRecording[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>('-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
  const [fontSize, setFontSize] = useState<string>('16px');
  const [fontWeight, setFontWeight] = useState<string>('400');
  const [letterSpacing, setLetterSpacing] = useState<string>('0em');
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [lineHeight, setLineHeight] = useState<string>('1.5');
  const [createdAt, setCreatedAt] = useState<Date>(new Date());
  const [createdTime, setCreatedTime] = useState<string>('12:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<string>('12:00');
  const [reminderRecurring, setReminderRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [reminderVibration, setReminderVibration] = useState<boolean>(true);
  const [notificationId, setNotificationId] = useState<number | undefined>(undefined);
  const [notificationIds, setNotificationIds] = useState<number[] | undefined>(undefined);

  // Code note state
  const [codeContent, setCodeContent] = useState<string>('');
  const [codeLanguage, setCodeLanguage] = useState<string>('auto');

  // Folder state
  const [folders, setFolders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isNoteLinkingOpen, setIsNoteLinkingOpen] = useState(false);
  const [isBacklinksOpen, setIsBacklinksOpen] = useState(true);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Calculate stats
  const noteStats = calculateNoteStats(content, title);
  
  // Calculate backlinks
  const backlinks = note ? findBacklinks(note, allNotes) : [];

  useEffect(() => {
    const savedFolders = localStorage.getItem('folders');
    if (savedFolders) {
      const parsed = JSON.parse(savedFolders);
      setFolders([...DEFAULT_FOLDERS, ...parsed.map((f: Folder) => ({
        ...f,
        createdAt: new Date(f.createdAt),
      }))]);
    }
  }, []);

  useEffect(() => {
    if (note) {
      setNoteType(note.type);
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color || 'yellow');
      setImages(note.images || []);
      setVoiceRecordings(note.voiceRecordings);
      setSelectedFolderId(note.folderId);
      setFontFamily(note.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
      setFontSize(note.fontSize || '16px');
      setFontWeight(note.fontWeight || '400');
      setLetterSpacing(note.letterSpacing || '0em');
      setIsItalic(note.isItalic || false);
      setLineHeight(note.lineHeight || '1.5');
      const noteDate = new Date(note.createdAt);
      setCreatedAt(noteDate);
      setCreatedTime(format(noteDate, 'HH:mm'));
      setReminderEnabled(note.reminderEnabled || false);
      setReminderRecurring(note.reminderRecurring || 'none');
      setReminderVibration(note.reminderVibration !== false);
      if (note.reminderTime) {
        const reminderDate = new Date(note.reminderTime);
        setReminderTime(format(reminderDate, 'HH:mm'));
      }
      setNotificationId(note.notificationId);
      setNotificationIds(note.notificationIds);

      // Code fields
      setCodeContent(note.codeContent || '');
      setCodeLanguage(note.codeLanguage || 'auto');
    } else {
      // Reset draft ID for new notes to prevent overwriting
      draftIdRef.current = null;
      
      setNoteType(defaultType);
      setTitle('');
      setContent('');
      setColor('yellow');
      setImages([]);
      setVoiceRecordings([]);
      setSelectedFolderId(defaultFolderId);
      setFontFamily('-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
      setFontSize('16px');
      setFontWeight('400');
      setLetterSpacing('0em');
      setIsItalic(false);
      setLineHeight('1.5');
      const now = new Date();
      setCreatedAt(now);
      setCreatedTime(format(now, 'HH:mm'));
      setReminderEnabled(false);
      setReminderTime('12:00');
      setReminderRecurring('none');
      setReminderVibration(true);
      setNotificationId(undefined);
      setNotificationIds(undefined);

      // Reset code fields
      setCodeContent('');
      setCodeLanguage('auto');
    }
  }, [note, defaultType, defaultFolderId, isOpen]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName,
      isDefault: false,
      createdAt: new Date(),
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem('folders', JSON.stringify(updatedFolders.filter(f => !f.isDefault)));
    setSelectedFolderId(newFolder.id);
    setNewFolderName('');
    setIsNewFolderDialogOpen(false);
    toast.success('Folder created');
  };

  const persistNoteToLocalStorage = useCallback((savedNote: Note) => {
    try {
      const raw = localStorage.getItem('notes');
      const existing: any[] = raw ? JSON.parse(raw) : [];

      const idx = existing.findIndex((n) => n?.id === savedNote.id);
      if (idx >= 0) {
        existing[idx] = savedNote;
      } else {
        existing.unshift(savedNote);
      }

      localStorage.setItem('notes', JSON.stringify(existing));
    } catch (e) {
      console.warn('Failed to persist note to localStorage', e);
    }
  }, []);

  const buildCurrentNote = useCallback((): Note => {
    // Combine date and time
    const [hours, minutes] = createdTime.split(':').map(Number);
    const combinedDateTime = new Date(createdAt);
    combinedDateTime.setHours(hours, minutes, 0, 0);

    return {
      id: getCurrentNoteId(),
      type: noteType,
      title,
      content: noteType === 'code' ? '' : content,
      color: noteType === 'sticky' ? color : undefined,
      images: noteType === 'sticky' ? undefined : images,
      voiceRecordings,
      folderId: selectedFolderId || noteType,
      fontFamily: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? fontFamily : undefined,
      fontSize: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? fontSize : undefined,
      fontWeight: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? fontWeight : undefined,
      letterSpacing: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? letterSpacing : undefined,
      isItalic: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? isItalic : undefined,
      lineHeight: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? lineHeight : undefined,
      codeContent: noteType === 'code' ? codeContent : undefined,
      codeLanguage: noteType === 'code' ? codeLanguage : undefined,
      reminderEnabled,
      reminderTime: reminderEnabled ? (() => {
        const [remHours, remMinutes] = reminderTime.split(':').map(Number);
        const reminderDateTime = new Date(createdAt);
        reminderDateTime.setHours(remHours, remMinutes, 0, 0);
        return reminderDateTime;
      })() : undefined,
      reminderRecurring,
      reminderVibration,
      notificationId,
      notificationIds,
      createdAt: note?.createdAt || combinedDateTime,
      updatedAt: new Date(),
    };
  }, [
    createdAt,
    createdTime,
    getCurrentNoteId,
    note?.createdAt,
    noteType,
    title,
    content,
    color,
    images,
    voiceRecordings,
    selectedFolderId,
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    isItalic,
    lineHeight,
    codeContent,
    codeLanguage,
    reminderEnabled,
    reminderTime,
    reminderRecurring,
    reminderVibration,
    notificationId,
    notificationIds,
  ]);

  const commitNote = useCallback(async ({ full }: { full: boolean }) => {
    const savedNote = buildCurrentNote();

    if (full) {
      // Handle notification scheduling
      if (savedNote.reminderEnabled && savedNote.reminderTime) {
        const result = await updateNoteReminder({
          ...savedNote,
          notificationId: savedNote.notificationId || undefined,
          notificationIds: savedNote.notificationIds || undefined,
        });

        if (result) {
          if (Array.isArray(result)) {
            savedNote.notificationIds = result;
            savedNote.notificationId = undefined;
          } else {
            savedNote.notificationId = result;
            savedNote.notificationIds = undefined;
          }
        }
      } else if (!savedNote.reminderEnabled && (savedNote.notificationId || savedNote.notificationIds)) {
        // Cancel notification(s) if reminder was disabled
        if (savedNote.notificationIds) {
          await cancelNoteReminder(savedNote.notificationIds);
        } else if (savedNote.notificationId) {
          await cancelNoteReminder(savedNote.notificationId);
        }
        savedNote.notificationId = undefined;
        savedNote.notificationIds = undefined;
        savedNote.reminderTime = undefined;
      }

      // Save version history (only on "full" save)
      saveNoteVersion(savedNote, note ? 'edit' : 'create');
    }

    onSave(savedNote);
    persistNoteToLocalStorage(savedNote);
  }, [buildCurrentNote, note, onSave, persistNoteToLocalStorage]);

  const handleSave = useCallback(async () => {
    await commitNote({ full: true });
  }, [commitNote]);

  // Use ref to always have access to the latest save function
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const closeHistoryOverlay = useCallback(() => {
    if (!pushedHistoryRef.current) return;
    pushedHistoryRef.current = false;
    isPoppingHistoryRef.current = true;
    setTimeout(() => {
      window.history.back();
    }, 0);
  }, []);

  const handleClose = useCallback(async () => {
    await commitNote({ full: true });
    onClose();
    closeHistoryOverlay();
    // Navigate back to the origin screen if provided
    if (returnToRef.current) {
      navigate(returnToRef.current, { replace: true });
    }
  }, [closeHistoryOverlay, commitNote, navigate, onClose]);

  const handleCloseRef = useRef(handleClose);
  useEffect(() => {
    handleCloseRef.current = handleClose;
  }, [handleClose]);

  // When editor opens, push a history entry so "Back" closes editor instead of leaving/exiting
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    pushedHistoryRef.current = true;
    window.history.pushState({ __noteEditor: true }, '');

    const onPopState = () => {
      if (isPoppingHistoryRef.current) {
        isPoppingHistoryRef.current = false;
        return;
      }

      if (!isOpenRef.current) return;

      // Keep user on same URL; close editor instead.
      window.history.pushState({ __noteEditor: true }, '');
      void handleCloseRef.current();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isOpen]);

  // Auto-save as user types (debounced)
  useEffect(() => {
    if (!isOpen) return;

    const hasText = (title?.trim() || '') !== '' || (content?.trim() || '') !== '' || (codeContent?.trim() || '') !== '';
    if (!hasText) return;

    const t = window.setTimeout(() => {
      void commitNote({ full: false });
    }, 700);

    return () => window.clearTimeout(t);
  }, [isOpen, title, content, codeContent, commitNote]);

  // Save immediately if tab/app is backgrounded
  useEffect(() => {
    if (!isOpen) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void commitNote({ full: false });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isOpen, commitNote]);

  // Handle hardware back button on Android - save and close editor (parent keeps correct screen)
  useHardwareBackButton({
    onBack: handleClose,
    enabled: isOpen,
    priority: 'sheet',
  });

  const handleRestoreVersion = (restoredContent: string, restoredTitle: string) => {
    setContent(restoredContent);
    setTitle(restoredTitle);
    toast.success('Version restored');
  };

  const handleInsertNoteLink = (noteTitle: string) => {
    const linkText = insertNoteLink(noteTitle);
    setContent(prev => prev + linkText);
    toast.success(`Link to "${noteTitle}" inserted`);
  };

  const handleExportMarkdown = () => {
    const currentNote: Note = {
      id: note?.id || Date.now().toString(),
      type: noteType,
      title,
      content,
      codeContent,
      codeLanguage,
      voiceRecordings,
      createdAt: note?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    exportNoteToMarkdown(currentNote);
    toast.success('Note exported as Markdown');
  };

  const handleImageAdd = (imageUrl: string) => {
    setImages([...images, imageUrl]);
  };

  const handleRecordingAdd = (recording: VoiceRecording) => {
    setVoiceRecordings([...voiceRecordings, recording]);
  };

  const handleInsertAudioAtCursor = (audioBase64: string, recordingId: string) => {
    // For rich text editors (sticky, lined, regular), insert audio element in content
    // We use a custom data attribute to identify and render with AudioPlayer component
    if (['sticky', 'lined', 'regular'].includes(noteType)) {
      const audioHtml = `<div class="audio-player-container" style="margin: 12px 0;" data-recording-id="${recordingId}" data-audio-src="${audioBase64}"><audio controls src="${audioBase64}" style="width: 100%; height: 54px;"></audio></div><p><br></p>`;
      setContent(prev => prev + audioHtml);
    }
  };

  const handleRecordingDelete = (id: string) => {
    setVoiceRecordings(voiceRecordings.filter(r => r.id !== id));
  };

  const getEditorBackgroundColor = () => {
    if (noteType === 'sticky') {
      return STICKY_COLOR_VALUES[color];
    }
    // Use CSS variable for regular/lined notes to match dark mode
    return 'hsl(var(--background))';
  };

  // Swipe gesture to close editor (left or right)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Check if horizontal swipe is dominant (not vertical scroll)
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      // Swipe left or right detected - close editor
      void handleClose();
    }

    touchStartRef.current = null;
  }, [handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex flex-col")}
      style={{ backgroundColor: getEditorBackgroundColor() }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header - Hide for expense notes */}
      {noteType !== 'expense' && (
        <div
          className="flex justify-between items-center px-4 py-3 border-b"
          style={{ backgroundColor: getEditorBackgroundColor(), borderColor: 'rgba(0,0,0,0.1)' }}
        >
          <Button variant="ghost" size="icon" onClick={handleClose} className={cn("h-9 w-9", noteType === 'sticky' && "text-black hover:text-black")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-1">
            {/* Table of Contents */}
            {content && (
              <NoteTableOfContents 
                content={content} 
                onJumpTo={(id) => {
                  const element = document.getElementById(id);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }} 
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-9 w-9", noteType === 'sticky' && "text-black hover:text-black")}>
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                <DropdownMenuItem onClick={() => setShowStats(!showStats)}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {showStats ? 'Hide' : 'Show'} Word Count & Stats
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsReadingMode(!isReadingMode)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  {isReadingMode ? 'Exit' : 'Enter'} Reading Mode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsFindReplaceOpen(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Find & Replace
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Created & Modified Dates */}
                <div className="px-2 py-1.5 text-xs text-muted-foreground flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span>Created: {format(note?.createdAt || createdAt, 'MMM dd, yyyy • h:mm a')}</span>
                  </div>
                  {note && (
                    <div className="flex items-center gap-1">
                      <span>Modified: {format(new Date(note.updatedAt), 'MMM dd, yyyy • h:mm a')}</span>
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                
                {/* Voice Recorder */}
                <div className="px-2 py-1.5">
                  <VoiceRecorder
                    recordings={voiceRecordings}
                    onRecordingAdd={handleRecordingAdd}
                    onRecordingDelete={handleRecordingDelete}
                    onInsertAtCursor={handleInsertAudioAtCursor}
                    compact={true}
                  />
                </div>
                <DropdownMenuSeparator />
                
                {/* Folder Selection */}
                <div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-2">
                  <FolderIcon className="h-4 w-4" />
                  Move to Folder
                </div>
                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      toast.success(`Moved to ${folder.name}`);
                    }}
                    className={cn(selectedFolderId === folder.id && "bg-accent", "pl-6")}
                  >
                    {folder.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => setIsNewFolderDialogOpen(true)} className="pl-6">
                  <Plus className="h-4 w-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  const plainContent = content.replace(/<[^>]*>/g, '').trim();
                  const shareText = title ? `${title}\n\n${plainContent}` : plainContent;
                  if (navigator.share) {
                    navigator.share({
                      title: title || 'Note',
                      text: shareText,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(shareText);
                    toast.success('Note copied to clipboard');
                  }
                }}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Note
                </DropdownMenuItem>
                {note && (
                  <DropdownMenuItem onClick={() => setIsVersionHistoryOpen(true)}>
                    <History className="h-4 w-4 mr-2" />
                    Version History
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Word Count Stats Bar - only shows when enabled */}
      {showStats && (
        <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-end gap-2 text-xs text-muted-foreground" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          <span>{noteStats.wordCount} words</span>
          <span>•</span>
          <span>{noteStats.characterCount} chars</span>
        </div>
      )}

      {/* Sticky note color picker */}
      {noteType === 'sticky' && !isReadingMode && (
        <div className="px-4 py-2 border-b bg-background">
          <div className="flex items-center gap-2">
            {STICKY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Set sticky color ${c}`}
                onClick={() => setColor(c)}
                className={cn("h-7 w-7 rounded-full border", c === color && "ring-2 ring-ring")}
                style={{ backgroundColor: STICKY_COLOR_VALUES[c] }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Full Page Content Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ErrorBoundary>
          {noteType === 'expense' ? (
            <ExpenseTrackerEditor
              content={content}
              onChange={setContent}
              title={title}
              onTitleChange={setTitle}
              onClose={handleClose}
            />
          ) : noteType === 'code' ? (
            <VirtualizedCodeEditor
              code={codeContent}
              onChange={setCodeContent}
              language={codeLanguage}
              onLanguageChange={setCodeLanguage}
              title={title}
              onTitleChange={setTitle}
              onClose={handleClose}
            />
          ) : noteType === 'mindmap' ? (
            <MindMapEditor
              content={content}
              onChange={setContent}
              title={title}
              onTitleChange={setTitle}
            />
          ) : noteType === 'sketch' ? (
            <SketchEditor content={content} onChange={setContent} />
          ) : isReadingMode ? (
            <div 
              className="h-full overflow-y-auto overscroll-contain"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                minHeight: 0,
              }}
            >
              <div className="p-4 pb-20">
                {title && (
                  <h1 
                    className="text-2xl font-bold mb-4"
                    style={{ fontFamily }}
                  >
                    {title}
                  </h1>
                )}
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  style={{ fontFamily, fontSize, fontWeight, lineHeight }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </div>
          ) : (
            <RichTextEditor
              content={content}
              onChange={setContent}
              onImageAdd={handleImageAdd}
              allowImages={true}
              showTable={noteType !== 'lined'}
              className={cn(
                noteType === 'lined' && 'lined-note',
                noteType === 'sticky' && 'sticky-note-editor'
              )}
              toolbarPosition="bottom"
              title={title}
              onTitleChange={setTitle}
              showTitle={true}
              fontFamily={fontFamily}
              onFontFamilyChange={setFontFamily}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
              fontWeight={fontWeight}
              onFontWeightChange={setFontWeight}
              letterSpacing={letterSpacing}
              onLetterSpacingChange={setLetterSpacing}
              isItalic={isItalic}
              onItalicChange={setIsItalic}
              lineHeight={lineHeight}
              onLineHeightChange={setLineHeight}
              onInsertNoteLink={() => setIsNoteLinkingOpen(true)}
              externalEditorRef={editorRef}
            />
          )}
        </ErrorBoundary>
      </div>

      {/* Backlinks Section */}
      {note && backlinks.length > 0 && (
        <div className="border-t bg-background/95 backdrop-blur-sm">
          <Collapsible open={isBacklinksOpen} onOpenChange={setIsBacklinksOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 hover:bg-accent/50 transition-colors">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                {backlinks.length} backlink{backlinks.length !== 1 ? 's' : ''}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isBacklinksOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-3 space-y-1 max-h-32 overflow-y-auto">
                {backlinks.map((linkedNote) => (
                  <button
                    key={linkedNote.id}
                    onClick={() => {
                      handleSave();
                      onClose();
                      // Trigger opening the linked note via navigation or callback
                      toast.info(`Navigate to "${linkedNote.title}" to view`);
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left rounded-md hover:bg-accent transition-colors"
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="truncate">{linkedNote.title || 'Untitled'}</span>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Template Selector */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={(templateContent) => setContent(templateContent)}
      />

      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <Button onClick={handleCreateFolder} className="w-full">
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Sheet */}
      {note && (
        <NoteVersionHistorySheet
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
          noteId={note.id}
          onRestore={handleRestoreVersion}
        />
      )}

      {/* Note Linking Sheet */}
      <NoteLinkingSheet
        isOpen={isNoteLinkingOpen}
        onClose={() => setIsNoteLinkingOpen(false)}
        notes={allNotes}
        currentNoteId={note?.id}
        onSelectNote={handleInsertNoteLink}
      />

      {/* Find & Replace Sheet */}
      <FindReplaceSheet
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        content={content}
        onContentChange={setContent}
        editorRef={editorRef}
      />
    </div>
  );
};
