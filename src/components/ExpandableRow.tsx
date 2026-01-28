'use client';

import { ReactNode } from 'react';
import { TableRow, TableCell, IconButton, Box, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

interface StickyColumnStyles {
  position: 'sticky';
  left: number;
  zIndex: number;
  bgcolor: string;
  borderRight: string;
  borderRightColor: string;
}

interface ExpandableRowProps {
  id: string;
  label: string;
  level: 0 | 1 | 2;
  expanded: boolean;
  onToggle: (id: string) => void;
  hasChildren: boolean;
  children: ReactNode;
  stickyColumnStyles: StickyColumnStyles;
  cellPadding: string;
}

// Indentation per level
const INDENT_PER_LEVEL = 16;

export default function ExpandableRow({
  id,
  label,
  level,
  expanded,
  onToggle,
  hasChildren,
  children,
  stickyColumnStyles,
  cellPadding,
}: ExpandableRowProps) {
  const indent = level * INDENT_PER_LEVEL;

  // Clean label - remove prefix underscores for display
  const displayLabel = label.replace(/^_+/, '');

  // Prefix indicator for visual hierarchy
  const getPrefix = () => {
    if (level === 0) return '';
    if (level === 1) return '└ ';
    if (level === 2) return '  └ ';
    return '';
  };

  return (
    <TableRow
      sx={{
        bgcolor: level > 0 ? 'grey.50' : 'background.paper',
        '& > td': {
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
        },
      }}
    >
      <TableCell
        sx={{
          padding: cellPadding,
          fontWeight: level === 0 ? 500 : 400,
          ...stickyColumnStyles,
          bgcolor: level > 0 ? 'grey.50' : stickyColumnStyles.bgcolor,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            pl: `${indent}px`,
          }}
        >
          {hasChildren ? (
            <IconButton
              size="small"
              onClick={() => onToggle(id)}
              sx={{ mr: 0.5, p: 0.25 }}
            >
              {expanded ? (
                <KeyboardArrowDownIcon fontSize="small" />
              ) : (
                <KeyboardArrowRightIcon fontSize="small" />
              )}
            </IconButton>
          ) : (
            <Box sx={{ width: 24, mr: 0.5 }} /> // Spacer for alignment
          )}
          <Typography
            variant="body2"
            sx={{
              fontWeight: level === 0 ? 500 : 400,
              color: level === 0 ? 'text.primary' : 'text.secondary',
              fontSize: level > 0 ? '0.8125rem' : '0.875rem',
            }}
          >
            {getPrefix()}{displayLabel}
          </Typography>
        </Box>
      </TableCell>
      {children}
    </TableRow>
  );
}

// Row configuration definitions for the forecast table
export interface RowDefinition {
  id: string;
  label: string;
  level: 0 | 1 | 2;
  parentId?: string;
  hasChildren: boolean;
  dataPath: string; // Path to data in WeeklyData (e.g., 'salesForecastBreakdown.baseline')
  editable: boolean;
  editableInFuture: boolean;
  showPOTooltip?: boolean;
  clickableForPOLinking?: boolean;
  colorCoded?: 'lagerbestand'; // Special color coding
  calculated?: boolean; // Whether this is a calculated value
}

// Define all rows for the forecast table
export const ROW_DEFINITIONS: RowDefinition[] = [
  // Lagerbestand (Anfangs KW)
  {
    id: 'lagerbestandAnfang',
    label: 'Lagerbestand (Anfangs KW)',
    level: 0,
    hasChildren: false,
    dataPath: 'lagerbestandAnfang',
    editable: false,
    editableInFuture: false,
    colorCoded: 'lagerbestand',
  },
  // Sales Budget Stück
  {
    id: 'salesBudget',
    label: 'Sales Budget Stück',
    level: 0,
    hasChildren: true,
    dataPath: 'salesBudget',
    editable: false,
    editableInFuture: false,
  },
  {
    id: 'salesBudget_baseline',
    label: '_Baseline',
    level: 1,
    parentId: 'salesBudget',
    hasChildren: false,
    dataPath: 'salesBudgetBreakdown.baseline',
    editable: false,
    editableInFuture: false,
  },
  {
    id: 'salesBudget_promo',
    label: '_Promo',
    level: 1,
    parentId: 'salesBudget',
    hasChildren: true,
    dataPath: 'salesBudgetBreakdown.promo',
    editable: false,
    editableInFuture: false,
    calculated: true,
  },
  {
    id: 'salesBudget_promo_kartonware',
    label: '__Promo (Kartonware)',
    level: 2,
    parentId: 'salesBudget_promo',
    hasChildren: false,
    dataPath: 'salesBudgetBreakdown.promo.kartonware',
    editable: false,
    editableInFuture: false,
  },
  {
    id: 'salesBudget_promo_displays',
    label: '__Promo (für auf Displays)',
    level: 2,
    parentId: 'salesBudget_promo',
    hasChildren: false,
    dataPath: 'salesBudgetBreakdown.promo.displays',
    editable: false,
    editableInFuture: false,
  },
  // Sales Latest Forecast Stück
  {
    id: 'salesLatestForecast',
    label: 'Sales Latest Forecast Stück',
    level: 0,
    hasChildren: true,
    dataPath: 'salesLatestForecast',
    editable: false,
    editableInFuture: false,
    calculated: true,
  },
  {
    id: 'salesForecast_baseline',
    label: '_Baseline',
    level: 1,
    parentId: 'salesLatestForecast',
    hasChildren: false,
    dataPath: 'salesForecastBreakdown.baseline',
    editable: false,
    editableInFuture: true, // Editable in future weeks
  },
  {
    id: 'salesForecast_promo',
    label: '_Promo',
    level: 1,
    parentId: 'salesLatestForecast',
    hasChildren: true,
    dataPath: 'salesForecastBreakdown.promo',
    editable: false,
    editableInFuture: false,
    calculated: true,
  },
  {
    id: 'salesForecast_promo_kartonware',
    label: '__Promo (Kartonware)',
    level: 2,
    parentId: 'salesForecast_promo',
    hasChildren: false,
    dataPath: 'salesForecastBreakdown.promo.kartonware',
    editable: false,
    editableInFuture: true, // Editable in future weeks
  },
  {
    id: 'salesForecast_promo_displays',
    label: '__Promo (für auf Displays)',
    level: 2,
    parentId: 'salesForecast_promo',
    hasChildren: false,
    dataPath: 'salesForecastBreakdown.promo.displays',
    editable: false,
    editableInFuture: true, // Editable in future weeks
  },
  // Sales Order im System
  {
    id: 'salesOrderImSystem',
    label: 'Sales Order im System',
    level: 0,
    hasChildren: false,
    dataPath: 'salesOrderImSystem',
    editable: false,
    editableInFuture: false,
  },
  // Sales Actuals
  {
    id: 'salesActuals',
    label: 'Sales Actuals',
    level: 0,
    hasChildren: false,
    dataPath: 'salesActuals',
    editable: false,
    editableInFuture: false,
  },
  // Procurement PO Lieferant
  {
    id: 'procurementPo',
    label: 'Procurement PO Lieferant',
    level: 0,
    hasChildren: true,
    dataPath: 'procurementPo',
    editable: false,
    editableInFuture: false,
    calculated: true,
  },
  {
    id: 'procurement_forecast',
    label: '_Procurement Forecast',
    level: 1,
    parentId: 'procurementPo',
    hasChildren: false,
    dataPath: 'procurementBreakdown.forecast',
    editable: false,
    editableInFuture: false,
    clickableForPOLinking: true,
  },
  {
    id: 'procurement_bestellt',
    label: '_PO bestellt',
    level: 1,
    parentId: 'procurementPo',
    hasChildren: false,
    dataPath: 'procurementBreakdown.posBestellt',
    editable: false,
    editableInFuture: false,
    showPOTooltip: true,
  },
  {
    id: 'procurement_geliefert',
    label: '_PO geliefert',
    level: 1,
    parentId: 'procurementPo',
    hasChildren: false,
    dataPath: 'procurementBreakdown.posGeliefert',
    editable: false,
    editableInFuture: false,
    showPOTooltip: true,
  },
  // Lagerbestand (Ende KW)
  {
    id: 'lagerbestandEnde',
    label: 'Lagerbestand (Ende KW)',
    level: 0,
    hasChildren: false,
    dataPath: 'lagerbestandEnde',
    editable: false,
    editableInFuture: false,
    colorCoded: 'lagerbestand',
    calculated: true,
  },
];

// Helper to get visible rows based on expansion state
export function getVisibleRows(
  expandedRows: Set<string>
): RowDefinition[] {
  const visible: RowDefinition[] = [];

  for (const row of ROW_DEFINITIONS) {
    // Level 0 rows are always visible
    if (row.level === 0) {
      visible.push(row);
      continue;
    }

    // Check if parent is expanded
    if (row.parentId && expandedRows.has(row.parentId)) {
      // For level 2, also check grandparent
      if (row.level === 2) {
        const parent = ROW_DEFINITIONS.find(r => r.id === row.parentId);
        if (parent?.parentId && expandedRows.has(parent.parentId)) {
          visible.push(row);
        }
      } else {
        visible.push(row);
      }
    }
  }

  return visible;
}

// Helper to get value from nested path
export function getValueFromPath(data: any, path: string): any {
  const parts = path.split('.');
  let value = data;
  
  for (const part of parts) {
    if (value === undefined || value === null) return undefined;
    value = value[part];
  }
  
  return value;
}
