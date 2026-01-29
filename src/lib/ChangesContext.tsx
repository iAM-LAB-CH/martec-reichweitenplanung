'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CellChange, CellChangeField } from './types';

interface ChangesContextType {
  changes: CellChange[];
  addChange: (change: Omit<CellChange, 'id' | 'timestamp'>) => void;
  updateChange: (id: string, updates: Partial<Omit<CellChange, 'id'>>) => void;
  removeChange: (id: string) => void;
  getChangeForCell: (
    articleId: string,
    field: CellChangeField,
    weekOrOrderId?: string,
    day?: string
  ) => CellChange | undefined;
  getChangesForArticle: (articleId: string) => CellChange[];
  getEffectiveValue: (
    articleId: string,
    field: CellChangeField,
    originalValue: number,
    weekOrOrderId?: string,
    day?: string
  ) => number;
  hasChanges: boolean;
  clearChangesForArticle: (articleId: string) => void;
}

const ChangesContext = createContext<ChangesContextType | undefined>(undefined);

let changeIdCounter = 0;

export function ChangesProvider({ children }: { children: ReactNode }) {
  const [changes, setChanges] = useState<CellChange[]>([]);

  const addChange = useCallback((change: Omit<CellChange, 'id' | 'timestamp'>) => {
    const id = `change-${++changeIdCounter}`;
    const newChange: CellChange = {
      ...change,
      id,
      timestamp: new Date(),
    };
    
    setChanges((prev) => {
      // Remove existing change for the same cell if exists
      const filtered = prev.filter(
        (c) =>
          !(
            c.articleId === change.articleId &&
            c.field === change.field &&
            c.week === change.week &&
            c.orderId === change.orderId &&
            c.day === change.day
          )
      );
      return [...filtered, newChange];
    });
  }, []);

  const updateChange = useCallback((id: string, updates: Partial<Omit<CellChange, 'id'>>) => {
    setChanges((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...updates, timestamp: new Date() }
          : c
      )
    );
  }, []);

  const removeChange = useCallback((id: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getChangeForCell = useCallback(
    (articleId: string, field: CellChangeField, weekOrOrderId?: string, day?: string) => {
      return changes.find((c) => {
        if (c.articleId !== articleId || c.field !== field) return false;
        
        // New editable fields
        if (['forecastBaseline', 'forecastPromoKarton', 'forecastPromoDisplays', 'procurementForecast'].includes(field)) {
          if (day) {
            return c.week === weekOrOrderId && c.day === day;
          }
          return c.week === weekOrOrderId && !c.day;
        }
        
        // PO Link field - match by week
        if (field === 'poLink') {
          return c.week === weekOrOrderId;
        }
        
        // Legacy fields
        if (field === 'forecast' || field === 'orders') {
          return c.week === weekOrOrderId;
        }
        
        // Order fields
        return c.orderId === weekOrOrderId;
      });
    },
    [changes]
  );

  const getChangesForArticle = useCallback(
    (articleId: string) => {
      return changes
        .filter((c) => c.articleId === articleId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    },
    [changes]
  );

  const getEffectiveValue = useCallback(
    (
      articleId: string,
      field: CellChangeField,
      originalValue: number,
      weekOrOrderId?: string,
      day?: string
    ) => {
      const change = getChangeForCell(articleId, field, weekOrOrderId, day);
      return change ? change.newValue : originalValue;
    },
    [getChangeForCell]
  );

  const clearChangesForArticle = useCallback((articleId: string) => {
    setChanges((prev) => prev.filter((c) => c.articleId !== articleId));
  }, []);

  const hasChanges = changes.length > 0;

  return (
    <ChangesContext.Provider
      value={{
        changes,
        addChange,
        updateChange,
        removeChange,
        getChangeForCell,
        getChangesForArticle,
        getEffectiveValue,
        hasChanges,
        clearChangesForArticle,
      }}
    >
      {children}
    </ChangesContext.Provider>
  );
}

export function useChanges() {
  const context = useContext(ChangesContext);
  if (!context) {
    throw new Error('useChanges must be used within a ChangesProvider');
  }
  return context;
}
