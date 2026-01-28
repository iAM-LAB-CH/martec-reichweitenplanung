import {
  SalesBreakdown,
  ProcurementBreakdown,
  WeeklyData,
  PromoBreakdown,
} from './types';

/**
 * Calculate total promo from promo breakdown
 * @param promo - Promo breakdown with kartonware and displays
 * @returns Total promo value
 */
export function calculatePromoTotal(promo: PromoBreakdown): number {
  return promo.kartonware + promo.displays;
}

/**
 * Calculate Sales Latest Forecast from breakdown
 * Formula: Baseline + Promo (Kartonware + Displays)
 * @param breakdown - Sales breakdown with baseline and promo
 * @returns Calculated forecast total
 */
export function calculateSalesLatestForecast(breakdown: SalesBreakdown): number {
  return breakdown.baseline + calculatePromoTotal(breakdown.promo);
}

/**
 * Calculate total from PO entries
 * @param entries - Array of PO entries
 * @returns Sum of all PO quantities
 */
export function sumPOEntries(entries: { menge: number }[]): number {
  return entries.reduce((sum, entry) => sum + entry.menge, 0);
}

/**
 * Calculate Procurement PO Lieferant value
 * Formula: IF (PO bestellt > 0 OR PO geliefert > 0) THEN sum(POs) ELSE forecast
 * @param breakdown - Procurement breakdown with forecast, bestellt, and geliefert
 * @returns Calculated procurement value
 */
export function calculateProcurementPo(breakdown: ProcurementBreakdown): number {
  const bestelltTotal = sumPOEntries(breakdown.posBestellt);
  const geliefertTotal = sumPOEntries(breakdown.posGeliefert);
  
  // If there are any ordered or delivered POs, use those (ignore forecast)
  if (bestelltTotal > 0 || geliefertTotal > 0) {
    return bestelltTotal + geliefertTotal;
  }
  
  // Otherwise, fall back to forecast
  return breakdown.forecast;
}

/**
 * Calculate Lagerbestand Ende (Inventory End of Week)
 * Formula: Anfang - MAX(Forecast, Orders) + Procurement
 * @param anfang - Inventory at start of week
 * @param forecast - Sales Latest Forecast
 * @param orderImSystem - Sales Order im System
 * @param procurement - Procurement PO value
 * @returns Calculated end inventory
 */
export function calculateLagerbestandEnde(
  anfang: number,
  forecast: number,
  orderImSystem: number,
  procurement: number
): number {
  const salesDeduction = Math.max(forecast, orderImSystem);
  return anfang - salesDeduction + procurement;
}

/**
 * Calculate Lagerbestand Anfang (Inventory Start of Week)
 * Formula: Previous week's Ende
 * @param previousEnde - Previous week's end inventory
 * @returns Start inventory for current week
 */
export function calculateLagerbestandAnfang(previousEnde: number): number {
  return previousEnde;
}

/**
 * Recalculate all derived values in a WeeklyData object
 * Updates: salesLatestForecast, procurementPo, lagerbestandEnde
 * @param data - Weekly data to update
 * @param previousEnde - Previous week's end inventory (for calculating anfang)
 * @returns Updated weekly data
 */
export function recalculateWeeklyData(
  data: WeeklyData,
  previousEnde?: number
): WeeklyData {
  const updated = { ...data };
  
  // Recalculate Sales Latest Forecast from breakdown
  updated.salesLatestForecast = calculateSalesLatestForecast(data.salesForecastBreakdown);
  
  // Recalculate Procurement PO from breakdown
  updated.procurementPo = calculateProcurementPo(data.procurementBreakdown);
  
  // Update Lagerbestand Anfang if previous week's end is provided
  if (previousEnde !== undefined) {
    updated.lagerbestandAnfang = calculateLagerbestandAnfang(previousEnde);
  }
  
  // Recalculate Lagerbestand Ende
  updated.lagerbestandEnde = calculateLagerbestandEnde(
    updated.lagerbestandAnfang,
    updated.salesLatestForecast,
    updated.salesOrderImSystem,
    updated.procurementPo
  );
  
  return updated;
}

