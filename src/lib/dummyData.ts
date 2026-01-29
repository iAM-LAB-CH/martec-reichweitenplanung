import { 
  Article, 
  WeeklyData, 
  SalesBudgetBreakdown, 
  SalesForecastBreakdown, 
  ProcurementBreakdown,
  DailyProcurement 
} from './types';
import { calculateLagerbestandEnde, calculateProcurementPo } from './calculations';

/**
 * Generate breakdown for sales budget
 * Baseline ~70-80%, Promo split between kartonware and displays
 */
function generateSalesBudgetBreakdown(total: number): SalesBudgetBreakdown {
  const baselineRatio = 0.7 + Math.random() * 0.1;
  const baseline = Math.round(total * baselineRatio);
  const promo = total - baseline;
  const kartonwareRatio = 0.6 + Math.random() * 0.2;
  
  return {
    baseline,
    promo: {
      kartonware: Math.round(promo * kartonwareRatio),
      displays: promo - Math.round(promo * kartonwareRatio),
    },
  };
}

/**
 * Generate breakdown for sales forecast
 * Similar structure to budget but with slight variations
 */
function generateSalesForecastBreakdown(total: number, budgetBreakdown?: SalesBudgetBreakdown): SalesForecastBreakdown {
  // Base forecast on budget breakdown if available, with some variation
  if (budgetBreakdown) {
    const factor = 0.9 + Math.random() * 0.2; // 90-110% of budget
    return {
      baseline: Math.round(budgetBreakdown.baseline * factor),
      promo: {
        kartonware: Math.round(budgetBreakdown.promo.kartonware * factor),
        displays: Math.round(budgetBreakdown.promo.displays * factor),
      },
    };
  }
  
  // Fallback to generating fresh breakdown
  const baselineRatio = 0.7 + Math.random() * 0.1;
  const baseline = Math.round(total * baselineRatio);
  const promo = total - baseline;
  const kartonwareRatio = 0.6 + Math.random() * 0.2;
  
  return {
    baseline,
    promo: {
      kartonware: Math.round(promo * kartonwareRatio),
      displays: promo - Math.round(promo * kartonwareRatio),
    },
  };
}

/**
 * Generate procurement breakdown
 */
function generateProcurementBreakdown(total: number, isPast: boolean, hasOrders: boolean): ProcurementBreakdown {
  if (isPast) {
    // Past weeks: all delivered
    return {
      forecast: 0,
      ordered: 0,
      delivered: total,
    };
  }
  
  if (hasOrders && total > 0) {
    // Has actual POs
    const orderedRatio = Math.random() > 0.5 ? 1 : 0.5;
    return {
      forecast: 0,
      ordered: Math.round(total * orderedRatio),
      delivered: Math.round(total * (1 - orderedRatio)),
    };
  }
  
  // Future without orders: use forecast
  return {
    forecast: total,
    ordered: 0,
    delivered: 0,
  };
}

/**
 * Generate daily procurement breakdown (Mo-Fr)
 */
function generateDailyProcurement(weekTotal: number): DailyProcurement {
  // Distribute across weekdays with some variance
  const weights = [0.2, 0.2, 0.3, 0.2, 0.1]; // More mid-week
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  return {
    mo: Math.round(weekTotal * (weights[0] / totalWeight)),
    di: Math.round(weekTotal * (weights[1] / totalWeight)),
    mi: Math.round(weekTotal * (weights[2] / totalWeight)),
    do: Math.round(weekTotal * (weights[3] / totalWeight)),
    fr: Math.round(weekTotal * (weights[4] / totalWeight)),
  };
}

/**
 * Generate full year of weekly data (KW1-KW52) from base data
 * 
 * Formula relationships:
 * - lagerbestandAnfang[week] = lagerbestandEnde[week-1]
 * - salesLatestForecast = baseline + promo.kartonware + promo.displays
 * - lagerbestandEnde[week] = lagerbestandAnfang - MAX(salesLatestForecast, salesOrderImSystem) + procurementPo
 */
