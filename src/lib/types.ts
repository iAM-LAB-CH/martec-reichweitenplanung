export type ArticleStatus = 'kritisch' | 'planen' | 'beobachten';

export interface WeeklyData {
  week: string; // e.g., "KW13"
  lagerbestand: number;
  forecast: number;
  orders: number;
  lagerDelta: number;
  budget: number; // Yearly benchmark set at year-start, not editable
}

export type CellChangeField = 'forecast' | 'orders' | 'einkauf_menge' | 'verkauf_menge';

export interface CellChange {
  id: string;
  articleId: string;
  field: CellChangeField;
  week?: string; // for forecast/orders changes
  orderId?: string; // for einkauf/verkauf changes
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
  };
  weeklyData: WeeklyData[];
  orders: {
    einkauf: Order[];
    verkauf: Order[];
  };
}