/**
 * Recalculate entire weekly data array (propagates changes through weeks)
 * @param weeklyData - Array of weekly data
 * @param startIndex - Index to start recalculation from (default 0)
 * @returns New array with recalculated values
 */
export function recalculateWeeklyDataArray(
  weeklyData: WeeklyData[],
  startIndex: number = 0
): WeeklyData[] {
  const result = [...weeklyData];
  
  for (let i = startIndex; i < result.length; i++) {
    const previousEnde = i > 0 ? result[i - 1].lagerbestandEnde : undefined;
    result[i] = recalculateWeeklyData(result[i], previousEnde);
  }
  
  return result;
}

/**
 * Create a default Sales Breakdown with zero values
 * @param baseline - Baseline value (default 0)
 * @returns SalesBreakdown object
 */
export function createDefaultSalesBreakdown(baseline: number = 0): SalesBreakdown {
  return {
    baseline,
    promo: {
      kartonware: 0,
      displays: 0,
    },
  };
}

/**
 * Create a default Procurement Breakdown with zero values
 * @param forecast - Forecast value (default 0)
 * @param forecastLinked - Whether forecast is linked to a PO (default false)
 * @returns ProcurementBreakdown object
 */
export function createDefaultProcurementBreakdown(
  forecast: number = 0,
  forecastLinked: boolean = false
): ProcurementBreakdown {
  return {
    forecast,
    forecastLinked,
    linkedPoNummer: undefined,
    posBestellt: [],
    posGeliefert: [],
  };
}

/**
 * Calculate adaptive forecast based on available data
 * KW1: Forecast = Budget
 * Subsequent weeks: Forecast adapts based on Sales Order, Actuals, Budget, and manual changes
 * 
 * @param weekNumber - Week number (1-52)
 * @param budget - Sales Budget for the week
 * @param salesOrderImSystem - Sales orders in system
 * @param salesActuals - Actual sales (if available, from past weeks)
 * @param manualOverride - Manual override value (if any)
 * @returns Calculated forecast value
 */
export function calculateAdaptiveForecast(
  weekNumber: number,
  budget: number,
  salesOrderImSystem: number,
  salesActuals: number | undefined,
  manualOverride: number | undefined
): number {
  // If there's a manual override, use it
  if (manualOverride !== undefined) {
    return manualOverride;
  }
  
  // KW1: Forecast equals Budget
  if (weekNumber === 1) {
    return budget;
  }
  
  // Subsequent weeks: Weighted calculation based on available data
  if (salesActuals !== undefined && salesActuals > 0) {
    // If we have actuals, weight them heavily
    return Math.round(salesActuals * 0.6 + salesOrderImSystem * 0.3 + budget * 0.1);
  }
  
  // No actuals available, use orders and budget
  if (salesOrderImSystem > 0) {
    return Math.round(salesOrderImSystem * 0.7 + budget * 0.3);
  }
  
  // Fall back to budget if no other data
  return budget;
}

/**
 * Create default WeeklyData for a given week
 * @param week - Week string (e.g., "KW13")
 * @param year - Year
 * @param lagerbestandAnfang - Starting inventory
 * @returns WeeklyData object with default values
 */
export function createDefaultWeeklyData(
  week: string,
  year: number,
  lagerbestandAnfang: number = 0
): WeeklyData {
  return {
    week,
    year,
    lagerbestandAnfang,
    salesBudget: 0,
    salesBudgetBreakdown: createDefaultSalesBreakdown(),
    salesLatestForecast: 0,
    salesForecastBreakdown: createDefaultSalesBreakdown(),
    salesOrderImSystem: 0,
    salesActuals: undefined,
    procurementPo: 0,
    procurementBreakdown: createDefaultProcurementBreakdown(),
    dailyProcurement: undefined,
    lagerbestandEnde: lagerbestandAnfang, // Will be recalculated
  };
}
