import { TodoItem, RepeatType, AdvancedRepeatPattern } from '@/types/note';
import { addDays, addWeeks, addMonths, startOfDay, getDay, setDay, getDate, setDate, differenceInDays } from 'date-fns';

export const getNextOccurrence = (
  currentDate: Date,
  repeatType: RepeatType,
  repeatDays?: number[],
  advancedRepeat?: AdvancedRepeatPattern
): Date | undefined => {
  const today = startOfDay(new Date());
  const baseDate = startOfDay(currentDate);

  // Handle advanced repeat patterns
  if (advancedRepeat) {
    const interval = advancedRepeat.interval || 1;
    
    switch (advancedRepeat.frequency) {
      case 'daily':
        return addDays(baseDate, interval);
      case 'weekly':
        if (advancedRepeat.weeklyDays && advancedRepeat.weeklyDays.length > 0) {
          // Find next day in the pattern
          const currentDay = getDay(baseDate);
          const sortedDays = [...advancedRepeat.weeklyDays].sort((a, b) => a - b);
          const nextDayInWeek = sortedDays.find(d => d > currentDay);
          
          if (nextDayInWeek !== undefined) {
            return setDay(baseDate, nextDayInWeek);
          } else {
            // Move to next week and get first day
            return setDay(addWeeks(baseDate, interval), sortedDays[0]);
          }
        }
        return addWeeks(baseDate, interval);
      case 'monthly':
        if (advancedRepeat.monthlyType === 'weekday' && advancedRepeat.monthlyWeek && advancedRepeat.monthlyDay !== undefined) {
          // e.g., "2nd Tuesday of the month"
          return getNthWeekdayOfNextMonth(baseDate, advancedRepeat.monthlyWeek, advancedRepeat.monthlyDay, interval);
        } else if (advancedRepeat.monthlyType === 'date' && advancedRepeat.monthlyDay) {
          // e.g., "15th of each month"
          const nextMonth = addMonths(baseDate, interval);
          return setDate(nextMonth, advancedRepeat.monthlyDay);
        }
        return addMonths(baseDate, interval);
      default:
        return undefined;
    }
  }

  // Handle simple repeat types
  switch (repeatType) {
    case 'daily':
      return addDays(baseDate, 1);
    case 'weekly':
      if (repeatDays && repeatDays.length > 0) {
        // Find next day in the pattern
        const currentDay = getDay(baseDate);
        const sortedDays = [...repeatDays].sort((a, b) => a - b);
        const nextDayInWeek = sortedDays.find(d => d > currentDay);
        
        if (nextDayInWeek !== undefined) {
          const daysUntil = nextDayInWeek - currentDay;
          return addDays(baseDate, daysUntil);
        } else {
          // Move to next week and get first day
          const daysUntil = 7 - currentDay + sortedDays[0];
          return addDays(baseDate, daysUntil);
        }
      }
      return addWeeks(baseDate, 1);
    case 'weekdays':
      let nextDate = addDays(baseDate, 1);
      while (getDay(nextDate) === 0 || getDay(nextDate) === 6) {
        nextDate = addDays(nextDate, 1);
      }
      return nextDate;
    case 'weekends':
      let nextWeekend = addDays(baseDate, 1);
      while (getDay(nextWeekend) !== 0 && getDay(nextWeekend) !== 6) {
        nextWeekend = addDays(nextWeekend, 1);
      }
      return nextWeekend;
    case 'monthly':
      return addMonths(baseDate, 1);
    case 'custom':
      if (repeatDays && repeatDays.length > 0) {
        const currentDay = getDay(baseDate);
        const sortedDays = [...repeatDays].sort((a, b) => a - b);
        const nextDayInWeek = sortedDays.find(d => d > currentDay);
        
        if (nextDayInWeek !== undefined) {
          const daysUntil = nextDayInWeek - currentDay;
          return addDays(baseDate, daysUntil);
        } else {
          const daysUntil = 7 - currentDay + sortedDays[0];
          return addDays(baseDate, daysUntil);
        }
      }
      return undefined;
    default:
      return undefined;
  }
};

