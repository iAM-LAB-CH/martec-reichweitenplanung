'use client';

import { useState, useRef, useMemo } from 'react';
import { TableCell, Typography, Tooltip, Box } from '@mui/material';
import { DailyProcurement, POEntry, CellChangeField } from '@/lib/types';
import { useChanges } from '@/lib/ChangesContext';
import CommentPopover from './CommentPopover';

interface DailyBreakdownProps {
  dailyProcurement?: DailyProcurement;
  posBestellt?: POEntry[];
  posGeliefert?: POEntry[];
  cellPadding: string;
  /** If provided, enables day-level editing */
  isEditable?: boolean;
  /** Called when a day value is edited - receives the week total after edit */
  onDayEdit?: (day: keyof DailyProcurement, newValue: number, weekTotal: number) => void;
  /** Row type for editing context */
  rowType?: 'forecast' | 'bestellt' | 'geliefert' | 'total';
  /** Article ID for tracking changes */
  articleId?: string;
  /** Week string for tracking changes */
  week?: string;
}

const DAYS = ['mo', 'di', 'mi', 'do', 'fr'] as const;
const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

// Map day to field name
const dayToField: Record<string, CellChangeField> = {
  mo: 'procurementForecast_mo',
  di: 'procurementForecast_di',
  mi: 'procurementForecast_mi',
  do: 'procurementForecast_do',
  fr: 'procurementForecast_fr',
};

export default function DailyBreakdown({
  dailyProcurement,
  posBestellt = [],
  posGeliefert = [],
  cellPadding,
  isEditable = false,
  onDayEdit,
  rowType = 'total',
  articleId,
  week,
}: DailyBreakdownProps) {
  const [editingDay, setEditingDay] = useState<keyof DailyProcurement | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({});
  const { addChange, getChangeForCell } = useChanges();

  // Get effective values considering any changes
  const effectiveValues = useMemo(() => {
    const values: DailyProcurement = { mo: 0, di: 0, mi: 0, do: 0, fr: 0 };
    DAYS.forEach(day => {
      const originalValue = dailyProcurement?.[day] ?? 0;
      if (articleId && week) {
        const change = getChangeForCell(articleId, dayToField[day], week);
        values[day] = change ? change.newValue : originalValue;
      } else {
        values[day] = originalValue;
      }
    });
    return values;
  }, [dailyProcurement, articleId, week, getChangeForCell]);

  // Calculate week total from effective day values
  const weekTotal = useMemo(() => {
    return DAYS.reduce((sum, day) => sum + effectiveValues[day], 0);
  }, [effectiveValues]);
  const formatNumber = (num: number) => {
    if (num === 0) return '-';
    return num.toLocaleString('de-CH');
  };

  // Get combined PO info for tooltip
  const getPOInfo = (day: string) => {
    const allPOs = [...posBestellt, ...posGeliefert];
    // In a real implementation, each PO would have a delivery day
    // For now, we'll show all POs in the tooltip
    return allPOs.map(po => `${po.poNummer}: ${po.menge.toLocaleString('de-CH')} St.`).join('\n');
  };

  const handleDayClick = (day: keyof DailyProcurement) => {
    if (isEditable && rowType === 'forecast' && articleId && week) {
      setEditingDay(day);
    }
  };

  const handleEditAccept = (newValue: number, comment: string = '') => {
    if (editingDay && articleId && week) {
      const originalValue = dailyProcurement?.[editingDay] ?? 0;
      
      // Add change to context
      addChange({
        articleId,
        field: dayToField[editingDay],
        week,
        originalValue,
        newValue,
        comment,
      });

      // Calculate new week total
      const newWeekTotal = DAYS.reduce((sum, day) => {
        if (day === editingDay) return sum + newValue;
        return sum + effectiveValues[day];
      }, 0);

      // Notify parent of change with new week total
      if (onDayEdit) {
        onDayEdit(editingDay, newValue, newWeekTotal);
      }
    }
    setEditingDay(null);
  };

  const handleEditClose = () => {
    setEditingDay(null);
  };

  return (
    <>
      {DAYS.map((day, index) => {
        const originalValue = dailyProcurement?.[day] ?? 0;
        const value = effectiveValues[day];
        const hasChange = articleId && week && getChangeForCell(articleId, dayToField[day], week);
        const poInfo = getPOInfo(day);
        const hasValue = value > 0;
        const canEdit = isEditable && rowType === 'forecast' && articleId && week;

        return (
          <TableCell
            key={day}
            ref={(el: HTMLTableCellElement | null) => { cellRefs.current[day] = el; }}
            align="center"
            onClick={() => handleDayClick(day)}
            sx={{
              padding: cellPadding,
              minWidth: 50,
              backgroundColor: hasChange
                ? 'rgba(255, 193, 7, 0.2)'
                : hasValue 
                  ? 'rgba(76, 175, 80, 0.08)' 
                  : canEdit 
                    ? 'grey.100' 
                    : 'transparent',
              borderLeft: index === 0 ? '2px solid' : '1px solid',
              borderLeftColor: index === 0 ? 'primary.main' : 'divider',
              borderRight: index === DAYS.length - 1 ? '2px solid' : undefined,
              borderRightColor: index === DAYS.length - 1 ? 'primary.main' : undefined,
              cursor: canEdit ? 'pointer' : 'default',
              border: hasChange ? '1px solid' : undefined,
              borderColor: hasChange ? 'warning.main' : undefined,
              '&:hover': canEdit ? { backgroundColor: hasChange ? 'rgba(255, 193, 7, 0.3)' : 'grey.200' } : {},
            }}
          >
            {hasValue && poInfo ? (
              <Tooltip title={poInfo} arrow placement="top">
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: hasChange ? 600 : 500,
                    color: hasChange ? 'warning.dark' : 'success.main',
                    cursor: canEdit ? 'pointer' : 'help',
                  }}
                >
                  {formatNumber(value)}
                </Typography>
              </Tooltip>
            ) : (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: hasChange ? 600 : 400,
                  color: hasChange ? 'warning.dark' : canEdit ? 'text.primary' : 'text.disabled',
                }}
              >
                {formatNumber(value)}
              </Typography>
            )}
          </TableCell>
        );
      })}
      
      {/* Edit popover for day-level editing */}
      {editingDay && (
        <CommentPopover
          open={true}
          anchorEl={cellRefs.current[editingDay]}
          onClose={handleEditClose}
          currentValue={effectiveValues[editingDay]}
          originalValue={dailyProcurement?.[editingDay] ?? 0}
          onAccept={(newValue, comment) => handleEditAccept(newValue, comment)}
          onReject={handleEditClose}
          fieldLabel={`Procurement Forecast (${DAY_LABELS[DAYS.indexOf(editingDay)]})`}
        />
      )}
    </>
  );
}

