'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { POEntry } from './types';

interface POLinkContextType {
  unlinkedPOs: POEntry[];
  linkedWeeks: Map<string, string>; // week -> poNummer
  linkPO: (week: string, poNummer: string) => void;
  unlinkPO: (week: string) => void;
  getLinkedPO: (week: string) => string | undefined;
  unlinkedCount: number;
  addUnlinkedPO: (po: POEntry) => void;
  removeUnlinkedPO: (poNummer: string) => void;
}

const POLinkContext = createContext<POLinkContextType | undefined>(undefined);

// Sample unlinked POs for demo purposes
const SAMPLE_UNLINKED_POS: POEntry[] = [
  {
    poNummer: 'PO-2026-001',
    menge: 2500,
    liefertermin: '15.04.2026',
    artikelId: '1',
    status: 'unlinked',
  },
  {
    poNummer: 'PO-2026-002',
    menge: 3000,
    liefertermin: '22.04.2026',
    artikelId: '1',
    status: 'unlinked',
  },
  {
    poNummer: 'PO-2026-003',
    menge: 1500,
    liefertermin: '29.04.2026',
    artikelId: '2',
    status: 'unlinked',
  },
];

export function POLinkProvider({ children }: { children: ReactNode }) {
  const [unlinkedPOs, setUnlinkedPOs] = useState<POEntry[]>(SAMPLE_UNLINKED_POS);
  const [linkedWeeks, setLinkedWeeks] = useState<Map<string, string>>(new Map());

  const linkPO = useCallback((week: string, poNummer: string) => {
    // Update linked weeks
    setLinkedWeeks((prev) => {
      const next = new Map(prev);
      next.set(week, poNummer);
      return next;
    });

    // Update PO status
    setUnlinkedPOs((prev) =>
      prev.map((po) =>
        po.poNummer === poNummer
          ? { ...po, status: 'linked' as const, linkedWeek: week }
          : po
      )
    );
  }, []);

  const unlinkPO = useCallback((week: string) => {
    const poNummer = linkedWeeks.get(week);
    
    // Remove from linked weeks
    setLinkedWeeks((prev) => {
      const next = new Map(prev);
      next.delete(week);
      return next;
    });

    // Update PO status back to unlinked
    if (poNummer) {
      setUnlinkedPOs((prev) =>
        prev.map((po) =>
          po.poNummer === poNummer
            ? { ...po, status: 'unlinked' as const, linkedWeek: undefined }
            : po
        )
      );
    }
  }, [linkedWeeks]);

  const getLinkedPO = useCallback(
    (week: string) => {
      return linkedWeeks.get(week);
    },
    [linkedWeeks]
  );

  const addUnlinkedPO = useCallback((po: POEntry) => {
    setUnlinkedPOs((prev) => [...prev, { ...po, status: 'unlinked' }]);
  }, []);

  const removeUnlinkedPO = useCallback((poNummer: string) => {
    setUnlinkedPOs((prev) => prev.filter((po) => po.poNummer !== poNummer));
  }, []);

  const unlinkedCount = useMemo(() => {
    return unlinkedPOs.filter((po) => po.status === 'unlinked').length;
  }, [unlinkedPOs]);

  return (
    <POLinkContext.Provider
      value={{
        unlinkedPOs,
        linkedWeeks,
        linkPO,
        unlinkPO,
        getLinkedPO,
        unlinkedCount,
        addUnlinkedPO,
        removeUnlinkedPO,
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