const getNthWeekdayOfNextMonth = (
  baseDate: Date,
  weekNum: 1 | 2 | 3 | 4 | -1,
  weekday: number,
  interval: number
): Date => {
  const nextMonth = addMonths(baseDate, interval);
  const year = nextMonth.getFullYear();
  const month = nextMonth.getMonth();
  
  if (weekNum === -1) {
    // Last occurrence of weekday in month
    const lastDay = new Date(year, month + 1, 0);
    let date = lastDay;
    while (getDay(date) !== weekday) {
      date = addDays(date, -1);
    }
    return date;
  }
  
  // Find first occurrence of weekday in month
  let date = new Date(year, month, 1);
  while (getDay(date) !== weekday) {
    date = addDays(date, 1);
  }
  
  // Add weeks to get nth occurrence
  return addDays(date, (weekNum - 1) * 7);
};

export const createNextRecurringTask = (completedTask: TodoItem): TodoItem | null => {
  if (!completedTask.repeatType || completedTask.repeatType === 'none') {
    return null;
  }

  const currentDueDate = completedTask.dueDate ? new Date(completedTask.dueDate) : new Date();
  const nextDate = getNextOccurrence(
    currentDueDate,
    completedTask.repeatType,
    completedTask.repeatDays,
    completedTask.advancedRepeat
  );

  if (!nextDate) {
    return null;
  }

  // Calculate new reminder time if exists
  let newReminderTime: Date | undefined;
  if (completedTask.reminderTime && completedTask.dueDate) {
    const reminderOffset = new Date(completedTask.reminderTime).getTime() - new Date(completedTask.dueDate).getTime();
    newReminderTime = new Date(nextDate.getTime() + reminderOffset);
  }

  return {
    ...completedTask,
    id: `${Date.now()}-recurring`,
    completed: false,
    dueDate: nextDate,
    reminderTime: newReminderTime,
    // Reset time tracking for new occurrence
    timeTracking: completedTask.timeTracking ? {
      totalSeconds: 0,
      isRunning: false,
      sessions: []
    } : undefined,
    // Reset subtasks
    subtasks: completedTask.subtasks?.map(st => ({
      ...st,
      id: `${Date.now()}-${st.id}`,
      completed: false
    }))
  };
};

export const getRepeatLabel = (
  repeatType?: RepeatType,
  repeatDays?: number[],
  advancedRepeat?: AdvancedRepeatPattern
): string => {
  if (!repeatType || repeatType === 'none') return '';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (advancedRepeat) {
    const interval = advancedRepeat.interval || 1;
    const intervalText = interval > 1 ? `${interval} ` : '';
    
    switch (advancedRepeat.frequency) {
      case 'daily':
        return interval > 1 ? `Every ${interval} days` : 'Daily';
      case 'weekly':
        if (advancedRepeat.weeklyDays && advancedRepeat.weeklyDays.length > 0) {
          const days = advancedRepeat.weeklyDays.map(d => dayNames[d]).join(', ');
          return interval > 1 ? `Every ${interval} weeks on ${days}` : `Weekly on ${days}`;
        }
        return interval > 1 ? `Every ${interval} weeks` : 'Weekly';
      case 'monthly':
        if (advancedRepeat.monthlyType === 'weekday' && advancedRepeat.monthlyWeek !== undefined) {
          const weekNames = ['', '1st', '2nd', '3rd', '4th'];
          const weekName = advancedRepeat.monthlyWeek === -1 ? 'last' : weekNames[advancedRepeat.monthlyWeek];
          const dayName = fullDayNames[advancedRepeat.monthlyDay || 0];
          return `${weekName} ${dayName} of each month`;
        }
        return interval > 1 ? `Every ${interval} months` : 'Monthly';
      default:
        return 'Repeating';
    }
  }

  switch (repeatType) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      if (repeatDays && repeatDays.length > 0) {
        return `Weekly on ${repeatDays.map(d => dayNames[d]).join(', ')}`;
      }
      return 'Weekly';
    case 'weekdays':
      return 'Weekdays';
    case 'weekends':
      return 'Weekends';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      if (repeatDays && repeatDays.length > 0) {
        return `Every ${repeatDays.map(d => dayNames[d]).join(', ')}`;
      }
      return 'Custom';
    default:
      return '';
  }
};
