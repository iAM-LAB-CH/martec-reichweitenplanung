import { Article, WeeklyData, SalesBreakdown, ProcurementBreakdown, POEntry, DailyProcurement } from './types';
import {
  calculateSalesLatestForecast,
  calculateProcurementPo,
  calculateLagerbestandEnde,
  createDefaultSalesBreakdown,
  createDefaultProcurementBreakdown,
} from './calculations';
import { getCurrentWeekNumber, getWeekYear, getWeeksInYear } from './timeUtils';

// Current date context
const today = new Date();
const CURRENT_WEEK = getCurrentWeekNumber(today);
const CURRENT_YEAR = getWeekYear(today);

/**
 * Deterministic pseudo-random variation based on inputs
 * Returns a value between 0 and 1 based on the inputs
 * This ensures the same inputs always produce the same output
 */
function deterministicVariation(weekNum: number, seed: number = 0, articleIndex: number = 0): number {
  // Simple hash-like function that produces consistent results
  const hash = ((weekNum * 31 + seed * 17 + articleIndex * 13) % 100) / 100;
  return hash;
}

/**
 * Get a deterministic variation multiplier for data generation
 * Returns a value in range [minMult, maxMult]
 */
function getVariationMultiplier(
  weekNum: number, 
  seed: number, 
  articleIndex: number, 
  minMult: number, 
  maxMult: number
): number {
  const variation = deterministicVariation(weekNum, seed, articleIndex);
  return minMult + variation * (maxMult - minMult);
}

/**
 * Create a SalesBreakdown with specified values
 */
function createSalesBreakdown(
  baseline: number,
  kartonware: number = 0,
  displays: number = 0
): SalesBreakdown {
  return {
    baseline,
    promo: { kartonware, displays },
  };
}

/**
 * Create a ProcurementBreakdown with specified values
 */
function createProcurementBreakdown(
  forecast: number,
  posBestellt: POEntry[] = [],
  posGeliefert: POEntry[] = [],
  forecastLinked: boolean = false,
  linkedPoNummer?: string
): ProcurementBreakdown {
  return { forecast, forecastLinked, linkedPoNummer, posBestellt, posGeliefert };
}

/**
 * Create daily procurement breakdown - typically deliveries happen on specific days
 * Procurement forecast is usually planned for Wednesday (Mi)
 * PO deliveries can be on different days
 */
function createDailyProcurement(
  forecastValue: number,
  bestelltValue: number = 0,
  geliefertValue: number = 0,
  forecastDay: 'mo' | 'di' | 'mi' | 'do' | 'fr' = 'mi', // Default: Wednesday
  bestelltDay: 'mo' | 'di' | 'mi' | 'do' | 'fr' = 'mi',
  geliefertDay: 'mo' | 'di' | 'mi' | 'do' | 'fr' = 'di' // Delivered often on Tuesday
): DailyProcurement {
  const daily: DailyProcurement = { mo: 0, di: 0, mi: 0, do: 0, fr: 0 };
  
  // Assign forecast to the specified day
  if (forecastValue > 0) {
    daily[forecastDay] += forecastValue;
  }
  
  // Assign bestellt to the specified day (overrides forecast if same day)
  if (bestelltValue > 0) {
    daily[bestelltDay] = bestelltValue;
  }
  
  // Assign geliefert to the specified day
  if (geliefertValue > 0) {
    daily[geliefertDay] = geliefertValue;
  }
  
  return daily;
}

/**
 * Generate 2+ years of weekly data from base data
 * @param articleIndex - Used for deterministic variation (ensures different articles have different patterns)
 */
