'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
} from '@mui/material';
import { WeeklyData } from '@/lib/types';
import EditableCell from './EditableCell';

interface ForecastTableProps {
  weeklyData: WeeklyData[];
  articleId?: string;
  compact?: boolean;
  variant?: 'recommendations' | 'detail';
  disableScroll?: boolean; // When true, removes internal scroll wrapper (for external scroll control)
}

export default function ForecastTable({ weeklyData, articleId, compact = false, variant = 'detail', disableScroll = false }: ForecastTableProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString('de-CH');
  };

  // Returns background color for delta values
  const getDeltaBackgroundColor = (delta: number) => {
    if (delta > 0) return 'rgba(76, 175, 80, 0.15)'; // light green
    if (delta < 0) return 'rgba(244, 67, 54, 0.15)'; // light red
    return 'transparent';
  };

  // Returns background color for lagerbestand values
  const getLagerbestandBackgroundColor = (value: number) => {
    if (value === 0) return 'rgba(244, 67, 54, 0.15)'; // light red
    return 'transparent';
  };

  const formatDelta = (delta: number) => {
    if (delta > 0) return `+${formatNumber(delta)}`;
    return formatNumber(delta);
  };

  const cellPadding = compact ? '8px 12px' : '12px 16px';
  
  // Labels based on context - recommendations uses Ausgehend/Eingehend, detail uses Forecast/Orders
  const forecastLabel = variant === 'recommendations' ? 'Ausgehend' : 'Forecast';
  const ordersLabel = variant === 'recommendations' ? 'Eingehend' : 'Orders';

  // Sticky first column styles - use grey.50 for recommendations variant
  const stickyColumnStyles = {
    position: 'sticky' as const,
    left: 0,
    zIndex: 2,
    bgcolor: variant === 'recommendations' ? 'grey.50' : 'background.paper',
    borderRight: '1px solid',
    borderRightColor: 'divider',
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
                  minWidth: 120,
                  ...stickyColumnStyles,
                }}
              >
                
              </TableCell>
              {weeklyData.map((data) => (
                <TableCell
                  key={data.week}
                  align="center"
                  sx={{ padding: cellPadding, fontWeight: 500, color: 'text.secondary', minWidth: 70 }}
                >
                  {data.week}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ padding: cellPadding, fontWeight: 500, ...stickyColumnStyles }}>
                Lagerbestand
              </TableCell>
              {weeklyData.map((data) => (
                <TableCell 
                  key={data.week} 
                  align="center" 
                  sx={{ 
                    padding: cellPadding,
                    backgroundColor: getLagerbestandBackgroundColor(data.lagerbestand),
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      fontWeight: data.lagerbestand === 0 ? 700 : 400,
                    }}
                  >
                    {formatNumber(data.lagerbestand)}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell sx={{ padding: cellPadding, fontWeight: 500, ...stickyColumnStyles }}>
                Budget
              </TableCell>
              {weeklyData.map((data) => (
                <TableCell key={data.week} align="center" sx={{ padding: cellPadding }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {formatNumber(data.budget)}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell sx={{ padding: cellPadding, fontWeight: 500, ...stickyColumnStyles }}>
                {forecastLabel}
              </TableCell>
              {weeklyData.map((data) => (
                <TableCell key={data.week} align="center" sx={{ padding: cellPadding }}>
                  {articleId ? (
                    <EditableCell
                      articleId={articleId}
                      field="forecast"
                      weekOrOrderId={data.week}
                      originalValue={data.forecast}
                      formatValue={formatNumber}
                      fieldLabel="Forecast"
                    />
                  ) : (
                    <Typography variant="body2">
                      {formatNumber(data.forecast)}
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell sx={{ padding: cellPadding, fontWeight: 500, ...stickyColumnStyles }}>
                {ordersLabel}
              </TableCell>
              {weeklyData.map((data) => (
                <TableCell key={data.week} align="center" sx={{ padding: cellPadding }}>
                  {articleId ? (
                    <EditableCell
                      articleId={articleId}
                      field="orders"
                      weekOrOrderId={data.week}
                      originalValue={data.orders}
                      formatValue={formatNumber}
                      fieldLabel="Orders"
                    />
                  ) : (
                    <Typography variant="body2">
                      {formatNumber(data.orders)}
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell sx={{ padding: cellPadding, fontWeight: 500, ...stickyColumnStyles }}>
                Lager-Delta
              </TableCell>
              {weeklyData.map((data) => (
                <TableCell 
                  key={data.week} 
                  align="center" 
                  sx={{ 
                    padding: cellPadding,
                    backgroundColor: getDeltaBackgroundColor(data.lagerDelta),
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      fontWeight: data.lagerDelta !== 0 ? 700 : 400,
                    }}
                  >
                    {formatDelta(data.lagerDelta)}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
  );

  // When disableScroll is true, return table without scroll wrapper (for external scroll control)
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

