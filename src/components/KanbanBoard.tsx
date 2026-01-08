import { useMemo, useState, useRef, useCallback } from 'react';
import { TodoItem, Priority } from '@/types/note';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, AlertCircle, Flag, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface KanbanBoardProps {
  items: TodoItem[];
  onItemClick: (item: TodoItem) => void;
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => void;
  onReorder: (items: TodoItem[]) => void;
  isSelectionMode?: boolean;
  selectedTaskIds?: Set<string>;
  onSelectTask?: (taskId: string) => void;
}

type KanbanColumn = 'todo' | 'in-progress' | 'done';

const COLUMNS: { id: KanbanColumn; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-500' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
];

export const KanbanBoard = ({
  items,
  onItemClick,
  onUpdateItem,
  onReorder,
  isSelectionMode = false,
  selectedTaskIds = new Set(),
  onSelectTask,
}: KanbanBoardProps) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<KanbanColumn>>(new Set());
  const touchStartRef = useRef<{ x: number; y: number; id: string } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Group items by status (using priority as a proxy for kanban status)
  const groupedItems = useMemo(() => {
    const groups: Record<KanbanColumn, TodoItem[]> = {
      'todo': [],
      'in-progress': [],
      'done': [],
    };

    items.forEach(item => {
      if (item.completed) {
        groups['done'].push(item);
      } else if (item.kanbanStatus === 'in-progress' || item.priority === 'high') {
        groups['in-progress'].push(item);
      } else {
        groups['todo'].push(item);
      }
    });

    return groups;
  }, [items]);

  const handleDragStart = (itemId: string) => {
    setDraggingId(itemId);
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
  };

  const handleDragEnd = () => {
    if (draggingId && dragOverColumn) {
      const item = items.find(i => i.id === draggingId);
      if (item) {
        let updates: Partial<TodoItem> = {};
        
        if (dragOverColumn === 'done') {
          updates = { completed: true, kanbanStatus: 'done' };
        } else if (dragOverColumn === 'in-progress') {
          updates = { completed: false, kanbanStatus: 'in-progress' };
        } else {
          updates = { completed: false, kanbanStatus: 'todo' };
        }
        
        onUpdateItem(item.id, updates);
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch {}
      }
    }
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleTouchStart = useCallback((itemId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, id: itemId };
    
    longPressTimerRef.current = setTimeout(() => {
      handleDragStart(itemId);
    }, 300);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Cancel long press if moved too much
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    }
    
    // If dragging, check which column we're over
    if (draggingId) {
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const columnEl = elements.find(el => el.hasAttribute('data-column'));
      if (columnEl) {
        const column = columnEl.getAttribute('data-column') as KanbanColumn;
        if (column !== dragOverColumn) {
          setDragOverColumn(column);
          try { Haptics.impact({ style: ImpactStyle.Light }); } catch {}
        }
      }
    }
  }, [draggingId, dragOverColumn]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    handleDragEnd();
    touchStartRef.current = null;
  }, [draggingId, dragOverColumn]);

  const toggleColumnCollapse = (columnId: KanbanColumn) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  const getPriorityColor = (priority?: Priority) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const renderKanbanCard = (item: TodoItem) => {
    const isDragging = draggingId === item.id;
    
    return (
      <div
        key={item.id}
        className={cn(
          "bg-card border rounded-lg p-3 mb-2 shadow-sm transition-all",
          isDragging && "opacity-50 scale-95",
          "active:scale-95"
        )}
        onTouchStart={(e) => handleTouchStart(item.id, e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !draggingId && onItemClick(item)}
      >
        <div className="flex items-start gap-2">
          {isSelectionMode && (
            <Checkbox
              checked={selectedTaskIds.has(item.id)}
              onCheckedChange={() => onSelectTask?.(item.id)}
              className="mt-0.5"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium line-clamp-2",
              item.completed && "line-through text-muted-foreground"
            )}>
              {item.text}
            </p>
            
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {item.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {item.priority && (
                <Flag className={cn("h-3 w-3", getPriorityColor(item.priority))} />
              )}
              
              {item.dueDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(item.dueDate), 'MMM d')}
                </span>
              )}
              
              {item.subtasks && item.subtasks.length > 0 && (
                <Badge variant="secondary" className="text-xs h-5">
                  {item.subtasks.filter(st => st.completed).length}/{item.subtasks.length}
                </Badge>
              )}
              
              {item.coloredTags?.map(tag => (
                <Badge
                  key={tag.name}
                  variant="outline"
                  className="text-xs h-5"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
          
          <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4">
      {COLUMNS.map(column => {
        const columnItems = groupedItems[column.id];
        const isCollapsed = collapsedColumns.has(column.id);
        const isDropTarget = dragOverColumn === column.id;
        
        return (
          <div
            key={column.id}
            data-column={column.id}
            className={cn(
              "flex-1 min-w-[280px] max-w-[350px] bg-muted/30 rounded-xl p-3 transition-all",
              isDropTarget && "ring-2 ring-primary bg-primary/5"
            )}
          >
            <Collapsible open={!isCollapsed} onOpenChange={() => toggleColumnCollapse(column.id)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", column.color)} />
                    <h3 className="font-semibold text-sm">{column.title}</h3>
                    <Badge variant="secondary" className="h-5 text-xs">
                      {columnItems.length}
                    </Badge>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="space-y-0">
                  {columnItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No tasks
                    </div>
                  ) : (
                    columnItems.map(renderKanbanCard)
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
};
