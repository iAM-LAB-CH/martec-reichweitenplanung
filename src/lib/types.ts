export type ArticleStatus = 'kritisch' | 'planen' | 'beobachten';

// Temporal state for week-based logic
export type TemporalState = 'past' | 'current' | 'future';

// Sub-row data for Sales Budget/Forecast promo breakdown
export interface PromoBreakdown {
  kartonware: number;
  displays: number;
}

// Sales breakdown with baseline and promo components
export interface SalesBreakdown {
  baseline: number;
  promo: PromoBreakdown;
}

// PO entry for ordered/delivered POs
export interface POEntry {
  poNummer: string;
  menge: number;
  expectedDelivery?: string; // For display in PO linking popover
  linkedToForecast?: boolean; // For PO linking feature
  linkedWeek?: string; // Which week this PO is linked to
}

// Procurement sub-rows breakdown
export interface ProcurementBreakdown {
  forecast: number; // System-calculated suggestion
  forecastLinked: boolean; // Is this forecast linked to a PO?
  linkedPoNummer?: string; // Which PO is it linked to?
  posBestellt: POEntry[]; // Ordered POs
  posGeliefert: POEntry[]; // Delivered POs
}

// Daily breakdown for next week (Mo-Fr)
export interface DailyProcurement {
  mo: number;
  di: number;
  mi: number;
  do: number;
  fr: number;
}

// Weekly data with full breakdown structure
export interface WeeklyData {
  week: string; // e.g., "KW13"
  year: number; // Support multi-year

  lagerbestandAnfang: number; // Inventory Start of Week

  salesBudget: number; // Sales Budget Stück (frozen per 01.01)
  salesBudgetBreakdown?: SalesBreakdown; // Expandable sub-rows (optional for past data)

  salesLatestForecast: number; // Sales Latest Forecast Stück
  salesForecastBreakdown: SalesBreakdown; // Expandable sub-rows (editable in future)

  salesOrderImSystem: number; // Sales Order im System (NEW)
  salesActuals?: number; // Sales Actuals (only for past weeks)

  procurementPo: number; // Procurement PO Lieferant (calculated)
  procurementBreakdown: ProcurementBreakdown; // Expandable sub-rows
  dailyProcurement?: DailyProcurement; // For next week only (Mo-Fr breakdown)

  lagerbestandEnde: number; // Inventory End of Week (calculated)
}

// Editable cell field types
export type CellChangeField =
  | 'salesForecastBaseline'
  | 'salesForecastPromoKartonware'
  | 'salesForecastPromoDisplays'
  | 'procurementForecast'
  | 'procurementForecast_mo'
  | 'procurementForecast_di'
  | 'procurementForecast_mi'
  | 'procurementForecast_do'
  | 'procurementForecast_fr'
  | 'einkauf_menge'
  | 'verkauf_menge';

// Cell change tracking
export interface CellChange {
  id: string;
  articleId: string;
  field: CellChangeField;
  week?: string; // for weekly data changes
  orderId?: string; // for einkauf/verkauf changes
  originalValue: number;
  newValue: number;
  comment: string;
  timestamp: Date;
}

// Order (for einkauf/verkauf tables)
export interface Order {
  poNummer: string;
  status: string;
  menge: number;
  lieferwoche: string;
  lieferdatum: string;
  lieferant: string;
}

// PO Linking state
export interface POLinkState {
  unlinkedPOs: POEntry[];
  linkedPOs: Map<string, POEntry[]>; // week -> linked POs
}

// Calculation context for time-based logic
export interface CalculationContext {
  currentWeek: number;
  currentYear: number;
}

// Row configuration for expandable table
export interface RowConfig {
  id: string;
  label: string;
  level: 0 | 1 | 2;
  parentId?: string;
  expandable: boolean;
  editable: boolean;
  editableInFuture: boolean;
  dataKey: keyof WeeklyData | string; // string for nested paths like 'salesForecastBreakdown.baseline'
  showPOTooltip?: boolean;
  clickableForPOLinking?: boolean;
}

// Article with full weekly data
export interface Article {
  id: string;
  artikelNr: string;
  bezeichnung: string;
  status: ArticleStatus;
  oosIn: string;
  lagerbestandEnde: number; // Renamed from lagerDelta
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
  // PO linking state for this article
  poLinkState?: POLinkState;
}