function generateFullWeeklyData(
  baseData: Partial<WeeklyData>[],
  startYear: number,
  numYears: number = 2,
  initialLagerbestand: number = 5000,
  articleIndex: number = 0
): WeeklyData[] {
  const result: WeeklyData[] = [];
  
  // Create a map of existing weeks for quick lookup
  const existingWeeks = new Map<string, Partial<WeeklyData>>();
  baseData.forEach((d) => {
    if (d.week && d.year) {
      existingWeeks.set(`${d.year}-${d.week}`, d);
    }
  });

  // Calculate averages from base data for extrapolation
  const baseForecast = baseData.filter(d => d.salesLatestForecast && d.salesLatestForecast > 0);
  const avgForecast = baseForecast.length > 0
    ? Math.round(baseForecast.reduce((sum, d) => sum + (d.salesLatestForecast || 0), 0) / baseForecast.length)
    : 1000;

  let previousEnde = initialLagerbestand;

  // Generate for each year
  for (let year = startYear; year < startYear + numYears; year++) {
    const weeksInYear = getWeeksInYear(year);
    
    for (let weekNum = 1; weekNum <= weeksInYear; weekNum++) {
      const weekStr = `KW${weekNum}`;
      const key = `${year}-${weekStr}`;
      const existing = existingWeeks.get(key);

      // Determine temporal state
      const isPast = year < CURRENT_YEAR || (year === CURRENT_YEAR && weekNum < CURRENT_WEEK);
      const isCurrent = year === CURRENT_YEAR && weekNum === CURRENT_WEEK;
      const isNextWeek = (year === CURRENT_YEAR && weekNum === CURRENT_WEEK + 1) || 
                         (year === CURRENT_YEAR + 1 && weekNum === 1 && CURRENT_WEEK >= 52);

      let weekData: WeeklyData;

      if (existing) {
        // Use existing data
        const lagerbestandAnfang = existing.lagerbestandAnfang ?? previousEnde;
        const salesForecastBreakdown = existing.salesForecastBreakdown ?? createSalesBreakdown(existing.salesLatestForecast ?? avgForecast);
        const salesLatestForecast = calculateSalesLatestForecast(salesForecastBreakdown);
        const procurementBreakdown = existing.procurementBreakdown ?? createProcurementBreakdown(existing.procurementPo ?? 0);
        const procurementPo = calculateProcurementPo(procurementBreakdown);
        const salesOrderImSystem = existing.salesOrderImSystem ?? Math.round(salesLatestForecast * 0.85);
        
        // Generate senseful budget breakdown - close to forecast but slightly different
        // Budget is typically set at beginning of year and forecast adapts
        const budgetBaseline = Math.round(salesForecastBreakdown.baseline * getVariationMultiplier(weekNum, 1, articleIndex, 0.95, 1.10)); // 95-110% of forecast baseline
        const budgetKartonware = Math.round(salesForecastBreakdown.promo.kartonware * getVariationMultiplier(weekNum, 2, articleIndex, 0.90, 1.10)); // 90-110%
        const budgetDisplays = Math.round(salesForecastBreakdown.promo.displays * getVariationMultiplier(weekNum, 3, articleIndex, 0.90, 1.10)); // 90-110%
        const salesBudgetBreakdown = existing.salesBudgetBreakdown ?? createSalesBreakdown(budgetBaseline, budgetKartonware, budgetDisplays);
        const salesBudget = existing.salesBudget ?? (salesBudgetBreakdown.baseline + salesBudgetBreakdown.promo.kartonware + salesBudgetBreakdown.promo.displays);

        // Generate daily procurement data for relevant weeks
        let dailyProcurement = existing.dailyProcurement;
        if (!dailyProcurement && (isCurrent || isNextWeek || (isPast && weekNum >= CURRENT_WEEK - 2))) {
          const bestelltTotal = procurementBreakdown.posBestellt.reduce((sum, po) => sum + po.menge, 0);
          const geliefertTotal = procurementBreakdown.posGeliefert.reduce((sum, po) => sum + po.menge, 0);
          if (procurementBreakdown.forecast > 0 || bestelltTotal > 0 || geliefertTotal > 0) {
            dailyProcurement = createDailyProcurement(
              procurementBreakdown.forecast,
              bestelltTotal,
              geliefertTotal
            );
          }
        }

        weekData = {
          week: weekStr,
          year,
          lagerbestandAnfang,
          salesBudget,
          salesBudgetBreakdown,
          salesLatestForecast,
          salesForecastBreakdown,
          salesOrderImSystem,
          salesActuals: isPast ? (existing.salesActuals ?? Math.round(salesLatestForecast * 0.95)) : undefined,
          procurementPo,
          procurementBreakdown,
          dailyProcurement,
          lagerbestandEnde: calculateLagerbestandEnde(lagerbestandAnfang, salesLatestForecast, salesOrderImSystem, procurementPo),
        };
      } else {
        // Generate extrapolated data
        const lagerbestandAnfang = previousEnde;
        const baseForecastValue = Math.round(avgForecast * getVariationMultiplier(weekNum, 4, articleIndex, 0.80, 1.20)); // 80-120% of average
        
        // Forecast breakdown with promo
        const forecastBaseline = Math.round(baseForecastValue * 0.8); // 80% baseline
        const forecastKartonware = Math.round(baseForecastValue * 0.1); // 10% kartonware
        const forecastDisplays = Math.round(baseForecastValue * 0.1); // 10% displays
        const salesForecastBreakdown = createSalesBreakdown(forecastBaseline, forecastKartonware, forecastDisplays);
        const salesLatestForecast = calculateSalesLatestForecast(salesForecastBreakdown);
        
        // Budget breakdown - similar to forecast but with small variations (budget set at year start)
        const budgetBaseline = Math.round(forecastBaseline * getVariationMultiplier(weekNum, 5, articleIndex, 0.95, 1.10)); // 95-110%
        const budgetKartonware = Math.round(forecastKartonware * getVariationMultiplier(weekNum, 6, articleIndex, 0.90, 1.10)); // 90-110%
        const budgetDisplays = Math.round(forecastDisplays * getVariationMultiplier(weekNum, 7, articleIndex, 0.90, 1.10)); // 90-110%
        const salesBudgetBreakdown = createSalesBreakdown(budgetBaseline, budgetKartonware, budgetDisplays);
        const salesBudget = salesBudgetBreakdown.baseline + salesBudgetBreakdown.promo.kartonware + salesBudgetBreakdown.promo.displays;
        
        const salesOrderImSystem = Math.round(salesLatestForecast * 0.85);
        
        // Occasionally add procurement to prevent stock from going too negative
        let procurementForecast = 0;
        if (previousEnde < avgForecast * 2) {
          procurementForecast = Math.round(avgForecast * 3); // Order ~3 weeks of stock
        }
        const procurementBreakdown = createProcurementBreakdown(procurementForecast);
        const procurementPo = calculateProcurementPo(procurementBreakdown);

        // Generate daily procurement for relevant weeks
        let dailyProcurement: DailyProcurement | undefined = undefined;
        if ((isCurrent || isNextWeek) && procurementForecast > 0) {
          dailyProcurement = createDailyProcurement(procurementForecast, 0, 0);
        }

        weekData = {
          week: weekStr,
          year,
          lagerbestandAnfang,
          salesBudget,
          salesBudgetBreakdown,
          salesLatestForecast,
          salesForecastBreakdown,
          salesOrderImSystem,
          salesActuals: isPast ? Math.round(salesLatestForecast * 0.95) : undefined,
          procurementPo,
          procurementBreakdown,
          dailyProcurement,
          lagerbestandEnde: calculateLagerbestandEnde(lagerbestandAnfang, salesLatestForecast, salesOrderImSystem, procurementPo),
        };
      }

      result.push(weekData);
      previousEnde = weekData.lagerbestandEnde;
    }
  }

  return result;
}

