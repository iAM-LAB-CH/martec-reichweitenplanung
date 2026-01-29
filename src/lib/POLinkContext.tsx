'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';
import { POEntry } from './types';
import { generateMockPOs } from './dummyData';

interface POLinkContextType {
  // State
  allPOs: POEntry[];
  linkedWeeks: Map<string, string>; // week -> poNummer
  currentArticleId: string | null;
  
  // Computed
  unlinkedPOsForCurrentArticle: POEntry[];
  unlinkedCount: number;
  
  // Actions
  setCurrentArticle: (articleId: string) => void;
  linkPO: (week: string, poNummer: string) => void;
  unlinkPO: (week: string) => void;
  getLinkedPO: (week: string) => string | undefined;
  getPOByNumber: (poNummer: string) => POEntry | undefined;
}

const POLinkContext = createContext<POLinkContextType | undefined>(undefined);

// Generate initial POs for all articles (1-10)
function generateAllPOs(): POEntry[] {
  const allPOs: POEntry[] = [];
  for (let i = 1; i <= 10; i++) {
    allPOs.push(...generateMockPOs(String(i)));
  }
  return allPOs;
}

export function POLinkProvider({ children }: { children: ReactNode }) {
  // Initialize with POs for all articles
  const [allPOs, setAllPOs] = useState<POEntry[]>(() => generateAllPOs());
  const [linkedWeeks, setLinkedWeeks] = useState<Map<string, string>>(new Map());
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);

  // Set current article context
  const setCurrentArticle = useCallback((articleId: string) => {
    setCurrentArticleId(articleId);
  }, []);

  // Get unlinked POs for the current article
  const unlinkedPOsForCurrentArticle = useMemo(() => {
    if (!currentArticleId) return [];
    return allPOs.filter(
      (po) => po.artikelId === currentArticleId && po.status === 'unlinked'
    );
  }, [allPOs, currentArticleId]);

  // Count of unlinked POs for current article
  const unlinkedCount = useMemo(() => {
    return unlinkedPOsForCurrentArticle.length;
  }, [unlinkedPOsForCurrentArticle]);

  // Link a PO to a specific week
  const linkPO = useCallback((week: string, poNummer: string) => {
    // Update linked weeks map
    setLinkedWeeks((prev) => {
      const next = new Map(prev);
      next.set(week, poNummer);
      return next;
    });

    // Update PO status to linked
    setAllPOs((prev) =>
      prev.map((po) =>
        po.poNummer === poNummer
          ? { ...po, status: 'linked' as const, linkedWeek: week }
          : po
      )
    );
  }, []);

  // Unlink a PO from a week
  const unlinkPO = useCallback((week: string) => {
    const poNummer = linkedWeeks.get(week);
    
    // Remove from linked weeks map
    setLinkedWeeks((prev) => {
      const next = new Map(prev);
      next.delete(week);
      return next;
    });

    // Update PO status back to unlinked
    if (poNummer) {
      setAllPOs((prev) =>
        prev.map((po) =>
          po.poNummer === poNummer
            ? { ...po, status: 'unlinked' as const, linkedWeek: undefined }
            : po
        )
      );
    }
  }, [linkedWeeks]);

  // Get linked PO number for a week
  const getLinkedPO = useCallback(
    (week: string) => {
      return linkedWeeks.get(week);
    },
    [linkedWeeks]
  );

  // Get PO by number
  const getPOByNumber = useCallback(
    (poNummer: string) => {
      return allPOs.find((po) => po.poNummer === poNummer);
    },
    [allPOs]
  );

  return (
    <POLinkContext.Provider
      value={{
        allPOs,
        linkedWeeks,
        currentArticleId,
        unlinkedPOsForCurrentArticle,
        unlinkedCount,
        setCurrentArticle,
        linkPO,
        unlinkPO,
        getLinkedPO,
        getPOByNumber,
      }}
    >
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
