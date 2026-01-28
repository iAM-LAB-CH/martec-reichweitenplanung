'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  Tooltip,
  Chip,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import TodayIcon from '@mui/icons-material/Today';
import { WeeklyData, POEntry, TemporalState, DailyProcurement } from '@/lib/types';
import { ROW_DEFINITIONS, getVisibleRows, getValueFromPath, RowDefinition } from './ExpandableRow';
import { DailyBreakdownHeader, DailyBreakdownEmpty } from './DailyBreakdown';
import DailyBreakdown from './DailyBreakdown';
import POLinkPopover, { POLinkCell } from './POLinkPopover';
import EditableCell from './EditableCell';
import { getCurrentWeekNumber, getWeekYear, getWeekTemporalState, isCurrentWeek, parseWeekString } from '@/lib/timeUtils';
import { sumPOEntries, calculateAdaptiveForecast } from '@/lib/calculations';
import { usePOLink } from '@/lib/POLinkContext';
import { useChanges } from '@/lib/ChangesContext';

// Week range presets
const WEEK_RANGE_OPTIONS = [
  { label: '12 Wochen', value: 12 },
  { label: '26 Wochen', value: 26 },
  { label: '52 Wochen', value: 52 },
  { label: '2 Jahre', value: 104 },
];

interface ForecastTableProps {
  weeklyData: WeeklyData[];
  articleId?: string;
  compact?: boolean;
  variant?: 'recommendations' | 'detail';
  disableScroll?: boolean;
  unlinkedPOs?: POEntry[];
  onLinkPO?: (week: string, poNummer: string) => void;
  /** Initial number of weeks to display (default: 12) */
  initialWeekRange?: number;
  /** Hide navigation controls */
  hideControls?: boolean;
}