// Raw article data with new structure
const rawArticles: Article[] = [
  // CRITICAL: Battery-Pack - Deep into negative, major spike in demand
  {
    id: '1',
    artikelNr: '1204912094',
    bezeichnung: 'Battery-Pack',
    status: 'kritisch',
    oosIn: 'KW17',
    lagerbestandEnde: -12000,
    bestellenBis: 'KW13',
    bestellvorschlag: {
      einheiten: 4000,
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 2000,
        salesLatestForecast: 1000,
        salesForecastBreakdown: createSalesBreakdown(800, 100, 100),
        salesBudget: 1050,
        salesBudgetBreakdown: createSalesBreakdown(850, 100, 100), // Budget close to forecast
        salesOrderImSystem: 950,
        salesActuals: 980,
        procurementPo: 7000,
        procurementBreakdown: createProcurementBreakdown(7000, [
          { poNummer: 'PO-2024-001', menge: 7000, linkedToForecast: true, linkedWeek: 'KW13' }
        ], [], true, 'PO-2024-001'), // Linked forecast
        dailyProcurement: createDailyProcurement(0, 7000, 0, 'mi', 'mi', 'di'), // PO delivered on Wednesday
        lagerbestandEnde: 8000,
      },
      {
        week: 'KW14', year: CURRENT_YEAR,
        lagerbestandAnfang: 8000,
        salesLatestForecast: 6600,
        salesForecastBreakdown: createSalesBreakdown(5000, 800, 800),
        salesBudget: 6400,
        salesBudgetBreakdown: createSalesBreakdown(4800, 800, 800), // Budget slightly lower than forecast
        salesOrderImSystem: 6200,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 1400,
      },
      {
        week: 'KW15', year: CURRENT_YEAR,
        lagerbestandAnfang: 1400,
        salesLatestForecast: 1000,
        salesForecastBreakdown: createSalesBreakdown(800, 100, 100),
        salesBudget: 1100,
        salesBudgetBreakdown: createSalesBreakdown(900, 100, 100), // Budget slightly higher
        salesOrderImSystem: 900,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 400,
      },
      {
        week: 'KW16', year: CURRENT_YEAR,
        lagerbestandAnfang: 400,
        salesLatestForecast: 600,
        salesForecastBreakdown: createSalesBreakdown(500, 50, 50),
        salesBudget: 650,
        salesBudgetBreakdown: createSalesBreakdown(550, 50, 50), // Budget close to forecast
        salesOrderImSystem: 580,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: -200,
      },
      {
        week: 'KW17', year: CURRENT_YEAR,
        lagerbestandAnfang: -200,
        salesLatestForecast: 12000,
        salesForecastBreakdown: createSalesBreakdown(8000, 2000, 2000),
        salesBudget: 11500,
        salesBudgetBreakdown: createSalesBreakdown(7500, 2000, 2000), // Budget slightly lower due to unexpected demand spike
        salesOrderImSystem: 11500,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(5000), // Unlinked forecast
        dailyProcurement: createDailyProcurement(5000, 0, 0, 'mi', 'mi', 'di'), // Forecast on Wednesday
        lagerbestandEnde: -12200,
      },
      {
        week: 'KW18', year: CURRENT_YEAR,
        lagerbestandAnfang: -12200,
        salesLatestForecast: 1000,
        salesForecastBreakdown: createSalesBreakdown(800, 100, 100),
        salesBudget: 1050,
        salesBudgetBreakdown: createSalesBreakdown(850, 100, 100),
        salesOrderImSystem: 950,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(8000), // Unlinked forecast
        dailyProcurement: createDailyProcurement(8000, 0, 0, 'mi', 'mi', 'di'), // Forecast on Wednesday
        lagerbestandEnde: -13200,
      },
    ], CURRENT_YEAR, 2, 2000, 1),
    orders: {
      einkauf: [
        { poNummer: '1242543', status: 'In Lieferung', menge: 3300, lieferwoche: 'KW 32', lieferdatum: '21.06.2026', lieferant: 'Planzer' },
        { poNummer: '34672342', status: 'In Bearbeitung', menge: 2500, lieferwoche: 'KW 30', lieferdatum: '15.06.2026', lieferant: 'Planzer' },
        { poNummer: '234624323', status: 'Abgeschlossen', menge: 1750, lieferwoche: 'KW 29', lieferdatum: '10.06.2026', lieferant: 'Planzer' },
        { poNummer: '345234523', status: 'Versendet', menge: 4100, lieferwoche: 'KW 31', lieferdatum: '18.06.2026', lieferant: 'Planzer' },
      ],
      verkauf: [
        { poNummer: 'SO-001234', status: 'Bestätigt', menge: 500, lieferwoche: 'KW 18', lieferdatum: '02.05.2026', lieferant: 'Kunde A' },
        { poNummer: 'SO-001235', status: 'Offen', menge: 1200, lieferwoche: 'KW 19', lieferdatum: '09.05.2026', lieferant: 'Kunde B' },
        { poNummer: 'SO-001236', status: 'Bestätigt', menge: 800, lieferwoche: 'KW 20', lieferdatum: '16.05.2026', lieferant: 'Kunde C' },
      ],
    },
    poLinkState: {
      unlinkedPOs: [
        { poNummer: 'PO-2024-005', menge: 5000, expectedDelivery: '25.04.2026', linkedToForecast: false },
        { poNummer: 'PO-2024-006', menge: 8000, expectedDelivery: '02.05.2026', linkedToForecast: false },
      ],
      linkedPOs: new Map([
        ['KW13', [{ poNummer: 'PO-2024-001', menge: 7000, linkedToForecast: true, linkedWeek: 'KW13' }]],
      ]),
    },
  },
  // CRITICAL: Baumnussöl - Steady decline into negative
  {
    id: '2',
    artikelNr: '235324523',
    bezeichnung: 'Baumnussöl',
    status: 'kritisch',
    oosIn: 'KW15',
    lagerbestandEnde: -3000,
    bestellenBis: 'KW12',
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 8000,
        salesLatestForecast: 2500,
        salesForecastBreakdown: createSalesBreakdown(2000, 250, 250),
        salesBudget: 2600,
        salesBudgetBreakdown: createSalesBreakdown(2100, 250, 250), // Budget close to forecast
        salesOrderImSystem: 2400,
        salesActuals: 2480,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 5500,
      },
      {
        week: 'KW14', year: CURRENT_YEAR,
        lagerbestandAnfang: 5500,
        salesLatestForecast: 2800,
        salesForecastBreakdown: createSalesBreakdown(2200, 300, 300),
        salesBudget: 2700,
        salesBudgetBreakdown: createSalesBreakdown(2100, 300, 300), // Budget slightly lower
        salesOrderImSystem: 2700,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 2700,
      },
      {
        week: 'KW15', year: CURRENT_YEAR,
        lagerbestandAnfang: 2700,
        salesLatestForecast: 3000,
        salesForecastBreakdown: createSalesBreakdown(2400, 300, 300),
        salesBudget: 2900,
        salesBudgetBreakdown: createSalesBreakdown(2300, 300, 300), // Budget slightly lower
        salesOrderImSystem: 2900,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(5000),
        dailyProcurement: createDailyProcurement(5000, 0, 0, 'do', 'mi', 'di'), // Forecast on Thursday
        lagerbestandEnde: -300,
      },
    ], CURRENT_YEAR, 2, 8000, 2),
    orders: {
      einkauf: [
        { poNummer: '8834521', status: 'In Bearbeitung', menge: 8000, lieferwoche: 'KW 18', lieferdatum: '01.05.2026', lieferant: 'Ölwerk GmbH' },
      ],
      verkauf: [
        { poNummer: 'SO-002341', status: 'Bestätigt', menge: 2000, lieferwoche: 'KW 16', lieferdatum: '18.04.2026', lieferant: 'Großhandel X' },
      ],
    },
  },
  // PLANNING: Sonnencreme - Seasonal product
  {
    id: '3',
    artikelNr: '1024501925',
    bezeichnung: 'Sonnencreme',
    status: 'planen',
    oosIn: 'KW19',
    lagerbestandEnde: -500,
    bestellenBis: 'KW17',
    bestellvorschlag: {
      einheiten: 3000,
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 4500,
        salesLatestForecast: 800,
        salesForecastBreakdown: createSalesBreakdown(600, 100, 100),
        salesBudget: 850,
        salesBudgetBreakdown: createSalesBreakdown(650, 100, 100), // Budget close to forecast
        salesOrderImSystem: 750,
        salesActuals: 780,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 3700,
      },
    ], CURRENT_YEAR, 2, 4500, 3),
    orders: {
      einkauf: [
        { poNummer: '7712345', status: 'Geplant', menge: 5000, lieferwoche: 'KW 19', lieferdatum: '15.05.2026', lieferant: 'Cosmetics AG' },
      ],
      verkauf: [
        { poNummer: 'SO-003456', status: 'Offen', menge: 800, lieferwoche: 'KW 18', lieferdatum: '01.05.2026', lieferant: 'Drogerie M' },
      ],
    },
  },
  // PLANNING: Duschgel - Fluctuates around zero
  {
    id: '4',
    artikelNr: '132523523',
    bezeichnung: 'Duschgel',
    status: 'planen',
    oosIn: 'KW18',
    lagerbestandEnde: -200,
    bestellenBis: 'KW16',
    bestellvorschlag: {
      einheiten: 2000,
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 3000,
        salesLatestForecast: 1200,
        salesForecastBreakdown: createSalesBreakdown(1000, 100, 100),
        salesBudget: 1400,
        salesOrderImSystem: 1150,
        salesActuals: 1180,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 1800,
      },
    ], CURRENT_YEAR, 2, 3000, 4),
    orders: {
      einkauf: [
        { poNummer: '4412345', status: 'Geplant', menge: 2000, lieferwoche: 'KW 16', lieferdatum: '20.04.2026', lieferant: 'CleanCo' },
        { poNummer: '4412346', status: 'Geplant', menge: 2000, lieferwoche: 'KW 18', lieferdatum: '04.05.2026', lieferant: 'CleanCo' },
      ],
      verkauf: [
        { poNummer: 'SO-004567', status: 'Bestätigt', menge: 400, lieferwoche: 'KW 17', lieferdatum: '24.04.2026', lieferant: 'Retail Store' },
      ],
    },
  },
  // OBSERVE: Shampoo Premium - ZIG-ZAG PATTERN
  {
    id: '5',
    artikelNr: '998877665',
    bezeichnung: 'Shampoo Premium',
    status: 'beobachten',
    oosIn: 'KW40',
    lagerbestandEnde: 2500,
    bestellenBis: 'KW38',
    bestellvorschlag: {
      einheiten: 1500,
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 3000,
        salesLatestForecast: 1200,
        salesForecastBreakdown: createSalesBreakdown(1000, 100, 100),
        salesBudget: 1400,
        salesOrderImSystem: 1150,
        salesActuals: 1180,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 1800,
      },
      {
        week: 'KW14', year: CURRENT_YEAR,
        lagerbestandAnfang: 1800,
        salesLatestForecast: 1300,
        salesForecastBreakdown: createSalesBreakdown(1100, 100, 100),
        salesBudget: 1500,
        salesOrderImSystem: 1250,
        procurementPo: 2500,
        procurementBreakdown: createProcurementBreakdown(0, [
          { poNummer: 'PO-SH-001', menge: 2500, linkedToForecast: true }
        ], []),
        lagerbestandEnde: 3000,
      },
    ], CURRENT_YEAR, 2, 3000, 5),
    orders: {
      einkauf: [
        { poNummer: '5512345', status: 'Abgeschlossen', menge: 2500, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'HairCare Inc' },
        { poNummer: '5512346', status: 'Bestätigt', menge: 3000, lieferwoche: 'KW 17', lieferdatum: '22.04.2026', lieferant: 'HairCare Inc' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Handcreme Bio - ALWAYS POSITIVE
  {
    id: '6',
    artikelNr: '445566778',
    bezeichnung: 'Handcreme Bio',
    status: 'beobachten',
    oosIn: 'KW52',
    lagerbestandEnde: 4000,
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 5000,
        salesLatestForecast: 800,
        salesForecastBreakdown: createSalesBreakdown(700, 50, 50),
        salesBudget: 900,
        salesOrderImSystem: 780,
        salesActuals: 790,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 4200,
      },
    ], CURRENT_YEAR, 2, 5000, 6),
    orders: {
      einkauf: [
        { poNummer: '6612345', status: 'Abgeschlossen', menge: 3000, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'BioCare GmbH' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Bodylotion - ZIG-ZAG PATTERN
  {
    id: '7',
    artikelNr: '112233445',
    bezeichnung: 'Bodylotion',
    status: 'beobachten',
    oosIn: 'KW35',
    lagerbestandEnde: 1500,
    bestellenBis: 'KW33',
    bestellvorschlag: {
      einheiten: 1800,
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 4000,
        salesLatestForecast: 1000,
        salesForecastBreakdown: createSalesBreakdown(850, 75, 75),
        salesBudget: 1200,
        salesOrderImSystem: 980,
        salesActuals: 990,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 3000,
      },
    ], CURRENT_YEAR, 2, 4000, 7),
    orders: {
      einkauf: [
        { poNummer: '7712340', status: 'Abgeschlossen', menge: 2500, lieferwoche: 'KW 15', lieferdatum: '08.04.2026', lieferant: 'BodyCare Ltd' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Zahnpasta Mint - ALWAYS POSITIVE
  {
    id: '8',
    artikelNr: '667788990',
    bezeichnung: 'Zahnpasta Mint',
    status: 'beobachten',
    oosIn: 'KW52',
    lagerbestandEnde: 8000,
    bestellenBis: 'KW50',
    bestellvorschlag: {
      einheiten: 3000,
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 8000,
        salesLatestForecast: 1500,
        salesForecastBreakdown: createSalesBreakdown(1300, 100, 100),
        salesBudget: 1700,
        salesOrderImSystem: 1450,
        salesActuals: 1480,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 6500,
      },
    ], CURRENT_YEAR, 2, 8000, 8),
    orders: {
      einkauf: [
        { poNummer: '8812345', status: 'Abgeschlossen', menge: 5000, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'DentalCo' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Rasiergel - ZIG-ZAG PATTERN
  {
    id: '9',
    artikelNr: '334455667',
    bezeichnung: 'Rasiergel',
    status: 'beobachten',
    oosIn: 'KW35',
    lagerbestandEnde: 400,
    bestellenBis: 'KW33',
    bestellvorschlag: {
      einheiten: 1200,
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 1500,
        salesLatestForecast: 500,
        salesForecastBreakdown: createSalesBreakdown(400, 50, 50),
        salesBudget: 580,
        salesOrderImSystem: 480,
        salesActuals: 490,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 1000,
      },
    ], CURRENT_YEAR, 2, 1500, 9),
    orders: {
      einkauf: [
        { poNummer: '9912345', status: 'Abgeschlossen', menge: 1000, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'ShaveCo' },
      ],
      verkauf: [],
    },
  },
  // OBSERVE: Deodorant Sport - ALWAYS POSITIVE
  {
    id: '10',
    artikelNr: '889900112',
    bezeichnung: 'Deodorant Sport',
    status: 'beobachten',
    oosIn: 'KW52',
    lagerbestandEnde: 3500,
    bestellenBis: 'KW50',
    bestellvorschlag: {
      einheiten: 2200,
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
    weeklyData: generateFullWeeklyData([
      {
        week: 'KW13', year: CURRENT_YEAR,
        lagerbestandAnfang: 4000,
        salesLatestForecast: 900,
        salesForecastBreakdown: createSalesBreakdown(750, 75, 75),
        salesBudget: 1000,
        salesOrderImSystem: 870,
        salesActuals: 880,
        procurementPo: 0,
        procurementBreakdown: createProcurementBreakdown(0),
        lagerbestandEnde: 3100,
      },
    ], CURRENT_YEAR, 2, 4000, 10),
    orders: {
      einkauf: [
        { poNummer: '1012345', status: 'Abgeschlossen', menge: 2500, lieferwoche: 'KW 14', lieferdatum: '01.04.2026', lieferant: 'FreshCo' },
      ],
      verkauf: [],
    },
  },
];

// Export articles
export const articles: Article[] = rawArticles;

// Helper to get articles sorted by criticality
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

// Export current week info for use by components
export { CURRENT_WEEK, CURRENT_YEAR };
