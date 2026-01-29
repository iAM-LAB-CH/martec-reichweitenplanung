'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { WeeklyData, RowDefinition, WeekStatus, DailyProcurement } from '@/lib/types';
import { getInventoryDisplayInfo, formatNumber } from '@/lib/calculations';
import { getWeekStatus, parseWeekNumber, isWeekEditable } from '@/lib/timeUtils';
import { usePOLink } from '@/lib/POLinkContext';
import EditableCell from './EditableCell';

// Weekday labels
const WEEKDAYS = ['mo', 'di', 'mi', 'do', 'fr'] as const;
type Weekday = typeof WEEKDAYS[number];

const WEEKDAY_LABELS: Record<Weekday, string> = {
  mo: 'Mo',
  di: 'Di',
  mi: 'Mi',
  do: 'Do',
  fr: 'Fr',
};

// Sales budget row IDs (fixed values - should be grey)
const SALES_BUDGET_ROWS = new Set([
  'salesBudget',
  'salesBudgetBaseline',
  'salesBudgetPromo',
  'salesBudgetPromoKarton',
  'salesBudgetPromoDisplays',
]);

// Row definitions with full hierarchy
const ROW_DEFINITIONS: RowDefinition[] = [
  // Row 1: Inventory Start
  { 
    id: 'lagerbestandAnfang', 
    label: 'Lagerbestand (Anfangs KW)', 
    level: 0,
    field: 'lagerbestandAnfang',
    editable: false 
  },
  
  // Row 2: Sales Budget with breakdown (FIXED - grey text)
  { 
    id: 'salesBudget', 
    label: 'Sales Budget Stück', 
    level: 0,
    field: 'salesBudget',
    editable: false,
    expandable: true,
    children: ['salesBudgetBaseline', 'salesBudgetPromo']
  },
  { 
    id: 'salesBudgetBaseline', 
    label: 'Baseline', 
    level: 1,
    field: 'salesBudgetBreakdown.baseline',
    editable: false,
    parent: 'salesBudget'
  },
  { 
    id: 'salesBudgetPromo', 
    label: 'Promo', 
    level: 1,
    field: 'salesBudgetBreakdown.promo',
    editable: false,
    parent: 'salesBudget',
    expandable: true,
    children: ['salesBudgetPromoKarton', 'salesBudgetPromoDisplays']
  },
  { 
    id: 'salesBudgetPromoKarton', 
    label: 'Promo (Kartonware)', 
    level: 2,
    field: 'salesBudgetBreakdown.promo.kartonware',
    editable: false,
    parent: 'salesBudgetPromo'
  },
  { 
    id: 'salesBudgetPromoDisplays', 
    label: 'Promo (für auf Displays)', 
    level: 2,
    field: 'salesBudgetBreakdown.promo.displays',
    editable: false,
    parent: 'salesBudgetPromo'
  },
  
  // Row 3: Sales Latest Forecast with breakdown (EDITABLE)
  { 
    id: 'salesLatestForecast', 
    label: 'Sales Latest Forecast Stück', 
    level: 0,
    field: 'salesLatestForecast',
    editable: false, // Calculated from children
    expandable: true,
    children: ['forecastBaseline', 'forecastPromo']
  },
  { 
    id: 'forecastBaseline', 
    label: 'Baseline', 
    level: 1,
    field: 'salesForecastBreakdown.baseline',
    editable: true, // EDITABLE
    parent: 'salesLatestForecast'
  },
  { 
    id: 'forecastPromo', 
    label: 'Promo', 
    level: 1,
    field: 'salesForecastBreakdown.promo',
    editable: false, // Calculated
    parent: 'salesLatestForecast',
    expandable: true,
    children: ['forecastPromoKarton', 'forecastPromoDisplays']
  },
  { 
    id: 'forecastPromoKarton', 
    label: 'Promo (Kartonware)', 
    level: 2,
    field: 'salesForecastBreakdown.promo.kartonware',
    editable: true, // EDITABLE
    parent: 'forecastPromo'
  },
  { 
    id: 'forecastPromoDisplays', 
    label: 'Promo (für auf Displays)', 
    level: 2,
    field: 'salesForecastBreakdown.promo.displays',
    editable: true, // EDITABLE
    parent: 'forecastPromo'
  },
  
  // Row 4: Sales Orders
  { 
    id: 'salesOrderImSystem', 
    label: 'Sales Order im System', 
    level: 0,
    field: 'salesOrderImSystem',
    editable: false 
  },
  
  // Row 5: Sales Actuals (past only)
  { 
    id: 'salesActuals', 
    label: 'Sales Actuals', 
    level: 0,
    field: 'salesActuals',
    editable: false,
    pastOnly: true
  },
  
  // Row 6: Procurement PO with breakdown
  { 
    id: 'procurementPo', 
    label: 'Procurement PO Lieferant', 
    level: 0,
    field: 'procurementPo',
    editable: false,
    expandable: true,
    hasDailyBreakdown: true,
    children: ['procurementForecast', 'poOrdered', 'poDelivered']
  },
  { 
    id: 'procurementForecast', 
    label: 'Procurement Forecast', 
    level: 1,
    field: 'procurementBreakdown.forecast',
    editable: true, // EDITABLE (day-level too)
    parent: 'procurementPo',
    hasDailyBreakdown: true
  },
  { 
    id: 'poOrdered', 
    label: 'PO bestellt', 
    level: 1,
    field: 'procurementBreakdown.ordered',
    editable: false,
    parent: 'procurementPo',
    hasDailyBreakdown: true,
    showTooltip: true // Show PO number
  },
  { 
    id: 'poDelivered', 
    label: 'PO geliefert', 
    level: 1,
    field: 'procurementBreakdown.delivered',
    editable: false,
    parent: 'procurementPo',
    hasDailyBreakdown: true,
    showTooltip: true // Show PO number
  },
  
  // Row 7: Inventory End
  { 
    id: 'lagerbestandEnde', 
    label: 'Lagerbestand (Ende KW)', 
    level: 0,
    field: 'lagerbestandEnde',
    editable: false,
    colorCoded: true // Green/Red based on value
  },
];

