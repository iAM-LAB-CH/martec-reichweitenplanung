import { Article, WeeklyData } from './types';

/**
 * Generate full year of weekly data (KW1-KW52) from base data
 * 
 * Formula relationships:
 * - lagerbestand[week] = lagerbestand[week-1] - forecast[week-1] + orders[week-1]
 * - lagerDelta[week] = lagerbestand[week] - forecast[week]
 * - budget = yearly benchmark set at year start (slightly higher than forecast)
 * 
 * This allows negative lagerbestand values (representing out-of-stock/backorder)
 */
function generateFullYearWeeklyData(baseData: WeeklyData[]): WeeklyData[] {
  // Create a map of existing weeks for quick lookup
  const existingWeeks = new Map<number, WeeklyData>();
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
    if (existingWeeks.has(week)) {
      const data = existingWeeks.get(week)!;
      // Add budget if not present (budget is ~10-20% higher than forecast as benchmark)
      result.push({
        ...data,
        budget: data.budget || Math.round(data.forecast * 1.15),
      });
    } else {
      result.push({
        week: `KW${week}`,
        lagerbestand: 0,
        forecast: 0,
        orders: 0,
        lagerDelta: 0,
        budget: 0,
      });
    }
  }

  // Second pass: Calculate values for weeks BEFORE existing data (backwards)
  // We extrapolate backwards assuming stable state
  for (let week = firstExistingWeek - 1; week >= 1; week--) {
    const forecast = Math.round(avgForecast * 0.8);
    const budget = Math.round(forecast * 1.15);
    // Maintain a reasonable stock level before the critical period
    const lagerbestand = firstData.lagerbestand + (firstExistingWeek - week) * Math.round(avgForecast * 0.3);
    const orders = 0;
    const lagerDelta = lagerbestand - forecast;
    
    result[week - 1] = {
      week: `KW${week}`,
      lagerbestand: Math.round(lagerbestand),
      forecast,
      orders,
      lagerDelta: Math.round(lagerDelta),
      budget,
    };
  }

  // Third pass: Calculate values for weeks AFTER existing data (forwards)
  // Use the formula: lagerbestand[week] = lagerbestand[week-1] - forecast[week-1] + orders[week-1]
  for (let week = lastExistingWeek + 1; week <= 52; week++) {
    const prevWeekData = result[week - 2]; // Previous week is at index week - 2
    
    const forecast = Math.round(avgForecast * 0.7);
    const budget = Math.round(forecast * 1.15);
    // No automatic orders - let stock naturally deplete
    const orders = 0;
    
    // Calculate lagerbestand using the formula
    const lagerbestand = prevWeekData.lagerbestand - prevWeekData.forecast + prevWeekData.orders;
    const lagerDelta = lagerbestand - forecast;
    
    result[week - 1] = {
      week: `KW${week}`,
      lagerbestand: Math.round(lagerbestand),
      forecast,
      orders,
      lagerDelta: Math.round(lagerDelta),
      budget,
    };
  }

  return result;
}

