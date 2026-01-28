'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { POEntry, Article } from './types';

interface POLinkContextType {
  // Get unlinked POs for an article
  getUnlinkedPOs: (articleId: string) => POEntry[];
  
  // Link a PO to a forecast week
  linkPO: (articleId: string, week: string, poNummer: string) => void;
  
  // Unlink a PO from a forecast week
  unlinkPO: (articleId: string, week: string, poNummer: string) => void;
  
  // Check if a forecast is linked for a specific week
  isForecastLinked: (articleId: string, week: string) => boolean;
  
  // Get the linked PO number for a specific week
  getLinkedPONummer: (articleId: string, week: string) => string | undefined;
  
  // Initialize state from article data
  initializeFromArticle: (article: Article) => void;
}

interface LinkState {
  unlinkedPOs: POEntry[];
  linkedWeeks: Map<string, string>; // week -> poNummer
}

const POLinkContext = createContext<POLinkContextType | null>(null);

export function POLinkProvider({ children }: { children: ReactNode }) {
  // State: articleId -> LinkState
  const [linkStates, setLinkStates] = useState<Map<string, LinkState>>(new Map());

  // Initialize state from article data
  const initializeFromArticle = useCallback((article: Article) => {
    setLinkStates(prev => {
      // Don't re-initialize if already present
      if (prev.has(article.id)) return prev;
      
      const next = new Map(prev);
      const unlinkedPOs = article.poLinkState?.unlinkedPOs ?? [];
      const linkedWeeks = new Map<string, string>();
      
      // Convert linkedPOs Map to our simpler structure
      if (article.poLinkState?.linkedPOs) {
        article.poLinkState.linkedPOs.forEach((pos, week) => {
          if (pos.length > 0) {
            linkedWeeks.set(week, pos[0].poNummer);
          }
        });
      }
      
      // Also check procurement breakdown for linked forecasts
      article.weeklyData.forEach(wd => {
        if (wd.procurementBreakdown?.forecastLinked && wd.procurementBreakdown.linkedPoNummer) {
          linkedWeeks.set(wd.week, wd.procurementBreakdown.linkedPoNummer);
        }
      });
      
      next.set(article.id, { unlinkedPOs, linkedWeeks });
      return next;
    });
  }, []);

  // Get unlinked POs for an article
  const getUnlinkedPOs = useCallback((articleId: string): POEntry[] => {
    const state = linkStates.get(articleId);
    return state?.unlinkedPOs ?? [];
  }, [linkStates]);

  // Link a PO to a forecast week
  const linkPO = useCallback((articleId: string, week: string, poNummer: string) => {
    setLinkStates(prev => {
      const next = new Map(prev);
      const state = next.get(articleId);
      
      if (!state) return prev;
      
      // Find the PO in unlinked list
      const poIndex = state.unlinkedPOs.findIndex(po => po.poNummer === poNummer);
      if (poIndex === -1) return prev;
      
      // Update state
      const newUnlinkedPOs = [...state.unlinkedPOs];
      newUnlinkedPOs.splice(poIndex, 1);
      
      const newLinkedWeeks = new Map(state.linkedWeeks);
      newLinkedWeeks.set(week, poNummer);
      
      next.set(articleId, {
        unlinkedPOs: newUnlinkedPOs,
        linkedWeeks: newLinkedWeeks,
      });
      
      return next;
    });
  }, []);

  // Unlink a PO from a forecast week
  const unlinkPO = useCallback((articleId: string, week: string, poNummer: string) => {
    setLinkStates(prev => {
      const next = new Map(prev);
      const state = next.get(articleId);
      
      if (!state) return prev;
      
      // Check if this week is linked to this PO
      if (state.linkedWeeks.get(week) !== poNummer) return prev;
      
      // Create a PO entry to add back to unlinked list
      const poEntry: POEntry = {
        poNummer,
        menge: 0, // We don't have the original menge stored
        linkedToForecast: false,
      };
      
      const newUnlinkedPOs = [...state.unlinkedPOs, poEntry];
      
      const newLinkedWeeks = new Map(state.linkedWeeks);
      newLinkedWeeks.delete(week);
      
      next.set(articleId, {
        unlinkedPOs: newUnlinkedPOs,
        linkedWeeks: newLinkedWeeks,
      });
      
      return next;
    });
  }, []);

  // Check if a forecast is linked for a specific week
  const isForecastLinked = useCallback((articleId: string, week: string): boolean => {
    const state = linkStates.get(articleId);
    return state?.linkedWeeks.has(week) ?? false;
  }, [linkStates]);

  // Get the linked PO number for a specific week
  const getLinkedPONummer = useCallback((articleId: string, week: string): string | undefined => {
    const state = linkStates.get(articleId);
    return state?.linkedWeeks.get(week);
  }, [linkStates]);

  const value = useMemo(() => ({
    getUnlinkedPOs,
    linkPO,
    unlinkPO,
    isForecastLinked,
    getLinkedPONummer,
    initializeFromArticle,
  }), [getUnlinkedPOs, linkPO, unlinkPO, isForecastLinked, getLinkedPONummer, initializeFromArticle]);

  return (
    <POLinkContext.Provider value={value}>
      {children}
    </POLinkContext.Provider>
  );
}

export function usePOLink() {
  const context = useContext(POLinkContext);
  if (!context) {
    throw new Error('usePOLink must be used within a POLinkProvider');
  }
  return context;
}
