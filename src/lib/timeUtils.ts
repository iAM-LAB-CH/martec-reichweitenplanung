import { WeekStatus } from './types';

/**
 * Get the current ISO week number
 * ISO weeks start on Monday
 */
export const getCurrentWeek = (): number => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  
  // ISO week starts on Monday
  const dayOfWeek = startOfYear.getDay();
  const isoWeekStartOffset = dayOfWeek <= 4 ? dayOfWeek - 1 : dayOfWeek - 8;
  
  return Math.ceil((days + isoWeekStartOffset + 1) / 7);
};

/**
 * Get the week status relative to current week
 */
export const getWeekStatus = (weekNum: number, currentWeek: number): WeekStatus => {
  if (weekNum < currentWeek) return 'past';
  if (weekNum === currentWeek) return 'current';
  return 'future';
};

/**
 * Parse week number from KW string (e.g., "KW13" -> 13)
 */
export const parseWeekNumber = (weekString: string): number => {
  return parseInt(weekString.replace('KW', ''), 10) || 0;
};

/**
 * Format week number to KW string (e.g., 13 -> "KW13")
 */
export const formatWeekString = (weekNum: number): string => {
  return `KW${weekNum}`;
};

/**
 * Generate an array of week strings for a given range
 */
export const generateWeekRange = (startWeek: number, count: number): string[] => {
  const weeks: string[] = [];
  for (let i = 0; i < count; i++) {
    const weekNum = ((startWeek + i - 1) % 52) + 1;
    weeks.push(formatWeekString(weekNum));
  }
  return weeks;
};

/**
 * Get the index of the current week in a WeeklyData array
 */
export const getCurrentWeekIndex = (weeks: string[], currentWeek?: number): number => {
  const current = currentWeek ?? getCurrentWeek();
  const currentWeekString = formatWeekString(current);
  const index = weeks.indexOf(currentWeekString);
  return index >= 0 ? index : 0;
};

/**
 * Get days of the week (German abbreviations)
 */
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const;

export type Weekday = typeof WEEKDAYS[number];

/**
 * Get dates for each day in a given week
 */
export const getWeekDates = (weekNum: number, year: number = new Date().getFullYear()): Date[] => {
  // Find the first Thursday of the year (ISO week 1 contains it)
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay();
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  // Calculate Monday of the target week
  const mondayOfTargetWeek = new Date(mondayOfWeek1);
  mondayOfTargetWeek.setDate(mondayOfWeek1.getDate() + (weekNum - 1) * 7);
  
  // Generate dates for Mo-Fr
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(mondayOfTargetWeek);
    date.setDate(mondayOfTargetWeek.getDate() + i);
    dates.push(date);
  }
  
  return dates;
};

/**
 * Format date as DD.MM
 */
export const formatDateShort = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
};

/**
 * Check if editing is allowed for a week
 */
export const isWeekEditable = (weekStatus: WeekStatus): boolean => {
  return weekStatus === 'current' || weekStatus === 'future';
};

/**
 * Get cell background style based on week status
 */
export const getWeekCellStyle = (weekStatus: WeekStatus): {
  backgroundColor: string;
  opacity: number;
} => {
  switch (weekStatus) {
    case 'current':
      return { backgroundColor: 'primary.light', opacity: 1 };
    case 'past':
      return { backgroundColor: 'grey.50', opacity: 0.7 };
    default:
      return { backgroundColor: 'background.paper', opacity: 1 };
  }
};
