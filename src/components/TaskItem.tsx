import { useState, useRef, useEffect } from 'react';
import { TodoItem, Priority, ColoredTag } from '@/types/note';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, Repeat, Trash2, Check, Tag, Play, Pause, Mic, Link, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { WaveformProgressBar } from './WaveformProgressBar';
import { canCompleteTask } from './TaskDependencySheet';
import { getRepeatLabel } from '@/utils/recurringTasks';
import { ResolvedTaskImage } from './ResolvedTaskImage';
import { resolveTaskMediaUrl } from '@/utils/todoItemsStorage';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskItemProps {
  item: TodoItem;
  level?: number;
  onUpdate: (itemId: string, updates: Partial<TodoItem>) => void;
  onDelete: (itemId: string) => void;
  onTaskClick: (item: TodoItem) => void;
  onImageClick: (imageUrl: string) => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onSelect?: (itemId: string) => void;
  expandedTasks?: Set<string>;
  onToggleSubtasks?: (taskId: string) => void;
  onUpdateSubtask?: (parentId: string, subtaskId: string, updates: Partial<TodoItem>) => void;
  hideDetails?: boolean;
  allTasks?: TodoItem[];
}

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];

const getPriorityBorderColor = (priority?: Priority) => {
  switch (priority) {
    case 'high': return 'border-red-500';
    case 'medium': return 'border-orange-500';
    case 'low': return 'border-green-500';
    default: return 'border-muted-foreground/40';
  }
};