function generateFullYearWeeklyData(
  baseData: { 
    week: string; 
    lagerbestand: number; 
    forecast: number; 
    orders: number; 
    budget: number;
  }[],
  currentWeek: number = 13
): WeeklyData[] {
  // Create a map of existing weeks for quick lookup
  const existingWeeks = new Map<number, typeof baseData[0]>();
  baseData.forEach((d) => {
    const weekNum = parseInt(d.week.replace('KW', ''));
    existingWeeks.set(weekNum, d);
  });

  // Find the range of existing data
  const existingWeekNums = Array.from(existingWeeks.keys()).sort((a, b) => a - b);
  const firstExistingWeek = existingWeekNums[0];
  const lastExistingWeek = existingWeekNums[existingWeekNums.length - 1];

  // Get first data point for extrapolation reference
  const firstData = existingWeeks.get(firstExistingWeek)!;

  // Calculate average forecast for extrapolation
  const nonZeroForecasts = baseData.filter(d => d.forecast > 0).map(d => d.forecast);
  const avgForecast = nonZeroForecasts.length > 0 
    ? Math.round(nonZeroForecasts.reduce((sum, v) => sum + v, 0) / nonZeroForecasts.length)
    : 1000;
  
  // Build the full year array
  const result: WeeklyData[] = [];

  // First pass: Set up all weeks with existing data or placeholders
  for (let week = 1; week <= 52; week++) {
    const isPast = week < currentWeek;
    const isCurrent = week === currentWeek;
    
    if (existingWeeks.has(week)) {
      const data = existingWeeks.get(week)!;
      const salesBudget = data.budget || Math.round(data.forecast * 1.15);
      const salesBudgetBreakdown = generateSalesBudgetBreakdown(salesBudget);
      const salesForecastBreakdown = generateSalesForecastBreakdown(data.forecast, salesBudgetBreakdown);
      const procurementBreakdown = generateProcurementBreakdown(data.orders, isPast, data.orders > 0);
      
      result.push({
        week: `KW${week}`,
        lagerbestandAnfang: data.lagerbestand,
        salesBudget,
        salesBudgetBreakdown,
        salesLatestForecast: data.forecast,
        salesForecastBreakdown,
        salesOrderImSystem: Math.round(data.forecast * 0.3), // ~30% of forecast as orders
        salesActuals: isPast ? Math.round(data.forecast * (0.9 + Math.random() * 0.2)) : undefined,
        procurementPo: data.orders,
        procurementBreakdown,
        procurementDaily: generateDailyProcurement(data.orders),
        lagerbestandEnde: 0, // Will be calculated
      });
    } else {
      result.push({
        week: `KW${week}`,
        lagerbestandAnfang: 0,
        salesBudget: 0,
        salesLatestForecast: 0,
        salesOrderImSystem: 0,
        salesActuals: isPast ? 0 : undefined,
        procurementPo: 0,
        lagerbestandEnde: 0,
      });
    }
  }

  // Second pass: Calculate values for weeks BEFORE existing data (backwards)
  for (let week = firstExistingWeek - 1; week >= 1; week--) {
    const isPast = week < currentWeek;
    const forecast = Math.round(avgForecast * 0.8);
    const salesBudget = Math.round(forecast * 1.15);
    const salesBudgetBreakdown = generateSalesBudgetBreakdown(salesBudget);
    const salesForecastBreakdown = generateSalesForecastBreakdown(forecast, salesBudgetBreakdown);
    
    // Maintain a reasonable stock level before the critical period
    const lagerbestand = firstData.lagerbestand + (firstExistingWeek - week) * Math.round(avgForecast * 0.3);
    const orders = 0;
    const procurementBreakdown = generateProcurementBreakdown(orders, isPast, false);
    
    result[week - 1] = {
      week: `KW${week}`,
      lagerbestandAnfang: Math.round(lagerbestand),
      salesBudget,
      salesBudgetBreakdown,
      salesLatestForecast: forecast,
      salesForecastBreakdown,
      salesOrderImSystem: Math.round(forecast * 0.3),
      salesActuals: isPast ? Math.round(forecast * (0.9 + Math.random() * 0.2)) : undefined,
      procurementPo: orders,
      procurementBreakdown,
      procurementDaily: generateDailyProcurement(orders),
      lagerbestandEnde: 0,
    };
  }

  // Third pass: Calculate values for weeks AFTER existing data (forwards)
  for (let week = lastExistingWeek + 1; week <= 52; week++) {
    const isPast = week < currentWeek;
    const forecast = Math.round(avgForecast * 0.7);
    const salesBudget = Math.round(forecast * 1.15);
    const salesBudgetBreakdown = generateSalesBudgetBreakdown(salesBudget);
    const salesForecastBreakdown = generateSalesForecastBreakdown(forecast, salesBudgetBreakdown);
    const orders = 0;
    const procurementBreakdown = generateProcurementBreakdown(orders, isPast, false);
    
    result[week - 1] = {
      week: `KW${week}`,
      lagerbestandAnfang: 0, // Will be calculated in next pass
      salesBudget,
      salesBudgetBreakdown,
      salesLatestForecast: forecast,
      salesForecastBreakdown,
      salesOrderImSystem: Math.round(forecast * 0.3),
      salesActuals: isPast ? Math.round(forecast * (0.9 + Math.random() * 0.2)) : undefined,
      procurementPo: orders,
      procurementBreakdown,
      procurementDaily: generateDailyProcurement(orders),
      lagerbestandEnde: 0,
    };
  }

  // Fourth pass: Calculate lagerbestandEnde for all weeks (forward chain)
  // Also add procurement when inventory would go negative
  const minSafetyStock = 100; // Minimum stock level before procurement triggers
  
  for (let i = 0; i < result.length; i++) {
    // For weeks after the first, set lagerbestandAnfang from previous week's Ende
    if (i > 0) {
      result[i].lagerbestandAnfang = result[i - 1].lagerbestandEnde;
    }
    
    // Calculate what inventory would be without additional procurement
    const consumption = Math.max(result[i].salesLatestForecast, result[i].salesOrderImSystem);
    let projectedEnde = result[i].lagerbestandAnfang - consumption + result[i].procurementPo;
    
    // If projected inventory is too low or negative, add procurement
    if (projectedEnde < minSafetyStock && result[i].procurementPo === 0) {
      // Calculate how much procurement is needed to get back to a healthy level
      const shortfall = minSafetyStock - projectedEnde;
      const procurementNeeded = Math.ceil((shortfall + consumption * 2) / 1000) * 1000; // Round up to nearest 1000
      
      result[i].procurementPo = procurementNeeded;
      result[i].procurementBreakdown = generateProcurementBreakdown(procurementNeeded, i < currentWeek - 1, true);
      result[i].procurementDaily = generateDailyProcurement(procurementNeeded);
      
      projectedEnde = result[i].lagerbestandAnfang - consumption + result[i].procurementPo;
    }
    
    // Calculate final lagerbestandEnde (ensure it doesn't go below 0)
    result[i].lagerbestandEnde = Math.max(0, calculateLagerbestandEnde(
      result[i].lagerbestandAnfang,
      result[i].salesLatestForecast,
      result[i].salesOrderImSystem,
      result[i].procurementPo
    ));
  }

  return result;
}