// Raw article data with limited weeks - including budget (yearly benchmark ~15% above forecast)
// Data shows diverse scenarios: critical, planning needed, stable, and well-stocked articles
const rawArticles: Article[] = [
  // CRITICAL: Battery-Pack - Deep into negative, major spike in demand
  {
    id: '1',
    artikelNr: '1204912094',
    bezeichnung: 'Battery-Pack',
    status: 'kritisch',
    oosIn: 'KW17',
    lagerDelta: -12000,
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
    weeklyData: [
      { week: 'KW13', lagerbestand: 2000, forecast: 1000, orders: 7000, lagerDelta: 1000, budget: 1200 },
      { week: 'KW14', lagerbestand: 8000, forecast: 6600, orders: 0, lagerDelta: 1400, budget: 7500 },
      { week: 'KW15', lagerbestand: 1400, forecast: 1000, orders: 0, lagerDelta: 400, budget: 1200 },
      { week: 'KW16', lagerbestand: 400, forecast: 600, orders: 0, lagerDelta: -200, budget: 700 },
      { week: 'KW17', lagerbestand: -200, forecast: 12000, orders: 0, lagerDelta: -12200, budget: 14000 },
      { week: 'KW18', lagerbestand: -12200, forecast: 1000, orders: 0, lagerDelta: -13200, budget: 1200 },
      { week: 'KW19', lagerbestand: -13200, forecast: 1000, orders: 2000, lagerDelta: -14200, budget: 1200 },
      { week: 'KW20', lagerbestand: -12200, forecast: 2000, orders: 0, lagerDelta: -14200, budget: 2300 },
      { week: 'KW21', lagerbestand: -14200, forecast: 1000, orders: 0, lagerDelta: -15200, budget: 1200 },
    ],
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
  },
  // CRITICAL: Baumnussöl - Steady decline into negative
  {
    id: '2',
    artikelNr: '235324523',
    bezeichnung: 'Baumnussöl',
    status: 'kritisch',
    oosIn: 'KW15',
    lagerDelta: -3000,
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
    weeklyData: [
      { week: 'KW13', lagerbestand: 8000, forecast: 2500, orders: 0, lagerDelta: 5500, budget: 2900 },
      { week: 'KW14', lagerbestand: 5500, forecast: 2800, orders: 0, lagerDelta: 2700, budget: 3200 },
      { week: 'KW15', lagerbestand: 2700, forecast: 3000, orders: 0, lagerDelta: -300, budget: 3500 },
      { week: 'KW16', lagerbestand: -300, forecast: 3200, orders: 0, lagerDelta: -3500, budget: 3700 },
      { week: 'KW17', lagerbestand: -3500, forecast: 3000, orders: 0, lagerDelta: -6500, budget: 3500 },
      { week: 'KW18', lagerbestand: -6500, forecast: 2800, orders: 8000, lagerDelta: -9300, budget: 3200 },
      { week: 'KW19', lagerbestand: -1300, forecast: 2500, orders: 0, lagerDelta: -3800, budget: 2900 },
      { week: 'KW20', lagerbestand: -3800, forecast: 2200, orders: 0, lagerDelta: -6000, budget: 2500 },
      { week: 'KW21', lagerbestand: -6000, forecast: 2000, orders: 0, lagerDelta: -8000, budget: 2300 },
    ],
    orders: {
      einkauf: [
        { poNummer: '8834521', status: 'In Bearbeitung', menge: 8000, lieferwoche: 'KW 18', lieferdatum: '01.05.2026', lieferant: 'Ölwerk GmbH' },
      ],
      verkauf: [
        { poNummer: 'SO-002341', status: 'Bestätigt', menge: 2000, lieferwoche: 'KW 16', lieferdatum: '18.04.2026', lieferant: 'Großhandel X' },
      ],
    },
  },
  // PLANNING: Sonnencreme - Seasonal product, gets tight but recovers with order
  {
    id: '3',
    artikelNr: '1024501925',
    bezeichnung: 'Sonnencreme',
    status: 'planen',
    oosIn: 'KW19',
    lagerDelta: -500,
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
    weeklyData: [
      { week: 'KW13', lagerbestand: 4500, forecast: 800, orders: 0, lagerDelta: 3700, budget: 900 },
      { week: 'KW14', lagerbestand: 3700, forecast: 1000, orders: 0, lagerDelta: 2700, budget: 1200 },
      { week: 'KW15', lagerbestand: 2700, forecast: 1200, orders: 0, lagerDelta: 1500, budget: 1400 },
      { week: 'KW16', lagerbestand: 1500, forecast: 1500, orders: 0, lagerDelta: 0, budget: 1700 },
      { week: 'KW17', lagerbestand: 0, forecast: 1800, orders: 0, lagerDelta: -1800, budget: 2100 },
      { week: 'KW18', lagerbestand: -1800, forecast: 2000, orders: 0, lagerDelta: -3800, budget: 2300 },
      { week: 'KW19', lagerbestand: -3800, forecast: 2200, orders: 5000, lagerDelta: -6000, budget: 2500 },
      { week: 'KW20', lagerbestand: -800, forecast: 2000, orders: 0, lagerDelta: -2800, budget: 2300 },
      { week: 'KW21', lagerbestand: -2800, forecast: 1800, orders: 0, lagerDelta: -4600, budget: 2100 },
    ],
    orders: {
      einkauf: [
        { poNummer: '7712345', status: 'Geplant', menge: 5000, lieferwoche: 'KW 19', lieferdatum: '15.05.2026', lieferant: 'Cosmetics AG' },
      ],
      verkauf: [
        { poNummer: 'SO-003456', status: 'Offen', menge: 800, lieferwoche: 'KW 18', lieferdatum: '01.05.2026', lieferant: 'Drogerie M' },
      ],
    },
  },
  // PLANNING: Duschgel - Fluctuates around zero, manageable
  {
    id: '4',
    artikelNr: '132523523',
    bezeichnung: 'Duschgel',
    status: 'planen',
    oosIn: 'KW18',
    lagerDelta: -200,
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
    weeklyData: [
      { week: 'KW13', lagerbestand: 3000, forecast: 1200, orders: 0, lagerDelta: 1800, budget: 1400 },
      { week: 'KW14', lagerbestand: 1800, forecast: 1300, orders: 0, lagerDelta: 500, budget: 1500 },
      { week: 'KW15', lagerbestand: 500, forecast: 1400, orders: 0, lagerDelta: -900, budget: 1600 },
      { week: 'KW16', lagerbestand: -900, forecast: 1300, orders: 2000, lagerDelta: -2200, budget: 1500 },
      { week: 'KW17', lagerbestand: -200, forecast: 1200, orders: 0, lagerDelta: -1400, budget: 1400 },
      { week: 'KW18', lagerbestand: -1400, forecast: 1100, orders: 2000, lagerDelta: -2500, budget: 1300 },
      { week: 'KW19', lagerbestand: -500, forecast: 1000, orders: 0, lagerDelta: -1500, budget: 1200 },
      { week: 'KW20', lagerbestand: -1500, forecast: 1000, orders: 0, lagerDelta: -2500, budget: 1200 },
      { week: 'KW21', lagerbestand: -2500, forecast: 900, orders: 0, lagerDelta: -3400, budget: 1000 },
    ],
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
  // OBSERVE: Shampoo Premium - ZIG-ZAG PATTERN: Regular orders keep stock oscillating up-down-up-down
  {
    id: '5',
    artikelNr: '998877665',
    bezeichnung: 'Shampoo Premium',
    status: 'beobachten',
    oosIn: 'KW40',
    lagerDelta: 2500,
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
  // OBSERVE: Handcreme Bio - ALWAYS POSITIVE with regular high orders keeping stock healthy
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
  // OBSERVE: Bodylotion - ZIG-ZAG PATTERN: Stock goes up-down-up-down with bi-weekly orders
  {
    id: '7',
    artikelNr: '112233445',
    bezeichnung: 'Bodylotion',
    status: 'beobachten',
    oosIn: 'KW35',
    lagerDelta: 1500,
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
  // OBSERVE: Zahnpasta Mint - ALWAYS POSITIVE: Excellent stock with large regular orders
  {
    id: '8',
    artikelNr: '667788990',
    bezeichnung: 'Zahnpasta Mint',
    status: 'beobachten',
    oosIn: 'KW52',
    lagerDelta: 8000,
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
  // OBSERVE: Rasiergel - ZIG-ZAG PATTERN: Tight margins with frequent small orders
  {
    id: '9',
    artikelNr: '334455667',
    bezeichnung: 'Rasiergel',
    status: 'beobachten',
    oosIn: 'KW35',
    lagerDelta: 400,
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
  // OBSERVE: Deodorant Sport - ALWAYS POSITIVE: Comfortable stock with very regular replenishment
  {
    id: '10',
    artikelNr: '889900112',
    bezeichnung: 'Deodorant Sport',
    status: 'beobachten',
    oosIn: 'KW52',
    lagerDelta: 3500,
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

