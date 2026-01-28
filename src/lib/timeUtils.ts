import { TemporalState, RowConfig } from './types';

/**
 * Get the ISO week number from a date
 * @param date - Date to get week number from (defaults to today)
 * @returns ISO week number (1-52/53)
 */
export function getCurrentWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the year for the ISO week (handles year boundary correctly)
 * @param date - Date to get week year from
 * @returns Year that the ISO week belongs to
 */
export function getWeekYear(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Parse a week string (e.g., "KW13") to a number
 * @param weekStr - Week string like "KW13"
 * @returns Week number
 */
export function parseWeekString(weekStr: string): number {
  return parseInt(weekStr.replace('KW', ''), 10) || 0;
}

/**
 * Format a week number as a week string
 * @param weekNum - Week number
 * @returns Formatted week string like "KW13"
 */
export function formatWeekString(weekNum: number): string {
  return `KW${weekNum}`;
}

/**
 * Get the temporal state of a week relative to the current week
 * @param weekStr - Week string like "KW13"
 * @param weekYear - Year of the week
 * @param currentWeek - Current week number
 * @param currentYear - Current year
 * @returns 'past' | 'current' | 'future'
 */
export function getWeekTemporalState(
  weekStr: string,
  weekYear: number,
  currentWeek: number,
  currentYear: number
): TemporalState {
  const weekNum = parseWeekString(weekStr);
  
  if (weekYear < currentYear) return 'past';
  if (weekYear > currentYear) return 'future';
  
  // Same year
  if (weekNum < currentWeek) return 'past';
  if (weekNum > currentWeek) return 'future';
  return 'current';
}

/**
 * Generate week labels for a range of years
 * @param startYear - Starting year
 * @param numYears - Number of years to generate (minimum 2)
 * @returns Array of { week: string, year: number } objects
 */
export function generateWeekRange(
  startYear: number,
  numYears: number = 2
): Array<{ week: string; year: number }> {
  const result: Array<{ week: string; year: number }> = [];
  
  for (let year = startYear; year < startYear + Math.max(2, numYears); year++) {
    // Most years have 52 weeks, some have 53
    const weeksInYear = getWeeksInYear(year);
    for (let week = 1; week <= weeksInYear; week++) {
      result.push({
        week: formatWeekString(week),
        year,
      });
    }
  }
  
  return result;
}

/**
 * Get the number of ISO weeks in a year
 * @param year - Year to check
 * @returns 52 or 53
 */
export function getWeeksInYear(year: number): number {
  const dec31 = new Date(year, 11, 31);
  const week = getCurrentWeekNumber(dec31);
  // If week 1 is returned, the year has 52 weeks
  return week === 1 ? 52 : week;
}

/**
 * Check if a cell is editable based on row config and temporal state
 * @param rowConfig - Row configuration
 * @param temporalState - Current temporal state of the week
 * @returns Whether the cell is editable
 */
export function isEditable(
  rowConfig: RowConfig,
  temporalState: TemporalState
): boolean {
  // Past weeks are never editable
  if (temporalState === 'past') return false;
  
  // Check if the row is editable at all
  if (!rowConfig.editable && !rowConfig.editableInFuture) return false;
  
  // If only editable in future, check temporal state
  if (rowConfig.editableInFuture && !rowConfig.editable) {
    return temporalState === 'future';
  }
  
  return rowConfig.editable;
}

/**
 * Check if a week is the "current week" (for daily breakdown)
 * @param weekStr - Week string
 * @param weekYear - Year of the week
 * @param currentWeek - Current week number
 * @param currentYear - Current year
 * @returns Whether this is the current week
 */
export function isCurrentWeek(
  weekStr: string,
  weekYear: number,
  currentWeek: number,
  currentYear: number
): boolean {
  const weekNum = parseWeekString(weekStr);
  return weekNum === currentWeek && weekYear === currentYear;
}

/**
 * Check if a week is the "next week" (for daily breakdown)
 * @param weekStr - Week string
 * @param weekYear - Year of the week
 * @param currentWeek - Current week number
 * @param currentYear - Current year
 * @returns Whether this is the next week
 */
export function isNextWeek(
  weekStr: string,
  weekYear: number,
  currentWeek: number,
  currentYear: number
): boolean {
  const weekNum = parseWeekString(weekStr);
  
  // Handle year boundary
  if (currentWeek === 52 || currentWeek === 53) {
    const weeksInCurrentYear = getWeeksInYear(currentYear);
    if (currentWeek === weeksInCurrentYear) {
      // Next week is KW1 of next year
      return weekNum === 1 && weekYear === currentYear + 1;
    }
  }
  
  return weekNum === currentWeek + 1 && weekYear === currentYear;
}

/**
 * Get a date for a specific day of a week
 * @param weekNum - Week number
 * @param year - Year
 * @param dayOfWeek - Day of week (1 = Monday, 5 = Friday)
 * @returns Date object
 */
export function getDateForWeekDay(
  weekNum: number,
  year: number,
  dayOfWeek: number
): Date {
  // Get first day of year
  const jan1 = new Date(year, 0, 1);
  const jan1DayOfWeek = jan1.getDay() || 7; // Convert Sunday (0) to 7
  
  // Calculate the Monday of week 1
  const week1Monday = new Date(jan1);
  week1Monday.setDate(jan1.getDate() + (1 - jan1DayOfWeek));
  
  // If week 1 Monday is after Jan 4, go back a week
  if (week1Monday.getDate() > 4 && week1Monday.getMonth() === 0) {
    week1Monday.setDate(week1Monday.getDate() - 7);
  }
  
  // Calculate target date
  const targetDate = new Date(week1Monday);
  targetDate.setDate(week1Monday.getDate() + (weekNum - 1) * 7 + (dayOfWeek - 1));
  
  return targetDate;
}

/**
 * Format a date in German format (dd.mm.yyyy)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateGerman(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