export const TaskItem = ({
  item,
  level = 0,
  onUpdate,
  onDelete,
  onTaskClick,
  onImageClick,
  isSelected = false,
  isSelectionMode = false,
  onSelect,
  expandedTasks,
  onToggleSubtasks,
  onUpdateSubtask,
  hideDetails = false,
  allTasks = []
}: TaskItemProps) => {
  // Default to collapsed (false) for subtasks
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = expandedTasks ? expandedTasks.has(item.id) : localIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onToggleSubtasks) {
      onToggleSubtasks(item.id);
    } else {
      setLocalIsOpen(open);
    }
  };
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(item.voiceRecording?.duration || 0);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasSubtasks = item.subtasks && item.subtasks.length > 0;
  const indentPx = level * 16;
  
  // Resolve audio URL on mount
  useEffect(() => {
    if (item.voiceRecording?.audioUrl) {
      resolveTaskMediaUrl(item.voiceRecording.audioUrl).then(url => {
        if (url) setResolvedAudioUrl(url);
      });
    }
  }, [item.voiceRecording?.audioUrl]);
  
  // Check dependency status
  const { canComplete, blockedBy } = canCompleteTask(item, allTasks);
  const hasDependencies = item.dependsOn && item.dependsOn.length > 0;
  const isBlocked = hasDependencies && !canComplete;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayVoice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.voiceRecording) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingVoice(false);
      setPlaybackProgress(0);
      setCurrentTime(0);
      return;
    }

    // Resolve media ref if needed
    const audioUrl = await resolveTaskMediaUrl(item.voiceRecording.audioUrl);
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackSpeed;
    audioRef.current = audio;
    
    audio.ontimeupdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };
    
    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };
    
    audio.onended = () => {
      setIsPlayingVoice(false);
      setPlaybackProgress(0);
      setCurrentTime(0);
      audioRef.current = null;
    };
    
    audio.play();
    setIsPlayingVoice(true);
  };

  const cyclePlaybackSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current || !item.voiceRecording) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const duration = audioRef.current.duration || audioDuration || item.voiceRecording.duration;
    if (duration && !isNaN(duration)) {
      audioRef.current.currentTime = percentage * duration;
      setPlaybackProgress(percentage * 100);
      setCurrentTime(percentage * duration);
    }
  };

  const SWIPE_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    
    // Only swipe horizontally if not scrolling vertically
    if (deltaY < 30) {
      setIsSwiping(true);
      // Limit swipe range
      const clampedX = Math.max(-120, Math.min(120, deltaX));
      setSwipeX(clampedX);
    }
  };

  const handleTouchEnd = async () => {
    if (swipeX < -SWIPE_THRESHOLD) {
      // Swipe left - Delete
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
      onDelete(item.id);
    } else if (swipeX > SWIPE_THRESHOLD) {
      // Swipe right - Toggle complete
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
      onUpdate(item.id, { completed: !item.completed });
    }
    setSwipeX(0);
    setIsSwiping(false);
  };

  return (
    <div className="space-y-2" style={{ paddingLeft: indentPx > 0 ? `${indentPx}px` : undefined }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="relative overflow-hidden rounded-lg">
          {/* Swipe action backgrounds */}
          <div className="absolute inset-0 flex">
            <div className={cn(
              "flex-1 flex items-center justify-start pl-4 transition-colors",
              swipeX > SWIPE_THRESHOLD ? "bg-green-500" : "bg-green-500/70"
            )}>
              <Check className="h-6 w-6 text-white" />
            </div>
            <div className={cn(
              "flex-1 flex items-center justify-end pr-4 transition-colors",
              swipeX < -SWIPE_THRESHOLD ? "bg-red-500" : "bg-red-500/70"
            )}>
              <Trash2 className="h-6 w-6 text-white" />
            </div>
          </div>

          {/* Main task card */}
          <div
            className={cn(
              "bg-card rounded-lg border group hover:shadow-sm transition-all p-2 cursor-pointer h-[72px] relative select-none",
              isSelected && "ring-2 ring-primary",
              level > 0 && "mr-2"
            )}
            style={{ 
              transform: `translateX(${swipeX}px)`, 
              transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex items-center gap-2 h-full">
              {isSelectionMode && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onSelect?.(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 flex-shrink-0"
                />
              )}
              
              <div className="relative flex items-center flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Checkbox
                          checked={item.completed}
                          disabled={isBlocked}
                          onCheckedChange={async (checked) => {
                            if (isBlocked) return;
                            onUpdate(item.id, { completed: !!checked });
                            if (checked && !item.completed) {
                              try {
                                await Haptics.impact({ style: ImpactStyle.Heavy });
                                setTimeout(async () => { try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {} }, 100);
                              } catch {}
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "h-6 w-6 flex-shrink-0 transition-all",
                            item.completed 
                              ? "rounded-sm border-0 bg-muted-foreground/30 data-[state=checked]:bg-muted-foreground/30 data-[state=checked]:text-white" 
                              : cn("rounded-full border-2", getPriorityBorderColor(item.priority)),
                            isBlocked && "opacity-50 cursor-not-allowed"
                          )}
                        />
                        {isBlocked && (
                          <Lock className="absolute -top-1 -right-1 h-3 w-3 text-amber-500" />
                        )}
                      </div>
                    </TooltipTrigger>
                    {isBlocked && (
                      <TooltipContent>
                        <p className="text-xs">Blocked by: {blockedBy.map(t => t.text).slice(0, 2).join(', ')}{blockedBy.length > 2 ? ` +${blockedBy.length - 2}` : ''}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div
                className="flex-1 min-w-0 overflow-hidden mr-2"
                onClick={(e) => { e.stopPropagation(); if (!isSelectionMode && !isSwiping) onTaskClick(item); }}
              >
                {/* Show voice player OR text based on whether it's a voice task */}
                {item.voiceRecording ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayVoice}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors min-w-0 flex-1"
                    >
                      {isPlayingVoice ? (
                        <Pause className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <Play className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      {/* Waveform progress bar */}
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                        {resolvedAudioUrl ? (
                          <WaveformProgressBar
                            audioUrl={resolvedAudioUrl}
                            progress={playbackProgress}
                            duration={audioDuration || item.voiceRecording.duration}
                            isPlaying={isPlayingVoice}
                            onSeek={(percent) => {
                              if (audioRef.current) {
                                const duration = audioRef.current.duration || audioDuration || item.voiceRecording!.duration;
                                if (duration && !isNaN(duration)) {
                                  audioRef.current.currentTime = (percent / 100) * duration;
                                  setPlaybackProgress(percent);
                                  setCurrentTime((percent / 100) * duration);
                                }
                              }
                            }}
                            height={12}
                          />
                        ) : (
                          <div 
                            className="relative h-1.5 bg-primary/20 rounded-full overflow-hidden cursor-pointer"
                            onClick={handleSeek}
                          >
                            <div 
                              className="absolute h-full bg-primary rounded-full transition-all duration-100"
                              style={{ width: `${playbackProgress}%` }}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-primary font-medium">
                            {isPlayingVoice ? formatDuration(Math.round(currentTime)) : '0:00'}
                          </span>
                          <span className="text-primary/70">
                            {formatDuration(audioDuration || item.voiceRecording.duration)}
                          </span>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={cyclePlaybackSpeed}
                      className="px-2 py-1 text-xs font-semibold rounded-md bg-muted hover:bg-muted/80 transition-colors min-w-[40px]"
                    >
                      {playbackSpeed}x
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-medium truncate", item.completed && "text-muted-foreground")}>{item.text}</p>
                  </div>
                )}
                {/* Colored tags display - hidden when hideDetails is true */}
                {!hideDetails && item.coloredTags && item.coloredTags.length > 0 && !item.voiceRecording && (
                  <div className="flex items-center gap-1 mt-1 overflow-hidden">
                    {item.coloredTags.slice(0, 3).map((tag) => (
                      <span 
                        key={tag.name}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full truncate max-w-[60px]"
                        style={{ 
                          backgroundColor: `${tag.color}20`, 
                          color: tag.color 
                        }}
                      >
                        <Tag className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{tag.name}</span>
                      </span>
                    ))}
                    {item.coloredTags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{item.coloredTags.length - 3}</span>
                    )}
                  </div>
                )}
                {/* Date display - hidden when hideDetails is true */}
                {!hideDetails && item.dueDate && !item.voiceRecording && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(item.dueDate).toLocaleDateString()}
                  </p>
                )}
                {/* Recurring, Dependency and Subtasks indicators */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.repeatType && item.repeatType !== 'none' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600">
                      <Repeat className="h-2.5 w-2.5" />
                      {getRepeatLabel(item.repeatType, item.repeatDays, item.advancedRepeat)}
                    </span>
                  )}
                  {hasDependencies && (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full",
                      isBlocked ? "bg-amber-500/20 text-amber-600" : "bg-green-500/20 text-green-600"
                    )}>
                      <Link className="h-2.5 w-2.5" />
                      {isBlocked ? `${blockedBy.length} blocking` : 'Ready'}
                    </span>
                  )}
                  {hasSubtasks && !isOpen && (
                    <p className="text-xs text-muted-foreground">{item.subtasks!.filter(st => st.completed).length}/{item.subtasks!.length} subtasks</p>
                  )}
                </div>
              </div>
              {item.imageUrl && (
                <div
                  className="w-14 h-14 rounded-full overflow-hidden border-2 border-border flex-shrink-0 ml-1 cursor-pointer hover:border-primary transition-colors"
                  onClick={(e) => { e.stopPropagation(); onImageClick(item.imageUrl!); }}
                >
                  <ResolvedTaskImage srcRef={item.imageUrl} alt="Task attachment" className="w-full h-full object-cover" />
                </div>
              )}
              {/* Expand/Collapse button for subtasks - always visible */}
              {hasSubtasks && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                  className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {hasSubtasks && isOpen && (
          <div className="ml-8 border-l-2 border-muted/50 bg-muted/10 rounded-b-lg overflow-hidden">
            {item.subtasks!.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-start gap-3 py-2 px-3 border-b border-border/30 last:border-b-0"
              >
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={async (checked) => {
                    if (onUpdateSubtask) {
                      onUpdateSubtask(item.id, subtask.id, { completed: !!checked });
                    }
                    if (checked && !subtask.completed) {
                      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "h-4 w-4 rounded-sm mt-0.5 flex-shrink-0",
                    subtask.completed 
                      ? "bg-muted-foreground/30 border-0 data-[state=checked]:bg-muted-foreground/30 data-[state=checked]:text-white" 
                      : "border-2 border-muted-foreground/40"
                  )}
                />
                <span className={cn(
                  "text-sm flex-1",
                  subtask.completed && "text-muted-foreground"
                )}>
                  {subtask.text}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/20">
              {item.subtasks!.filter(st => st.completed).length}/{item.subtasks!.length} completed
            </p>
          </div>
        )}
      </Collapsible>
    </div>
  );
};