// Daily breakdown header cells
export function DailyBreakdownHeader({ cellPadding }: { cellPadding: string }) {
  return (
    <>
      {DAY_LABELS.map((label, index) => (
        <TableCell
          key={label}
          align="center"
          sx={{
            padding: cellPadding,
            fontWeight: 500,
            color: 'text.secondary',
            minWidth: 50,
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
            borderLeft: index === 0 ? '2px solid' : '1px solid',
            borderLeftColor: index === 0 ? 'primary.main' : 'divider',
            borderRight: index === DAY_LABELS.length - 1 ? '2px solid' : undefined,
            borderRightColor: index === DAY_LABELS.length - 1 ? 'primary.main' : undefined,
          }}
        >
          {label}
        </TableCell>
      ))}
    </>
  );
}

// Empty daily breakdown cells (for rows that don't have daily data)
export function DailyBreakdownEmpty({ cellPadding }: { cellPadding: string }) {
  return (
    <>
      {DAYS.map((day, index) => (
        <TableCell
          key={day}
          align="center"
          sx={{
            padding: cellPadding,
            minWidth: 50,
            backgroundColor: 'grey.50',
            borderLeft: index === 0 ? '2px solid' : '1px solid',
            borderLeftColor: index === 0 ? 'primary.main' : 'divider',
            borderRight: index === DAYS.length - 1 ? '2px solid' : undefined,
            borderRightColor: index === DAYS.length - 1 ? 'primary.main' : undefined,
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            -
          </Typography>
        </TableCell>
      ))}
    </>
  );
}
