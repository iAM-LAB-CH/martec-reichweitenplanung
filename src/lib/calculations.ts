import { WeeklyData, SalesForecastBreakdown, ProcurementBreakdown } from './types';

// Forecast calculation parameters
export const FORECAST_PARAMS = {
  HIST_WEEKS: 8,      // Rolling window for run-rate
  ALPHA: 0.7,         // Recency weighting (reserved for future use)
  MIN_FACTOR: 0.5,    // Minimum run-rate factor
  MAX_FACTOR: 1.5,    // Maximum run-rate factor
};

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

/**
 * Calculate run-rate factor from historical actuals vs budget
 * Returns a factor between MIN_FACTOR and MAX_FACTOR
 */
export const calculateRunRateFactor = (
  weeklyData: WeeklyData[],
  currentWeekIndex: number
): number => {
  const pastWeeks = weeklyData.slice(
    Math.max(0, currentWeekIndex - FORECAST_PARAMS.HIST_WEEKS),
    currentWeekIndex
  );
  
  const sumActual = pastWeeks.reduce((sum, w) => sum + (w.salesActuals ?? 0), 0);
  const sumBudget = pastWeeks.reduce((sum, w) => sum + w.salesBudget, 0);
  
  if (sumBudget === 0) return 1.0;
  
  const factor = sumActual / sumBudget;
  return clamp(factor, FORECAST_PARAMS.MIN_FACTOR, FORECAST_PARAMS.MAX_FACTOR);
};

/**
 * Calculate system baseline forecast based on budget and run-rate factor
 */
export const calculateBaselineForecastSystem = (
  salesBudget: number,
  runRateFactor: number
): number => {
  return Math.round(salesBudget * runRateFactor);
};

/**
 * Get effective baseline (user override or system calculated)
 */
export const getEffectiveBaseline = (
  weekData: WeeklyData,
  systemBaseline: number,
  userOverride?: number
): number => {
  return userOverride !== undefined ? userOverride : systemBaseline;
};

/**
 * Calculate final Sales Latest Forecast from breakdown
 */
export const calculateSalesLatestForecast = (
  baseline: number,
  promo: { kartonware: number; displays: number }
): number => {
  return baseline + promo.kartonware + promo.displays;
};

/**
 * Calculate total from Sales Forecast Breakdown
 */
export const calculateForecastFromBreakdown = (
  breakdown: SalesForecastBreakdown
): number => {
  return breakdown.baseline + breakdown.promo.kartonware + breakdown.promo.displays;
};

/**
 * Calculate sales consumption driver for inventory
 * Uses MAX of forecast and orders in system
 */
export const calculateSalesConsumptionDriver = (
  forecast: number,
  ordersInSystem: number
): number => {
  return Math.max(forecast, ordersInSystem);
};

/**
 * Calculate Procurement PO total
 * Logic: If POs exist (ordered or delivered), use only those; else use forecast
 */
export const calculateProcurementPo = (
  breakdown: ProcurementBreakdown
): number => {
  const hasActualPOs = breakdown.ordered > 0 || breakdown.delivered > 0;
  
  if (hasActualPOs) {
    return breakdown.ordered + breakdown.delivered;
  }
  return breakdown.forecast;
};

/**
 * Calculate Lagerbestand Ende KW
 * Formula: Start - MAX(Forecast, Orders) + Procurement
 */
export const calculateLagerbestandEnde = (
  lagerbestandAnfang: number,
  salesLatestForecast: number,
  salesOrderImSystem: number,
  procurementPo: number
): number => {
  const consumption = Math.max(salesLatestForecast, salesOrderImSystem);
  return lagerbestandAnfang - consumption + procurementPo;
};

/**
 * Calculate Lagerbestand Anfang for next week
 * Simply equals previous week's ending inventory
 */
export const calculateLagerbestandAnfang = (
  previousWeekEnde: number
): number => {
  return previousWeekEnde;
};

/**
 * Recalculate all inventory values starting from a given week
 * Used when user edits affect downstream calculations
 */
export const recalculateInventoryChain = (
  weeklyData: WeeklyData[],
  startIndex: number,
  changes?: Map<string, { field: string; value: number }>
): WeeklyData[] => {
  const result = [...weeklyData];
  
  for (let i = startIndex; i < result.length; i++) {
    const week = result[i];
    const changeKey = `${week.week}`;
    
    // Get effective values (with any user changes applied)
    let forecast = week.salesLatestForecast;
    let procurementPo = week.procurementPo;
    
    if (changes) {
      const forecastChange = changes.get(`${changeKey}-salesLatestForecast`);
      const procurementChange = changes.get(`${changeKey}-procurementPo`);
      
      if (forecastChange) forecast = forecastChange.value;
      if (procurementChange) procurementPo = procurementChange.value;
    }
    
    // Calculate lagerbestandAnfang from previous week (except for first week)
    if (i > 0) {
      result[i] = {
        ...week,
        lagerbestandAnfang: result[i - 1].lagerbestandEnde,
      };
    }
    
    // Calculate lagerbestandEnde
    const lagerbestandEnde = calculateLagerbestandEnde(
      result[i].lagerbestandAnfang,
      forecast,
      week.salesOrderImSystem,
      procurementPo
    );
    
    result[i] = {
      ...result[i],
      lagerbestandEnde,
    };
  }
  
  return result;
};

/**
 * Format number with German/Swiss locale
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('de-CH');
};

/**
 * Format inventory value with color coding info
 */
export const getInventoryDisplayInfo = (value: number): {
  display: string;
  color: 'success.main' | 'error.main' | 'text.primary';
} => {
  const display = formatNumber(value);
  
  if (value > 0) {
    return { display, color: 'success.main' };
  } else if (value < 0) {
    return { display, color: 'error.main' };
  }
  return { display, color: 'text.primary' };
};
