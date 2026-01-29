export type ArticleStatus = 'kritisch' | 'planen' | 'beobachten';

export type WeekStatus = 'past' | 'current' | 'future';

// Breakdown structure for Sales Budget
export interface SalesBudgetBreakdown {
  baseline: number;
  promo: {
    kartonware: number;
    displays: number;
  };
}

// Breakdown structure for Sales Forecast
export interface SalesForecastBreakdown {
  baseline: number;
  promo: {
    kartonware: number;
    displays: number;
  };
}

// Breakdown structure for Procurement
export interface ProcurementBreakdown {
  forecast: number;
  ordered: number;
  delivered: number;
}

// Daily breakdown for procurement (Mo-Fr)
export interface DailyProcurement {
  mo: number;
  di: number;
  mi: number;
  do: number;
  fr: number;
}

export interface WeeklyData {
  week: string; // e.g., "KW13"
  
  // Row 1: Inventory at start of week
  lagerbestandAnfang: number;
  
  // Row 2: Sales Budget (with breakdown)
  salesBudget: number;
  salesBudgetBreakdown?: SalesBudgetBreakdown;
  
  // Row 3: Sales Latest Forecast (with breakdown)
  salesLatestForecast: number;
  salesForecastBreakdown?: SalesForecastBreakdown;
  
  // Row 4: Sales Orders in System
  salesOrderImSystem: number;
  
  // Row 5: Sales Actuals (past weeks only)
  salesActuals?: number;
  
  // Row 6: Procurement PO (with breakdown)
  procurementPo: number;
  procurementBreakdown?: ProcurementBreakdown;
  procurementDaily?: DailyProcurement; // For day-level breakdown
  
  // Row 7: Inventory at end of week
  lagerbestandEnde: number;
}

// Row definition for ForecastTable
export interface RowDefinition {
  id: string;
  label: string;
  level: 0 | 1 | 2;
  field: string;
  editable: boolean;
  expandable?: boolean;
  children?: string[];
  parent?: string;
  pastOnly?: boolean;
  hasDailyBreakdown?: boolean;
  showTooltip?: boolean;
  colorCoded?: boolean;
}

// Cell change tracking
export type CellChangeField = 
  | 'forecastBaseline' 
  | 'forecastPromoKarton' 
  | 'forecastPromoDisplays' 
  | 'procurementForecast'
  | 'poLink' // For PO linking actions
  | 'einkauf_menge' 
  | 'verkauf_menge'
  // Legacy fields for backwards compatibility
  | 'forecast'
  | 'orders';

export interface CellChange {
  id: string;
  articleId: string;
  field: CellChangeField;
  week?: string; // for weekly changes
  orderId?: string; // for einkauf/verkauf changes
  day?: string; // for daily breakdown changes (mo, di, mi, do, fr)
  poNummer?: string; // for PO link actions
  originalValue: number;
  newValue: number;
  comment: string;
  timestamp: Date;
}

export interface Order {
  poNummer: string;
  status: string;
  menge: number;
  lieferwoche: string;
  lieferdatum: string;
  lieferant: string;
}

// PO Entry for linking
export interface POEntry {
  poNummer: string;
  menge: number;
  liefertermin: string;
  artikelId: string;
  status: 'unlinked' | 'linked';
  linkedWeek?: string;
}

export interface Article {
  id: string;
  artikelNr: string;
  bezeichnung: string;
  status: ArticleStatus;
  oosIn: string;
  lagerDelta: number;
  bestellenBis: string;
  bestellvorschlag: {
    einheiten: number;
    bestellfrist: string;
  };
  artikelDetails: {
    mindestbestellmenge: number;
    lieferzeit: string;
    bestellfrist: string;
    erschoepfungsprognose: string;
    mindesthaltbarkeit: string;
    einheitenProPalett: number;
    lagerkostenProEinheit: number; // in CHF
  };
  weeklyData: WeeklyData[];
  orders: {
    einkauf: Order[];
    verkauf: Order[];
  };
}