// Raw article data with limited weeks - using original structure for backward compatibility
// Key principle: When inventory approaches 0, procurement (forecast/ordered/delivered) kicks in
// to replenish stock - inventory should never go negative
const rawArticles: {
  id: string;
  artikelNr: string;
  bezeichnung: string;
  status: 'kritisch' | 'planen' | 'beobachten';
  oosIn: string;
  lagerDelta: number;
  bestellenBis: string;
  bestellvorschlag: { einheiten: number; bestellfrist: string };
  artikelDetails: {
    mindestbestellmenge: number;
    lieferzeit: string;
    bestellfrist: string;
    erschoepfungsprognose: string;
    mindesthaltbarkeit: string;
    einheitenProPalett: number;
    lagerkostenProEinheit: number;
  };
  weeklyData: { week: string; lagerbestand: number; forecast: number; orders: number; lagerDelta: number; budget: number }[];
  orders: {
    einkauf: { poNummer: string; status: string; menge: number; lieferwoche: string; lieferdatum: string; lieferant: string }[];
    verkauf: { poNummer: string; status: string; menge: number; lieferwoche: string; lieferdatum: string; lieferant: string }[];
  };
}[] = [
  // CRITICAL: Battery-Pack - Gets very low, needs urgent procurement forecast
  // Inventory drops to critical level (200), system proposes 8000 procurement to recover
  {
    id: '1',
    artikelNr: '1204912094',
    bezeichnung: 'Battery-Pack',
    status: 'kritisch',
    oosIn: 'KW17',
    lagerDelta: 200,
    bestellenBis: 'KW13',
    bestellvorschlag: {
      einheiten: 8000,
      bestellfrist: '23.05.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 2000,
      lieferzeit: '2 Wochen',
      bestellfrist: '23.05.2026',
      erschoepfungsprognose: '12.06.2026',
      mindesthaltbarkeit: '12.10.2028',
      einheitenProPalett: 800,
      lagerkostenProEinheit: 0.25,
    },
    weeklyData: [
      // Inventory declining rapidly - big demand spike coming in KW17
      { week: 'KW13', lagerbestand: 5000, forecast: 1000, orders: 0, lagerDelta: 4000, budget: 1200 },
      { week: 'KW14', lagerbestand: 4000, forecast: 1200, orders: 0, lagerDelta: 2800, budget: 1400 },
      { week: 'KW15', lagerbestand: 2800, forecast: 1100, orders: 0, lagerDelta: 1700, budget: 1300 },
      { week: 'KW16', lagerbestand: 1700, forecast: 1500, orders: 0, lagerDelta: 200, budget: 1700 },
      // KW17: Very low stock, procurement forecast proposed to prevent OOS
      { week: 'KW17', lagerbestand: 200, forecast: 2000, orders: 8000, lagerDelta: -1800, budget: 2300 },
      { week: 'KW18', lagerbestand: 6200, forecast: 1800, orders: 0, lagerDelta: 4400, budget: 2100 },
      { week: 'KW19', lagerbestand: 4400, forecast: 1500, orders: 0, lagerDelta: 2900, budget: 1700 },
      { week: 'KW20', lagerbestand: 2900, forecast: 1400, orders: 0, lagerDelta: 1500, budget: 1600 },
      { week: 'KW21', lagerbestand: 1500, forecast: 1200, orders: 4000, lagerDelta: 300, budget: 1400 },
    ],
    orders: {
      einkauf: [
        { poNummer: '1242543', status: 'Bestätigt', menge: 8000, lieferwoche: 'KW 17', lieferdatum: '21.04.2026', lieferant: 'Planzer' },
        { poNummer: '34672342', status: 'Geplant', menge: 4000, lieferwoche: 'KW 21', lieferdatum: '19.05.2026', lieferant: 'Planzer' },
      ],
      verkauf: [
        { poNummer: 'SO-001234', status: 'Bestätigt', menge: 500, lieferwoche: 'KW 18', lieferdatum: '02.05.2026', lieferant: 'Kunde A' },
        { poNummer: 'SO-001235', status: 'Offen', menge: 1200, lieferwoche: 'KW 19', lieferdatum: '09.05.2026', lieferant: 'Kunde B' },
      ],
    },
  },
  // CRITICAL: Baumnussöl - Declining, needs action soon
  // Inventory gets close to zero in KW16, procurement forecast kicks in
  {
    id: '2',
    artikelNr: '235324523',
    bezeichnung: 'Baumnussöl',
    status: 'kritisch',
    oosIn: 'KW16',
    lagerDelta: 300,
    bestellenBis: 'KW13',
    bestellvorschlag: {
      einheiten: 8000,
      bestellfrist: '20.05.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 5000,
      lieferzeit: '3 Wochen',
      bestellfrist: '20.05.2026',
      erschoepfungsprognose: '18.06.2026',
      mindesthaltbarkeit: '15.08.2027',
      einheitenProPalett: 400,
      lagerkostenProEinheit: 0.18,
    },
    weeklyData: [
      { week: 'KW13', lagerbestand: 8000, forecast: 2500, orders: 0, lagerDelta: 5500, budget: 2900 },
      { week: 'KW14', lagerbestand: 5500, forecast: 2700, orders: 0, lagerDelta: 2800, budget: 3100 },
      { week: 'KW15', lagerbestand: 2800, forecast: 2500, orders: 0, lagerDelta: 300, budget: 2900 },
      // KW16: Low stock - procurement forecast kicks in
      { week: 'KW16', lagerbestand: 300, forecast: 2600, orders: 8000, lagerDelta: -2300, budget: 3000 },
      { week: 'KW17', lagerbestand: 5700, forecast: 2400, orders: 0, lagerDelta: 3300, budget: 2800 },
      { week: 'KW18', lagerbestand: 3300, forecast: 2500, orders: 0, lagerDelta: 800, budget: 2900 },
      { week: 'KW19', lagerbestand: 800, forecast: 2300, orders: 6000, lagerDelta: -1500, budget: 2700 },
      { week: 'KW20', lagerbestand: 4500, forecast: 2200, orders: 0, lagerDelta: 2300, budget: 2500 },
      { week: 'KW21', lagerbestand: 2300, forecast: 2000, orders: 0, lagerDelta: 300, budget: 2300 },
    ],
    orders: {
      einkauf: [
        { poNummer: '8834521', status: 'Bestätigt', menge: 8000, lieferwoche: 'KW 16', lieferdatum: '15.04.2026', lieferant: 'Ölwerk GmbH' },
        { poNummer: '8834522', status: 'Geplant', menge: 6000, lieferwoche: 'KW 19', lieferdatum: '06.05.2026', lieferant: 'Ölwerk GmbH' },
      ],
      verkauf: [
        { poNummer: 'SO-002341', status: 'Bestätigt', menge: 2000, lieferwoche: 'KW 16', lieferdatum: '18.04.2026', lieferant: 'Großhandel X' },
      ],
    },
  },
  // PLANNING: Sonnencreme - Seasonal product, stock getting low but PO on the way
  {
    id: '3',
    artikelNr: '1024501925',
    bezeichnung: 'Sonnencreme',
    status: 'planen',
    oosIn: 'KW18',
    lagerDelta: 500,
    bestellenBis: 'KW15',
    bestellvorschlag: {
      einheiten: 5000,
      bestellfrist: '10.06.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 1000,
      lieferzeit: '2 Wochen',
      bestellfrist: '10.06.2026',
      erschoepfungsprognose: '25.06.2026',
      mindesthaltbarkeit: '01.06.2028',
      einheitenProPalett: 600,
      lagerkostenProEinheit: 0.12,
    },
    weeklyData: [
      { week: 'KW13', lagerbestand: 4500, forecast: 800, orders: 0, lagerDelta: 3700, budget: 900 },
      { week: 'KW14', lagerbestand: 3700, forecast: 1000, orders: 0, lagerDelta: 2700, budget: 1200 },
      { week: 'KW15', lagerbestand: 2700, forecast: 1200, orders: 0, lagerDelta: 1500, budget: 1400 },
      { week: 'KW16', lagerbestand: 1500, forecast: 1400, orders: 0, lagerDelta: 100, budget: 1600 },
      // KW17: Getting very low, PO arriving just in time
      { week: 'KW17', lagerbestand: 100, forecast: 1600, orders: 5000, lagerDelta: -1500, budget: 1800 },
      { week: 'KW18', lagerbestand: 3500, forecast: 1800, orders: 0, lagerDelta: 1700, budget: 2100 },
      { week: 'KW19', lagerbestand: 1700, forecast: 1600, orders: 0, lagerDelta: 100, budget: 1800 },
      { week: 'KW20', lagerbestand: 100, forecast: 1500, orders: 5000, lagerDelta: -1400, budget: 1700 },
      { week: 'KW21', lagerbestand: 3600, forecast: 1400, orders: 0, lagerDelta: 2200, budget: 1600 },
    ],
    orders: {
      einkauf: [
        { poNummer: '7712345', status: 'Bestätigt', menge: 5000, lieferwoche: 'KW 17', lieferdatum: '22.04.2026', lieferant: 'Cosmetics AG' },
        { poNummer: '7712346', status: 'Geplant', menge: 5000, lieferwoche: 'KW 20', lieferdatum: '13.05.2026', lieferant: 'Cosmetics AG' },
      ],
      verkauf: [
        { poNummer: 'SO-003456', status: 'Offen', menge: 800, lieferwoche: 'KW 18', lieferdatum: '01.05.2026', lieferant: 'Drogerie M' },
      ],
    },
  },
  // PLANNING: Duschgel - Tight margins, regular replenishment needed
  {
    id: '4',
    artikelNr: '132523523',
    bezeichnung: 'Duschgel',
    status: 'planen',
    oosIn: 'KW17',
    lagerDelta: 400,
    bestellenBis: 'KW14',
    bestellvorschlag: {
      einheiten: 3000,
      bestellfrist: '15.06.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 1500,
      lieferzeit: '2 Wochen',
      bestellfrist: '15.06.2026',
      erschoepfungsprognose: '01.07.2026',
      mindesthaltbarkeit: '15.12.2027',
      einheitenProPalett: 500,
      lagerkostenProEinheit: 0.10,
    },
    weeklyData: [
      { week: 'KW13', lagerbestand: 3000, forecast: 1200, orders: 0, lagerDelta: 1800, budget: 1400 },
      { week: 'KW14', lagerbestand: 1800, forecast: 1300, orders: 0, lagerDelta: 500, budget: 1500 },
      { week: 'KW15', lagerbestand: 500, forecast: 1200, orders: 3000, lagerDelta: -700, budget: 1400 },
      { week: 'KW16', lagerbestand: 2300, forecast: 1100, orders: 0, lagerDelta: 1200, budget: 1300 },
      { week: 'KW17', lagerbestand: 1200, forecast: 1200, orders: 0, lagerDelta: 0, budget: 1400 },
      { week: 'KW18', lagerbestand: 0, forecast: 1100, orders: 3000, lagerDelta: -1100, budget: 1300 },
      { week: 'KW19', lagerbestand: 1900, forecast: 1000, orders: 0, lagerDelta: 900, budget: 1200 },
      { week: 'KW20', lagerbestand: 900, forecast: 1000, orders: 0, lagerDelta: -100, budget: 1200 },
      { week: 'KW21', lagerbestand: -100, forecast: 900, orders: 3000, lagerDelta: -1000, budget: 1000 },
    ],
    orders: {
      einkauf: [
        { poNummer: '4412345', status: 'Bestätigt', menge: 3000, lieferwoche: 'KW 15', lieferdatum: '08.04.2026', lieferant: 'CleanCo' },
        { poNummer: '4412346', status: 'Bestätigt', menge: 3000, lieferwoche: 'KW 18', lieferdatum: '29.04.2026', lieferant: 'CleanCo' },
        { poNummer: '4412347', status: 'Geplant', menge: 3000, lieferwoche: 'KW 21', lieferdatum: '20.05.2026', lieferant: 'CleanCo' },
      ],
      verkauf: [
        { poNummer: 'SO-004567', status: 'Bestätigt', menge: 400, lieferwoche: 'KW 17', lieferdatum: '24.04.2026', lieferant: 'Retail Store' },
      ],
    },
  },
  // OBSERVE: Shampoo Premium - Healthy sawtooth pattern, well managed
  {
    id: '5',
    artikelNr: '998877665',
    bezeichnung: 'Shampoo Premium',
    status: 'beobachten',
    oosIn: 'KW40',
    lagerDelta: 2500,
    bestellenBis: 'KW38',
    bestellvorschlag: {
      einheiten: 2500,
      bestellfrist: '20.06.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 1000,
      lieferzeit: '10 Tage',
      bestellfrist: '20.06.2026',
      erschoepfungsprognose: '10.07.2026',
      mindesthaltbarkeit: '01.03.2028',
      einheitenProPalett: 700,
      lagerkostenProEinheit: 0.14,
    },
    weeklyData: [
      { week: 'KW13', lagerbestand: 3000, forecast: 1200, orders: 0, lagerDelta: 1800, budget: 1400 },
      { week: 'KW14', lagerbestand: 1800, forecast: 1300, orders: 2500, lagerDelta: 500, budget: 1500 },
      { week: 'KW15', lagerbestand: 3000, forecast: 1200, orders: 0, lagerDelta: 1800, budget: 1400 },
      { week: 'KW16', lagerbestand: 1800, forecast: 1300, orders: 0, lagerDelta: 500, budget: 1500 },
      { week: 'KW17', lagerbestand: 500, forecast: 1200, orders: 3000, lagerDelta: -700, budget: 1400 },
      { week: 'KW18', lagerbestand: 2300, forecast: 1100, orders: 0, lagerDelta: 1200, budget: 1300 },
      { week: 'KW19', lagerbestand: 1200, forecast: 1200, orders: 2500, lagerDelta: 0, budget: 1400 },
      { week: 'KW20', lagerbestand: 2500, forecast: 1300, orders: 0, lagerDelta: 1200, budget: 1500 },
      { week: 'KW21', lagerbestand: 1200, forecast: 1200, orders: 2500, lagerDelta: 0, budget: 1400 },
    ],
    orders: {
      einkauf: [
        { poNummer: '5512345', status: 'Abgeschlossen', menge: 2500, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'HairCare Inc' },
        { poNummer: '5512346', status: 'Bestätigt', menge: 3000, lieferwoche: 'KW 17', lieferdatum: '22.04.2026', lieferant: 'HairCare Inc' },
        { poNummer: '5512347', status: 'Geplant', menge: 2500, lieferwoche: 'KW 19', lieferdatum: '06.05.2026', lieferant: 'HairCare Inc' },
        { poNummer: '5512348', status: 'Geplant', menge: 2500, lieferwoche: 'KW 21', lieferdatum: '20.05.2026', lieferant: 'HairCare Inc' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Handcreme Bio - Always well stocked
  {
    id: '6',
    artikelNr: '445566778',
    bezeichnung: 'Handcreme Bio',
    status: 'beobachten',
    oosIn: 'KW52',
    lagerDelta: 4000,
    bestellenBis: 'KW50',
    bestellvorschlag: {
      einheiten: 2500,
      bestellfrist: '25.06.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 2000,
      lieferzeit: '2 Wochen',
      bestellfrist: '25.06.2026',
      erschoepfungsprognose: '15.07.2026',
      mindesthaltbarkeit: '30.09.2027',
      einheitenProPalett: 350,
      lagerkostenProEinheit: 0.22,
    },
    weeklyData: [
      { week: 'KW13', lagerbestand: 5000, forecast: 800, orders: 0, lagerDelta: 4200, budget: 900 },
      { week: 'KW14', lagerbestand: 4200, forecast: 900, orders: 3000, lagerDelta: 3300, budget: 1000 },
      { week: 'KW15', lagerbestand: 6300, forecast: 850, orders: 0, lagerDelta: 5450, budget: 950 },
      { week: 'KW16', lagerbestand: 5450, forecast: 900, orders: 0, lagerDelta: 4550, budget: 1000 },
      { week: 'KW17', lagerbestand: 4550, forecast: 950, orders: 3000, lagerDelta: 3600, budget: 1100 },
      { week: 'KW18', lagerbestand: 6600, forecast: 900, orders: 0, lagerDelta: 5700, budget: 1000 },
      { week: 'KW19', lagerbestand: 5700, forecast: 850, orders: 0, lagerDelta: 4850, budget: 950 },
      { week: 'KW20', lagerbestand: 4850, forecast: 900, orders: 3000, lagerDelta: 3950, budget: 1000 },
      { week: 'KW21', lagerbestand: 6950, forecast: 950, orders: 0, lagerDelta: 6000, budget: 1100 },
    ],
    orders: {
      einkauf: [
        { poNummer: '6612345', status: 'Abgeschlossen', menge: 3000, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'BioCare GmbH' },
        { poNummer: '6612346', status: 'Bestätigt', menge: 3000, lieferwoche: 'KW 17', lieferdatum: '22.04.2026', lieferant: 'BioCare GmbH' },
        { poNummer: '6612347', status: 'Geplant', menge: 3000, lieferwoche: 'KW 20', lieferdatum: '13.05.2026', lieferant: 'BioCare GmbH' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Bodylotion - Sawtooth pattern, replenishment when stock low
  {
    id: '7',
    artikelNr: '112233445',
    bezeichnung: 'Bodylotion',
    status: 'beobachten',
    oosIn: 'KW35',
    lagerDelta: 1500,
    bestellenBis: 'KW33',
    bestellvorschlag: {
      einheiten: 2500,
      bestellfrist: '12.06.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 1500,
      lieferzeit: '12 Tage',
      bestellfrist: '12.06.2026',
      erschoepfungsprognose: '28.06.2026',
      mindesthaltbarkeit: '15.11.2027',
      einheitenProPalett: 450,
      lagerkostenProEinheit: 0.16,
    },
    weeklyData: [
      { week: 'KW13', lagerbestand: 4000, forecast: 1000, orders: 0, lagerDelta: 3000, budget: 1200 },
      { week: 'KW14', lagerbestand: 3000, forecast: 1100, orders: 0, lagerDelta: 1900, budget: 1300 },
      { week: 'KW15', lagerbestand: 1900, forecast: 1200, orders: 2500, lagerDelta: 700, budget: 1400 },
      { week: 'KW16', lagerbestand: 3200, forecast: 1100, orders: 0, lagerDelta: 2100, budget: 1300 },
      { week: 'KW17', lagerbestand: 2100, forecast: 1000, orders: 0, lagerDelta: 1100, budget: 1200 },
      { week: 'KW18', lagerbestand: 1100, forecast: 1100, orders: 2500, lagerDelta: 0, budget: 1300 },
      { week: 'KW19', lagerbestand: 2500, forecast: 1000, orders: 0, lagerDelta: 1500, budget: 1200 },
      { week: 'KW20', lagerbestand: 1500, forecast: 1100, orders: 0, lagerDelta: 400, budget: 1300 },
      { week: 'KW21', lagerbestand: 400, forecast: 1000, orders: 2500, lagerDelta: -600, budget: 1200 },
    ],
    orders: {
      einkauf: [
        { poNummer: '7712340', status: 'Abgeschlossen', menge: 2500, lieferwoche: 'KW 15', lieferdatum: '08.04.2026', lieferant: 'BodyCare Ltd' },
        { poNummer: '7712341', status: 'Bestätigt', menge: 2500, lieferwoche: 'KW 18', lieferdatum: '29.04.2026', lieferant: 'BodyCare Ltd' },
        { poNummer: '7712342', status: 'Geplant', menge: 2500, lieferwoche: 'KW 21', lieferdatum: '20.05.2026', lieferant: 'BodyCare Ltd' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Zahnpasta Mint - Well stocked, regular replenishment
  {
    id: '8',
    artikelNr: '667788990',
    bezeichnung: 'Zahnpasta Mint',
    status: 'beobachten',
    oosIn: 'KW52',
    lagerDelta: 8000,
    bestellenBis: 'KW50',
    bestellvorschlag: {
      einheiten: 5000,
      bestellfrist: '14.06.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 2500,
      lieferzeit: '1 Woche',
      bestellfrist: '14.06.2026',
      erschoepfungsprognose: '30.06.2026',
      mindesthaltbarkeit: '01.01.2029',
      einheitenProPalett: 1000,
      lagerkostenProEinheit: 0.08,
    },
    weeklyData: [
      { week: 'KW13', lagerbestand: 8000, forecast: 1500, orders: 0, lagerDelta: 6500, budget: 1700 },
      { week: 'KW14', lagerbestand: 6500, forecast: 1600, orders: 5000, lagerDelta: 4900, budget: 1800 },
      { week: 'KW15', lagerbestand: 9900, forecast: 1500, orders: 0, lagerDelta: 8400, budget: 1700 },
      { week: 'KW16', lagerbestand: 8400, forecast: 1600, orders: 0, lagerDelta: 6800, budget: 1800 },
      { week: 'KW17', lagerbestand: 6800, forecast: 1700, orders: 5000, lagerDelta: 5100, budget: 1900 },
      { week: 'KW18', lagerbestand: 10100, forecast: 1600, orders: 0, lagerDelta: 8500, budget: 1800 },
      { week: 'KW19', lagerbestand: 8500, forecast: 1500, orders: 0, lagerDelta: 7000, budget: 1700 },
      { week: 'KW20', lagerbestand: 7000, forecast: 1600, orders: 5000, lagerDelta: 5400, budget: 1800 },
      { week: 'KW21', lagerbestand: 10400, forecast: 1700, orders: 0, lagerDelta: 8700, budget: 1900 },
    ],
    orders: {
      einkauf: [
        { poNummer: '8812345', status: 'Abgeschlossen', menge: 5000, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'DentalCo' },
        { poNummer: '8812346', status: 'Bestätigt', menge: 5000, lieferwoche: 'KW 17', lieferdatum: '22.04.2026', lieferant: 'DentalCo' },
        { poNummer: '8812347', status: 'Geplant', menge: 5000, lieferwoche: 'KW 20', lieferdatum: '13.05.2026', lieferant: 'DentalCo' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Rasiergel - Tight margins but well managed with frequent orders
  {
    id: '9',
    artikelNr: '334455667',
    bezeichnung: 'Rasiergel',
    status: 'beobachten',
    oosIn: 'KW35',
    lagerDelta: 400,
    bestellenBis: 'KW33',
    bestellvorschlag: {
      einheiten: 1000,
      bestellfrist: '16.06.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 1000,
      lieferzeit: '8 Tage',
      bestellfrist: '16.06.2026',
      erschoepfungsprognose: '02.07.2026',
      mindesthaltbarkeit: '20.05.2028',
      einheitenProPalett: 300,
      lagerkostenProEinheit: 0.20,
    },
    weeklyData: [
      { week: 'KW13', lagerbestand: 1500, forecast: 500, orders: 0, lagerDelta: 1000, budget: 580 },
      { week: 'KW14', lagerbestand: 1000, forecast: 550, orders: 1000, lagerDelta: 450, budget: 630 },
      { week: 'KW15', lagerbestand: 1450, forecast: 500, orders: 0, lagerDelta: 950, budget: 580 },
      { week: 'KW16', lagerbestand: 950, forecast: 550, orders: 0, lagerDelta: 400, budget: 630 },
      { week: 'KW17', lagerbestand: 400, forecast: 500, orders: 1000, lagerDelta: -100, budget: 580 },
      { week: 'KW18', lagerbestand: 900, forecast: 450, orders: 0, lagerDelta: 450, budget: 520 },
      { week: 'KW19', lagerbestand: 450, forecast: 500, orders: 1000, lagerDelta: -50, budget: 580 },
      { week: 'KW20', lagerbestand: 950, forecast: 550, orders: 0, lagerDelta: 400, budget: 630 },
      { week: 'KW21', lagerbestand: 400, forecast: 500, orders: 1000, lagerDelta: -100, budget: 580 },
    ],
    orders: {
      einkauf: [
        { poNummer: '9912345', status: 'Abgeschlossen', menge: 1000, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'ShaveCo' },
        { poNummer: '9912346', status: 'Bestätigt', menge: 1000, lieferwoche: 'KW 17', lieferdatum: '22.04.2026', lieferant: 'ShaveCo' },
        { poNummer: '9912347', status: 'Geplant', menge: 1000, lieferwoche: 'KW 19', lieferdatum: '06.05.2026', lieferant: 'ShaveCo' },
        { poNummer: '9912348', status: 'Geplant', menge: 1000, lieferwoche: 'KW 21', lieferdatum: '20.05.2026', lieferant: 'ShaveCo' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Deodorant Sport - Healthy levels with regular replenishment
  {
    id: '10',
    artikelNr: '889900112',
    bezeichnung: 'Deodorant Sport',
    status: 'beobachten',
    oosIn: 'KW52',
    lagerDelta: 3500,
    bestellenBis: 'KW50',
    bestellvorschlag: {
      einheiten: 2500,
      bestellfrist: '18.06.2026',
    },
    artikelDetails: {
      mindestbestellmenge: 2000,
      lieferzeit: '10 Tage',
      bestellfrist: '18.06.2026',
      erschoepfungsprognose: '05.07.2026',
      mindesthaltbarkeit: '10.08.2028',
      einheitenProPalett: 550,
      lagerkostenProEinheit: 0.13,
    },
    weeklyData: [
      { week: 'KW13', lagerbestand: 4000, forecast: 900, orders: 0, lagerDelta: 3100, budget: 1000 },
      { week: 'KW14', lagerbestand: 3100, forecast: 1000, orders: 2500, lagerDelta: 2100, budget: 1150 },
      { week: 'KW15', lagerbestand: 4600, forecast: 950, orders: 0, lagerDelta: 3650, budget: 1100 },
      { week: 'KW16', lagerbestand: 3650, forecast: 1000, orders: 0, lagerDelta: 2650, budget: 1150 },
      { week: 'KW17', lagerbestand: 2650, forecast: 1050, orders: 2500, lagerDelta: 1600, budget: 1200 },
      { week: 'KW18', lagerbestand: 4100, forecast: 1000, orders: 0, lagerDelta: 3100, budget: 1150 },
      { week: 'KW19', lagerbestand: 3100, forecast: 950, orders: 0, lagerDelta: 2150, budget: 1100 },
      { week: 'KW20', lagerbestand: 2150, forecast: 1000, orders: 2500, lagerDelta: 1150, budget: 1150 },
      { week: 'KW21', lagerbestand: 3650, forecast: 1050, orders: 0, lagerDelta: 2600, budget: 1200 },
    ],
    orders: {
      einkauf: [
        { poNummer: '1012345', status: 'Abgeschlossen', menge: 2500, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'FreshCo' },
        { poNummer: '1012346', status: 'Bestätigt', menge: 2500, lieferwoche: 'KW 17', lieferdatum: '22.04.2026', lieferant: 'FreshCo' },
        { poNummer: '1012347', status: 'Geplant', menge: 2500, lieferwoche: 'KW 20', lieferdatum: '13.05.2026', lieferant: 'FreshCo' },
      ],
      verkauf: [],
    },
  },
];

// Generate full year data for all articles
export const articles: Article[] = rawArticles.map((article) => ({
  ...article,
  weeklyData: generateFullYearWeeklyData(article.weeklyData),
}));

// Helper to get articles sorted by criticality (kritisch first, then planen, then beobachten)
// and within same status by bestellenBis date
export function getArticlesSortedByCriticality(): Article[] {
  const statusOrder: Record<string, number> = {
    kritisch: 0,
    planen: 1,
    beobachten: 2,
  };

  return [...articles].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    // Sort by bestellenBis (KW number)
    const weekA = parseInt(a.bestellenBis.replace('KW', ''));
    const weekB = parseInt(b.bestellenBis.replace('KW', ''));
    return weekA - weekB;
  });
}

export function getArticleById(id: string): Article | undefined {
  return articles.find((a) => a.id === id);
}

export function getNextArticleId(currentId: string): string | null {
  const sorted = getArticlesSortedByCriticality();
  const currentIndex = sorted.findIndex((a) => a.id === currentId);
  if (currentIndex === -1 || currentIndex === sorted.length - 1) return null;
  return sorted[currentIndex + 1].id;
}

export function getPreviousArticleId(currentId: string): string | null {
  const sorted = getArticlesSortedByCriticality();
  const currentIndex = sorted.findIndex((a) => a.id === currentId);
  if (currentIndex <= 0) return null;
  return sorted[currentIndex - 1].id;
}