interface ForecastTableProps {
  weeklyData: WeeklyData[];
  articleId?: string;
  compact?: boolean;
  variant?: 'recommendations' | 'detail';
  disableScroll?: boolean;
  currentWeek?: number;
}

export default function ForecastTable({ 
  weeklyData, 
  articleId, 
  compact = false, 
  variant = 'detail', 
  disableScroll = false,
  currentWeek = 13, // Default to KW13
}: ForecastTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  
  // Get PO link context for PO tooltips
  const { getLinkedPO } = usePOLink();

  // Toggle row expansion
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
        // Also collapse children recursively
        const collapseChildren = (parentId: string) => {
          ROW_DEFINITIONS
            .filter(r => r.parent === parentId)
            .forEach(child => {
              next.delete(child.id);
              collapseChildren(child.id);
            });
        };
        collapseChildren(rowId);
      } else {
        next.add(rowId);
        // Also expand children recursively
        const expandChildren = (parentId: string) => {
          ROW_DEFINITIONS
            .filter(r => r.parent === parentId)
            .forEach(child => {
              if (child.expandable) {
                next.add(child.id);
                expandChildren(child.id);
              }
            });
        };
        expandChildren(rowId);
      }
      return next;
    });
  };

  // Toggle week expansion for daily breakdown
  const toggleWeekExpansion = (week: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) {
        next.delete(week);
      } else {
        next.add(week);
      }
      return next;
    });
  };

  // Check if a row should be visible
  const isRowVisible = (rowDef: RowDefinition): boolean => {
    if (rowDef.level === 0) return true;
    if (!rowDef.parent) return true;
    
    // Check if all parent rows are expanded
    let currentParent = rowDef.parent;
    while (currentParent) {
      if (!expandedRows.has(currentParent)) return false;
      const parentDef = ROW_DEFINITIONS.find(r => r.id === currentParent);
      currentParent = parentDef?.parent;
    }
    return true;
  };

  // Get value from nested field path
  const getFieldValue = (data: WeeklyData, fieldPath: string): number | undefined => {
    const parts = fieldPath.split('.');
    let value: unknown = data;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    
    return typeof value === 'number' ? value : undefined;
  };

  // Get daily value for procurement breakdown
  const getDailyValue = (data: WeeklyData, day: Weekday): number | undefined => {
    return data.procurementDaily?.[day];
  };

  // Check if cell is editable based on row definition and week status
  const isCellEditable = (rowDef: RowDefinition, weekStatus: WeekStatus): boolean => {
    if (!rowDef.editable) return false;
    return isWeekEditable(weekStatus);
  };

  // Get cell background color
  const getCellBackgroundColor = (
    rowDef: RowDefinition, 
    value: number | undefined,
    weekStatus: WeekStatus,
    isEditable: boolean,
    isDaily: boolean = false
  ): string => {
    // Color-coded inventory cells
    if (rowDef.colorCoded && value !== undefined) {
      if (value > 0) return 'rgba(76, 175, 80, 0.15)';
      if (value < 0) return 'rgba(244, 67, 54, 0.15)';
    }
    
    // Daily breakdown has slightly different styling
    if (isDaily) {
      if (weekStatus === 'past') return 'rgba(0, 0, 0, 0.04)';
      if (weekStatus === 'current') return 'rgba(25, 118, 210, 0.06)';
      if (isEditable) return 'rgba(0, 0, 0, 0.02)';
      return 'transparent';
    }
    
    // Past week styling
    if (weekStatus === 'past') return 'grey.50';
    
    // Current week highlight
    if (weekStatus === 'current') return 'rgba(25, 118, 210, 0.08)';
    
    // Editable cell background
    if (isEditable) return 'grey.100';
    
    return 'transparent';
  };

  // Check if row is a sales budget row (fixed values - grey text)
  const isSalesBudgetRow = (rowId: string): boolean => {
    return SALES_BUDGET_ROWS.has(rowId);
  };

  // Format cell value
  const formatCellValue = (
    rowDef: RowDefinition,
    value: number | undefined
  ): React.ReactNode => {
    if (value === undefined || value === null) return '-';
    
    if (rowDef.colorCoded) {
      const { display, color } = getInventoryDisplayInfo(value);
      return (
        <Typography
          variant="body2"
          sx={{
            color,
            fontWeight: value !== 0 ? 600 : 400,
            fontSize: '14px',
          }}
        >
          {display}
        </Typography>
      );
    }

    // Sales budget rows are grey (fixed values)
    const isFixed = isSalesBudgetRow(rowDef.id);
    
    return (
      <Typography 
        variant="body2" 
        sx={{ 
          fontSize: '14px',
          color: isFixed ? 'text.secondary' : 'text.primary',
        }}
      >
        {formatNumber(value)}
      </Typography>
    );
  };

  // Memoize visible rows
  const visibleRows = useMemo(() => {
    return ROW_DEFINITIONS.filter(isRowVisible);
  }, [expandedRows]);

  const cellPadding = compact ? '4px 6px' : '6px 8px';
  const dailyCellPadding = compact ? '2px 4px' : '4px 6px';

  // Sticky first column styles
  const stickyColumnStyles = {
    position: 'sticky' as const,
    left: 0,
    zIndex: 2,
    bgcolor: variant === 'recommendations' ? 'grey.50' : 'background.paper',
    borderRight: '1px solid',
    borderRightColor: 'divider',
  };

  // Map field IDs to CellChangeField types for EditableCell
  const getChangeFieldType = (rowId: string): 'forecastBaseline' | 'forecastPromoKarton' | 'forecastPromoDisplays' | 'procurementForecast' => {
    switch (rowId) {
      case 'forecastBaseline':
        return 'forecastBaseline';
      case 'forecastPromoKarton':
        return 'forecastPromoKarton';
      case 'forecastPromoDisplays':
        return 'forecastPromoDisplays';
      case 'procurementForecast':
        return 'procurementForecast';
      default:
        return 'forecastBaseline';
    }
  };

  // Render daily cells for a row when week is expanded
  const renderDailyCells = (
    rowDef: RowDefinition,
    data: WeeklyData,
    weekStatus: WeekStatus
  ) => {
    if (!rowDef.hasDailyBreakdown) {
      // For rows without daily breakdown, render empty cells
      return WEEKDAYS.map((day) => (
        <TableCell
          key={`${data.week}-${day}`}
          align="right"
          sx={{
            padding: dailyCellPadding,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            borderLeft: day === 'mo' ? '1px dashed' : 'none',
            borderLeftColor: 'divider',
            fontSize: '14px',
          }}
        >
          -
        </TableCell>
      ));
    }

    const editable = rowDef.id === 'procurementForecast' && isWeekEditable(weekStatus);

    return WEEKDAYS.map((day) => {
      const dailyValue = getDailyValue(data, day);
      const bgColor = getCellBackgroundColor(rowDef, dailyValue, weekStatus, editable, true);

      if (editable && articleId) {
        return (
          <TableCell
            key={`${data.week}-${day}`}
            align="right"
            sx={{
              padding: dailyCellPadding,
              backgroundColor: bgColor,
              borderLeft: day === 'mo' ? '1px dashed' : 'none',
              borderLeftColor: 'divider',
            }}
          >
            <EditableCell
              articleId={articleId}
              field="procurementForecast"
              weekOrOrderId={data.week}
              originalValue={dailyValue ?? 0}
              formatValue={(v) => formatNumber(v)}
              fieldLabel={`${rowDef.label} ${WEEKDAY_LABELS[day]}`}
              day={day}
            />
          </TableCell>
        );
      }

      return (
        <TableCell
          key={`${data.week}-${day}`}
          align="right"
          sx={{
            padding: dailyCellPadding,
            backgroundColor: bgColor,
            borderLeft: day === 'mo' ? '1px dashed' : 'none',
            borderLeftColor: 'divider',
            fontSize: '14px',
          }}
        >
          {dailyValue !== undefined ? formatNumber(dailyValue) : '-'}
        </TableCell>
      );
    });
  };

  const tableContent = (
    <Table size={compact ? 'small' : 'medium'} sx={{ minWidth: 'max-content' }}>
      <TableHead>
        <TableRow>
          <TableCell 
            sx={{ 
              padding: cellPadding, 
              fontWeight: 500, 
              color: 'text.secondary', 
              minWidth: 180,
              ...stickyColumnStyles,
            }}
          >
            {/* Empty header for row labels */}
          </TableCell>
          {weeklyData.map((data) => {
            const weekNum = parseWeekNumber(data.week);
            const weekStatus = getWeekStatus(weekNum, currentWeek);
            const isExpanded = expandedWeeks.has(data.week);
            
            return (
              <>
                <TableCell
                  key={data.week}
                  align="center"
                  sx={{ 
                    padding: cellPadding, 
                    fontWeight: 500, 
                    color: 'text.secondary', 
                    minWidth: 60,
                    backgroundColor: weekStatus === 'current' ? 'rgba(25, 118, 210, 0.12)' : 'transparent',
                    fontSize: '14px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': {
                      backgroundColor: weekStatus === 'current' ? 'rgba(25, 118, 210, 0.18)' : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                  onClick={() => toggleWeekExpansion(data.week)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                    {isExpanded ? (
                      <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <KeyboardArrowRightIcon sx={{ fontSize: 14 }} />
                    )}
                    {data.week}
                  </Box>
                </TableCell>
                {isExpanded && WEEKDAYS.map((day) => (
                  <TableCell
                    key={`${data.week}-${day}-header`}
                    align="center"
                    sx={{
                      padding: dailyCellPadding,
                      fontWeight: 400,
                      color: 'text.secondary',
                      minWidth: 40,
                      backgroundColor: weekStatus === 'current' ? 'rgba(25, 118, 210, 0.06)' : 'rgba(0, 0, 0, 0.02)',
                      fontSize: '14px',
                      borderLeft: day === 'mo' ? '1px dashed' : 'none',
                      borderLeftColor: 'divider',
                    }}
                  >
                    {WEEKDAY_LABELS[day]}
                  </TableCell>
                ))}
              </>
            );
          })}
        </TableRow>
      </TableHead>
      <TableBody>
        {visibleRows.map((rowDef) => (
          <TableRow key={rowDef.id}>
            {/* Row label cell */}
            <TableCell 
              sx={{ 
                padding: cellPadding, 
                fontWeight: rowDef.level === 0 ? 500 : 400,
                ...stickyColumnStyles,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  pl: rowDef.level * 1.5, // Indentation based on level
                }}
              >
                {rowDef.expandable && (
                  <IconButton
                    size="small"
                    onClick={() => toggleRowExpansion(rowDef.id)}
                    sx={{ mr: 0.5, p: 0.25 }}
                  >
                    {expandedRows.has(rowDef.id) ? (
                      <KeyboardArrowDownIcon fontSize="small" />
                    ) : (
                      <KeyboardArrowRightIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: rowDef.level === 0 ? 500 : 400,
                    color: rowDef.level === 0 ? 'text.primary' : 'text.secondary',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {rowDef.label}
                </Typography>
              </Box>
            </TableCell>

            {/* Data cells */}
            {weeklyData.map((data) => {
              const weekNum = parseWeekNumber(data.week);
              const weekStatus = getWeekStatus(weekNum, currentWeek);
              const value = getFieldValue(data, rowDef.field);
              const editable = isCellEditable(rowDef, weekStatus);
              const bgColor = getCellBackgroundColor(rowDef, value, weekStatus, editable);
              const isWeekExpanded = expandedWeeks.has(data.week);

              // Skip rendering sales actuals for non-past weeks
              if (rowDef.pastOnly && weekStatus !== 'past') {
                return (
                  <>
                    <TableCell 
                      key={data.week} 
                      align="right" 
                      sx={{ 
                        padding: cellPadding,
                        backgroundColor: bgColor,
                        opacity: weekStatus === 'past' ? 0.8 : 1,
                        fontSize: '14px',
                      }}
                    >
                      <Typography variant="body2" color="text.disabled" sx={{ fontSize: '14px' }}>
                        -
                      </Typography>
                    </TableCell>
                    {isWeekExpanded && WEEKDAYS.map((day) => (
                      <TableCell
                        key={`${data.week}-${day}`}
                        align="right"
                        sx={{
                          padding: dailyCellPadding,
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                          borderLeft: day === 'mo' ? '1px dashed' : 'none',
                          borderLeftColor: 'divider',
                          fontSize: '14px',
                        }}
                      >
                        -
                      </TableCell>
                    ))}
                  </>
                );
              }

              // Check if this is a PO row that should show tooltip
              const isPORow = rowDef.id === 'poOrdered' || rowDef.id === 'poDelivered';
              const linkedPONumber = getLinkedPO(data.week);

              // Render editable cell (EditableCell handles PO linking internally for procurementForecast)
              if (editable && articleId) {
                return (
                  <>
                    <TableCell 
                      key={data.week} 
                      align="right" 
                      sx={{ 
                        padding: cellPadding,
                        backgroundColor: bgColor,
                      }}
                    >
                      <EditableCell
                        articleId={articleId}
                        field={getChangeFieldType(rowDef.id)}
                        weekOrOrderId={data.week}
                        originalValue={value ?? 0}
                        formatValue={formatNumber}
                        fieldLabel={rowDef.label}
                      />
                    </TableCell>
                    {isWeekExpanded && renderDailyCells(rowDef, data, weekStatus)}
                  </>
                );
              }

              // Render PO row with tooltip
              if (isPORow && linkedPONumber && value && value > 0) {
                return (
                  <>
                    <Tooltip title={`PO: ${linkedPONumber}`} arrow placement="top">
                      <TableCell 
                        key={data.week} 
                        align="right" 
                        sx={{ 
                          padding: cellPadding,
                          backgroundColor: bgColor,
                          opacity: weekStatus === 'past' ? 0.8 : 1,
                          fontSize: '14px',
                        }}
                      >
                        {formatCellValue(rowDef, value)}
                      </TableCell>
                    </Tooltip>
                    {isWeekExpanded && renderDailyCells(rowDef, data, weekStatus)}
                  </>
                );
              }

              // Render regular cell
              return (
                <>
                  <TableCell 
                    key={data.week} 
                    align="right" 
                    sx={{ 
                      padding: cellPadding,
                      backgroundColor: bgColor,
                      opacity: weekStatus === 'past' ? 0.8 : 1,
                      fontSize: '14px',
                    }}
                  >
                    {formatCellValue(rowDef, value)}
                  </TableCell>
                  {isWeekExpanded && renderDailyCells(rowDef, data, weekStatus)}
                </>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // When disableScroll is true, return table without scroll wrapper
  if (disableScroll) {
    return tableContent;
  }

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
        {tableContent}
      </Box>
    </Box>
  );
}