export default function ForecastTable({
  weeklyData,
  articleId,
  compact = false,
  variant = 'detail',
  disableScroll = false,
  unlinkedPOs = [],
  onLinkPO,
  initialWeekRange = 12,
  hideControls = false,
}: ForecastTableProps) {
  // Current week context
  const currentWeek = getCurrentWeekNumber();
  const currentYear = getWeekYear();

  // Find index of current week in data
  const currentWeekIndex = useMemo(() => {
    return weeklyData.findIndex(w => 
      isCurrentWeek(w.week, w.year, currentWeek, currentYear)
    );
  }, [weeklyData, currentWeek, currentYear]);

  // Week range state - how many weeks to show
  const [weekRange, setWeekRange] = useState(initialWeekRange);
  
  // Start index for visible weeks (allows scrolling through time)
  const [startIndex, setStartIndex] = useState(() => {
    // Default: show 4 weeks before current week
    const idealStart = Math.max(0, currentWeekIndex - 4);
    return idealStart;
  });

  // Calculate visible weeks based on range and start index
  const visibleWeeklyData = useMemo(() => {
    const endIndex = Math.min(startIndex + weekRange, weeklyData.length);
    return weeklyData.slice(startIndex, endIndex);
  }, [weeklyData, startIndex, weekRange]);

  // Navigation handlers
  const handleNavigateBack = useCallback(() => {
    setStartIndex(prev => Math.max(0, prev - 4));
  }, []);

  const handleNavigateForward = useCallback(() => {
    setStartIndex(prev => Math.min(weeklyData.length - weekRange, prev + 4));
  }, [weeklyData.length, weekRange]);

  const handleJumpToCurrent = useCallback(() => {
    const idealStart = Math.max(0, currentWeekIndex - 4);
    setStartIndex(idealStart);
  }, [currentWeekIndex]);

  const handleWeekRangeChange = useCallback((newRange: number) => {
    setWeekRange(newRange);
    // Adjust start index if needed to keep view valid
    setStartIndex(prev => Math.min(prev, Math.max(0, weeklyData.length - newRange)));
  }, [weeklyData.length]);

  // Expansion state - default all collapsed
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Week expansion state - current week expanded by default (but not auto-expanded)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  
  // PO Link popover state
  const [poLinkAnchor, setPOLinkAnchor] = useState<HTMLElement | null>(null);
  const [poLinkWeek, setPOLinkWeek] = useState<string>('');
  const [poLinkValue, setPOLinkValue] = useState<number>(0);

  // Get visible rows based on expansion state
  const visibleRows = useMemo(() => getVisibleRows(expandedRows), [expandedRows]);

  // Toggle row expansion - auto-expand all children for sales rows
  const handleToggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Collapse: remove this and all descendants
        next.delete(id);
        ROW_DEFINITIONS.filter(r => r.parentId === id).forEach(r => {
          next.delete(r.id);
          ROW_DEFINITIONS.filter(c => c.parentId === r.id).forEach(c => next.delete(c.id));
        });
      } else {
        // Expand: add this and all descendants for sales rows
        next.add(id);
        if (id === 'salesLatestForecast' || id === 'salesBudget') {
          ROW_DEFINITIONS.filter(r => r.parentId === id).forEach(r => {
            next.add(r.id);
            ROW_DEFINITIONS.filter(c => c.parentId === r.id).forEach(c => next.add(c.id));
          });
        }
      }
      return next;
    });
  };

  // Toggle week expansion
  const handleToggleWeek = (week: string) => {
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

  // Format number in Swiss German format
  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '-';
    return num.toLocaleString('de-CH');
  };

  // Get temporal state for a week
  const getTemporalState = (data: WeeklyData): TemporalState => {
    return getWeekTemporalState(data.week, data.year, currentWeek, currentYear);
  };

  // Color coding for Lagerbestand values
  const getLagerbestandColor = (value: number) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.primary';
  };

  const getLagerbestandBgColor = (value: number) => {
    if (value > 0) return 'rgba(76, 175, 80, 0.08)';
    if (value < 0) return 'rgba(244, 67, 54, 0.08)';
    return 'transparent';
  };

  // Get cell value for a row and week
  // Get changes context for manual overrides
  const { getEffectiveValue } = useChanges();

  const getCellValue = (row: RowDefinition, data: WeeklyData): number | undefined => {
    const value = getValueFromPath(data, row.dataPath);
    const temporalState = getTemporalState(data);
    const weekNum = parseWeekString(data.week);
    
    // Handle PO arrays
    if (row.id === 'procurement_bestellt') {
      const pos = value as POEntry[] | undefined;
      return pos ? sumPOEntries(pos) : 0;
    }
    if (row.id === 'procurement_geliefert') {
      const pos = value as POEntry[] | undefined;
      return pos ? sumPOEntries(pos) : 0;
    }
    
    // Handle promo totals
    if (row.id === 'salesBudget_promo' || row.id === 'salesForecast_promo') {
      const promo = value as { kartonware: number; displays: number } | undefined;
      return promo ? promo.kartonware + promo.displays : 0;
    }
    
    // Apply adaptive forecast for salesLatestForecast in current/future weeks
    if (row.id === 'salesLatestForecast' && temporalState !== 'past' && articleId) {
      // Check for manual override in changes context
      const baselineChange = getEffectiveValue(articleId, 'salesForecastBaseline', data.salesForecastBreakdown.baseline, data.week);
      const kartonwareChange = getEffectiveValue(articleId, 'salesForecastPromoKartonware', data.salesForecastBreakdown.promo.kartonware, data.week);
      const displaysChange = getEffectiveValue(articleId, 'salesForecastPromoDisplays', data.salesForecastBreakdown.promo.displays, data.week);
      
      // If any manual changes, calculate total from components
      const hasManualChange = 
        baselineChange !== data.salesForecastBreakdown.baseline ||
        kartonwareChange !== data.salesForecastBreakdown.promo.kartonware ||
        displaysChange !== data.salesForecastBreakdown.promo.displays;
      
      if (hasManualChange) {
        // Use manual override total
        return baselineChange + kartonwareChange + displaysChange;
      }
      
      // Apply adaptive forecast calculation
      return calculateAdaptiveForecast(
        weekNum,
        data.salesBudget,
        data.salesOrderImSystem,
        data.salesActuals,
        undefined // No manual override at parent level
      );
    }
    
    // For editable sub-rows, apply changes from context
    if (articleId && row.id === 'salesForecast_baseline') {
      return getEffectiveValue(articleId, 'salesForecastBaseline', value ?? 0, data.week);
    }
    if (articleId && row.id === 'salesForecast_promo_kartonware') {
      return getEffectiveValue(articleId, 'salesForecastPromoKartonware', value ?? 0, data.week);
    }
    if (articleId && row.id === 'salesForecast_promo_displays') {
      return getEffectiveValue(articleId, 'salesForecastPromoDisplays', value ?? 0, data.week);
    }
    
    return value;
  };

  // Get PO tooltip content
  const getPOTooltip = (row: RowDefinition, data: WeeklyData): string | null => {
    if (!row.showPOTooltip) return null;
    
    const value = getValueFromPath(data, row.dataPath) as POEntry[] | undefined;
    if (!value || value.length === 0) return null;
    
    return value.map(po => `${po.poNummer}: ${formatNumber(po.menge)} St.`).join('\n');
  };

  // Check if cell is editable
  // Cells are editable in current and future weeks, not past
  const isCellEditable = (row: RowDefinition, temporalState: TemporalState): boolean => {
    if (temporalState === 'past') return false;
    // Allow editing in both current and future weeks
    if (row.editable) return true;
    if (row.editableInFuture && (temporalState === 'future' || temporalState === 'current')) return true;
    return false;
  };

  // PO Link context for state management
  const { isForecastLinked: checkForecastLinked } = usePOLink();

  // Check if forecast is linked for a week
  const isForecastLinked = (data: WeeklyData): boolean => {
    // Use context if articleId is provided, otherwise fall back to data
    if (articleId) {
      return checkForecastLinked(articleId, data.week);
    }
    return data.procurementBreakdown?.forecastLinked ?? false;
  };

  // Handle PO link click
  const handlePOLinkClick = (event: React.MouseEvent<HTMLElement>, week: string, value: number) => {
    if (unlinkedPOs.length > 0 && onLinkPO) {
      setPOLinkAnchor(event.currentTarget);
      setPOLinkWeek(week);
      setPOLinkValue(value);
    }
  };

  const handlePOLinkClose = () => {
    setPOLinkAnchor(null);
    setPOLinkWeek('');
    setPOLinkValue(0);
  };

  const handleLinkPO = (week: string, poNummer: string) => {
    if (onLinkPO) {
      onLinkPO(week, poNummer);
    }
    handlePOLinkClose();
  };

  // More dense cell padding
  const cellPadding = compact ? '4px 6px' : '6px 10px';

  // Sticky first column styles
  const stickyColumnStyles = {
    position: 'sticky' as const,
    left: 0,
    zIndex: 2,
    bgcolor: variant === 'recommendations' ? 'grey.50' : 'background.paper',
    borderRight: '1px solid',
    borderRightColor: 'divider',
  };

  // Render a data cell
  const renderCell = (row: RowDefinition, data: WeeklyData, index: number) => {
    const temporalState = getTemporalState(data);
    const value = getCellValue(row, data);
    const editable = isCellEditable(row, temporalState);
    const poTooltip = getPOTooltip(row, data);
    const isLagerbestand = row.colorCoded === 'lagerbestand';
    const isBudgetRow = row.id.startsWith('salesBudget');

    // Gray background for editable cells
    const editableBg = editable ? 'grey.100' : 'transparent';
    const bgColor = isLagerbestand ? getLagerbestandBgColor(value ?? 0) : editableBg;

    // Check if this is a PO linkable cell (procurement forecast)
    if (row.clickableForPOLinking) {
      const forecastValue = value ?? 0;
      const isLinked = isForecastLinked(data);
      
      return (
        <TableCell
          key={`${row.id}-${data.week}`}
          align="center"
          sx={{ padding: cellPadding, backgroundColor: bgColor }}
        >
          <POLinkCell
            value={forecastValue}
            week={data.week}
            isLinked={isLinked}
            hasUnlinkedPOs={unlinkedPOs.length > 0}
            onClick={(e) => handlePOLinkClick(e, data.week, forecastValue)}
          />
        </TableCell>
      );
    }

    // Editable cell
    if (editable && articleId) {
      const fieldMap: Record<string, string> = {
        'salesForecast_baseline': 'salesForecastBaseline',
        'salesForecast_promo_kartonware': 'salesForecastPromoKartonware',
        'salesForecast_promo_displays': 'salesForecastPromoDisplays',
      };
      const field = fieldMap[row.id] as any;
      
      if (field) {
        return (
          <TableCell
            key={`${row.id}-${data.week}`}
            align="center"
            sx={{ padding: cellPadding, backgroundColor: bgColor }}
          >
            <EditableCell
              articleId={articleId}
              field={field}
              weekOrOrderId={data.week}
              originalValue={value ?? 0}
              formatValue={formatNumber}
              fieldLabel={row.label}
              isEditable={true}
            />
          </TableCell>
        );
      }
    }

    // Lagerbestand colored cell
    if (isLagerbestand) {
      return (
        <TableCell
          key={`${row.id}-${data.week}`}
          align="center"
          sx={{
            padding: cellPadding,
            backgroundColor: bgColor,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: getLagerbestandColor(value ?? 0),
              fontWeight: (value ?? 0) !== 0 ? 600 : 400,
            }}
          >
            {formatNumber(value)}
          </Typography>
        </TableCell>
      );
    }

    // Cell with PO tooltip
    if (poTooltip) {
      return (
        <TableCell
          key={`${row.id}-${data.week}`}
          align="center"
          sx={{ padding: cellPadding, backgroundColor: bgColor }}
        >
          <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{poTooltip}</span>} arrow>
            <Typography
              variant="body2"
              sx={{ cursor: 'help', textDecoration: 'underline dotted' }}
            >
              {formatNumber(value)}
            </Typography>
          </Tooltip>
        </TableCell>
      );
    }

    // Sales Actuals - only show for past weeks
    if (row.id === 'salesActuals' && temporalState !== 'past') {
      return (
        <TableCell
          key={`${row.id}-${data.week}`}
          align="center"
          sx={{ padding: cellPadding, backgroundColor: 'grey.50' }}
        >
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            -
          </Typography>
        </TableCell>
      );
    }

    // Sales Latest Forecast - show filled triangle comparing to budget
    if (row.id === 'salesLatestForecast') {
      const budget = data.salesBudget;
      const forecast = value ?? 0;
      const isAboveBudget = forecast > budget;
      const isBelowBudget = forecast < budget;
      
      return (
        <TableCell
          key={`${row.id}-${data.week}`}
          align="center"
          sx={{ padding: cellPadding, backgroundColor: bgColor }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
            <Typography variant="body2">
              {formatNumber(value)}
            </Typography>
            {isAboveBudget && (
              <Typography component="span" sx={{ fontSize: 10, color: 'success.main', lineHeight: 1 }}>
                ▲
              </Typography>
            )}
            {isBelowBudget && (
              <Typography component="span" sx={{ fontSize: 10, color: 'error.main', lineHeight: 1 }}>
                ▼
              </Typography>
            )}
          </Box>
        </TableCell>
      );
    }

    // Regular cell - with grey text for budget rows
    return (
      <TableCell
        key={`${row.id}-${data.week}`}
        align="center"
        sx={{ padding: cellPadding, backgroundColor: bgColor }}
      >
        <Typography 
          variant="body2"
          sx={{ color: isBudgetRow ? 'text.secondary' : 'text.primary' }}
        >
          {formatNumber(value)}
        </Typography>
      </TableCell>
    );
  };

  // Check if a row should show daily breakdown
  const rowHasDailyBreakdown = (rowId: string) => {
    return ['procurementPo', 'procurement_forecast', 'procurement_bestellt', 'procurement_geliefert'].includes(rowId);
  };

  // Render row label with special indicators
  const renderRowLabel = (row: RowDefinition) => {
    const displayLabel = row.label.replace(/^_+/, '');
    
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          pl: `${row.level * 12}px`,
          cursor: row.hasChildren ? 'pointer' : 'default',
        }}
        onClick={row.hasChildren ? () => handleToggleExpand(row.id) : undefined}
      >
        {row.hasChildren && (
          <Typography
            component="span"
            sx={{ mr: 0.5, fontFamily: 'monospace', fontSize: '0.625rem' }}
          >
            {expandedRows.has(row.id) ? '▼' : '▶'}
          </Typography>
        )}
        <Typography
          variant="body2"
          sx={{
            fontWeight: row.level === 0 ? 500 : 400,
            color: row.id.startsWith('salesBudget') 
              ? 'text.secondary' 
              : row.level === 0 
                ? 'text.primary' 
                : 'text.secondary',
            fontSize: row.level > 0 ? '0.75rem' : '0.8125rem',
          }}
        >
          {displayLabel}
        </Typography>
        
        {/* Unlinked PO indicator for procurementPo row */}
        {row.id === 'procurementPo' && unlinkedPOs.length > 0 && (
          <Chip
            icon={<LinkOffIcon />}
            label={unlinkedPOs.length}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ ml: 0.5, height: 18, '& .MuiChip-icon': { fontSize: 12 }, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
          />
        )}
      </Box>
    );
  };

  // Navigation toolbar
  const navigationToolbar = !hideControls && (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1,
        py: 0.5,
        borderBottom: '1px solid',
        borderBottomColor: 'divider',
        bgcolor: variant === 'recommendations' ? 'grey.50' : 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton 
          size="small" 
          onClick={handleNavigateBack}
          disabled={startIndex === 0}
          title="4 Wochen zurück"
        >
          <NavigateBeforeIcon fontSize="small" />
        </IconButton>
        <Button
          size="small"
          variant="outlined"
          startIcon={<TodayIcon />}
          onClick={handleJumpToCurrent}
          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
        >
          Aktuelle Woche
        </Button>
        <IconButton 
          size="small" 
          onClick={handleNavigateForward}
          disabled={startIndex >= weeklyData.length - weekRange}
          title="4 Wochen vorwärts"
        >
          <NavigateNextIcon fontSize="small" />
        </IconButton>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Zeige {visibleWeeklyData.length} von {weeklyData.length} Wochen
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={weekRange}
            onChange={(e) => handleWeekRangeChange(e.target.value as number)}
            sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 } }}
          >
            {WEEK_RANGE_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.75rem' }}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );

  const tableContent = (
    <Table size={compact ? 'small' : 'medium'} sx={{ minWidth: 'max-content' }}>
      <TableHead>
        <TableRow>
          {/* Row label column */}
          <TableCell
            sx={{
              padding: cellPadding,
              fontWeight: 500,
              color: 'text.secondary',
              minWidth: 180,
              ...stickyColumnStyles,
            }}
          >
            
          </TableCell>
          {/* Week columns with expandable daily breakdown */}
          {visibleWeeklyData.map((data) => {
            const isExpanded = expandedWeeks.has(data.week);
            const isCurrent = isCurrentWeek(data.week, data.year, currentWeek, currentYear);
            
            return (
              <React.Fragment key={data.week}>
                <TableCell
                  align="center"
                  sx={{
                    padding: cellPadding,
                    fontWeight: 500,
                    color: 'text.secondary',
                    minWidth: 60,
                    backgroundColor: isCurrent ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: isCurrent ? 'rgba(25, 118, 210, 0.12)' : 'action.hover' },
                  }}
                  onClick={() => handleToggleWeek(data.week)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                    {isExpanded ? (
                      <ExpandMoreIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <ChevronRightIcon sx={{ fontSize: 14 }} />
                    )}
                    {data.week}
                  </Box>
                </TableCell>
                {/* Daily breakdown header when expanded */}
                {isExpanded && <DailyBreakdownHeader cellPadding={cellPadding} />}
              </React.Fragment>
            );
          })}
        </TableRow>
      </TableHead>
      <TableBody>
        {visibleRows.map((row) => (
          <TableRow
            key={row.id}
            sx={{
              bgcolor: row.level > 0 ? 'grey.50' : 'background.paper',
              '& > td': {
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
              },
            }}
          >
            {/* Row label with expand/collapse and indicators */}
            <TableCell
              sx={{
                padding: cellPadding,
                fontWeight: row.level === 0 ? 500 : 400,
                ...stickyColumnStyles,
                bgcolor: row.level > 0 ? 'grey.50' : stickyColumnStyles.bgcolor,
              }}
            >
              {renderRowLabel(row)}
            </TableCell>

            {/* Data cells */}
            {visibleWeeklyData.map((data) => {
              const isWeekExpanded = expandedWeeks.has(data.week);
              
              return (
                <React.Fragment key={`${row.id}-${data.week}-group`}>
                  {renderCell(row, data, 0)}
                  {/* Daily breakdown cells when week is expanded */}
                  {isWeekExpanded && (
                    rowHasDailyBreakdown(row.id) ? (
                      <DailyBreakdown
                        dailyProcurement={data.dailyProcurement}
                        posBestellt={data.procurementBreakdown?.posBestellt}
                        posGeliefert={data.procurementBreakdown?.posGeliefert}
                        cellPadding={cellPadding}
                        isEditable={row.id === 'procurement_forecast' && getTemporalState(data) !== 'past'}
                        rowType={
                          row.id === 'procurement_forecast' ? 'forecast' :
                          row.id === 'procurement_bestellt' ? 'bestellt' :
                          row.id === 'procurement_geliefert' ? 'geliefert' : 'total'
                        }
                        articleId={articleId}
                        week={data.week}
                        onDayEdit={row.id === 'procurement_forecast' ? (day, value, weekTotal) => {
                          // Day-level editing updates weekly total automatically via context
                          // The weekTotal can be used to update parent components if needed
                          console.log(`Day edit: ${data.week} ${day} = ${value}, new week total = ${weekTotal}`);
                        } : undefined}
                      />
                    ) : (
                      <DailyBreakdownEmpty cellPadding={cellPadding} />
                    )
                  )}
                </React.Fragment>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // PO Link Popover
  const popover = (
    <POLinkPopover
      open={Boolean(poLinkAnchor)}
      anchorEl={poLinkAnchor}
      onClose={handlePOLinkClose}
      week={poLinkWeek}
      forecastValue={poLinkValue}
      unlinkedPOs={unlinkedPOs}
      onLinkPO={handleLinkPO}
    />
  );

  // When disableScroll is true, return table without scroll wrapper
  if (disableScroll) {
    return (
      <>
        {navigationToolbar}
        {tableContent}
        {popover}
      </>
    );
  }

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      {navigationToolbar}
      <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
        {tableContent}
      </Box>
      {popover}
    </Box>
  );
}
