'use client';

import { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { LineChart, BarChart } from '@mui/x-charts';
import { WeeklyData } from '@/lib/types';
import { useChanges } from '@/lib/ChangesContext';

interface InventoryChartProps {
  weeklyData: WeeklyData[];
  fullWeeklyData?: WeeklyData[]; // Full dataset for stable Y-axis calculation
  articleId?: string;
  currentWeekIndex?: number; // Index of the current week (for solid vs dotted line)
}

// Format large numbers for y-axis (e.g., 10000 -> 10k)
const formatYAxisValue = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toString();
};

export default function InventoryChart({ weeklyData, fullWeeklyData, articleId, currentWeekIndex = 2 }: InventoryChartProps) {
  const theme = useTheme();
  const { getEffectiveValue, getChangesForArticle } = useChanges();

  // Check if there are any changes for this article
  const hasChanges = articleId ? getChangesForArticle(articleId).length > 0 : false;

  const weeks = weeklyData.map((d) => d.week);
  
  // Get effective values with changes applied (using new field names)
  const effectiveData = useMemo(() => {
    if (!articleId) return weeklyData;
    
    return weeklyData.map((d) => {
      // Get baseline and promo changes
      const newBaseline = getEffectiveValue(articleId, 'salesForecastBaseline', d.salesForecastBreakdown.baseline, d.week);
      const newKartonware = getEffectiveValue(articleId, 'salesForecastPromoKartonware', d.salesForecastBreakdown.promo.kartonware, d.week);
      const newDisplays = getEffectiveValue(articleId, 'salesForecastPromoDisplays', d.salesForecastBreakdown.promo.displays, d.week);
      
      // Recalculate forecast from breakdown
      const newForecast = newBaseline + newKartonware + newDisplays;
      
      return {
        ...d,
        salesLatestForecast: newForecast,
      };
    });
  }, [weeklyData, articleId, getEffectiveValue]);

  // Recalculate lagerbestand based on changes - allow negative values
  const recalculatedLagerbestand = useMemo(() => {
    if (!hasChanges) return effectiveData.map((d) => d.lagerbestandEnde);
    
    const result: number[] = [];
    let currentStock = effectiveData[0]?.lagerbestandAnfang || 0;
    
    for (let i = 0; i < effectiveData.length; i++) {
      // Calculate end of week: Anfang - MAX(Forecast, Orders) + Procurement
      const d = effectiveData[i];
      const salesDeduction = Math.max(d.salesLatestForecast, d.salesOrderImSystem);
      const endStock = (i === 0 ? currentStock : result[i - 1]) - salesDeduction + d.procurementPo;
      result.push(endStock);
    }
    
    return result;
  }, [effectiveData, hasChanges]);

  const lagerbestand = hasChanges ? recalculatedLagerbestand : weeklyData.map((d) => d.lagerbestandEnde);
  const procurement = effectiveData.map((d) => d.procurementPo);
  const budget = weeklyData.map((d) => d.salesBudget);

  // Split data for solid (current/past) and dashed (forecast) lines
  // Solid line: from start up to and including currentWeekIndex
  // Dashed line: from currentWeekIndex onwards (overlaps at currentWeekIndex for continuity)
  const solidLineData = lagerbestand.map((v, i) => i <= currentWeekIndex ? v : null);
  const dashedLineData = lagerbestand.map((v, i) => i >= currentWeekIndex ? v : null);

  // Chart dimensions
  const chartHeight = 240;
  const marginLeft = 70;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 30;
  
  // Calculate Y-axis range from VISIBLE data so chart adapts to what's in view
  const allLagerbestandValues = lagerbestand;
  const minValue = Math.min(...allLagerbestandValues);
  const maxValue = Math.max(...allLagerbestandValues, ...procurement, ...budget) * 1.15;
  // Add some padding below if we have negative values
  const adjustedMinValue = minValue < 0 ? minValue * 1.15 : minValue * 0.9;
  
  return (
    <Box sx={{ width: '100%', height: 300 }}>
      {/* Legend at top right */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 2, bgcolor: theme.palette.primary.main }} />
          <Typography variant="caption" color="text.secondary">
            Ist-Bestand
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box 
            sx={{ 
              width: 16, 
              height: 2, 
              background: `repeating-linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.main} 3px, transparent 3px, transparent 6px)`,
            }} 
          />
          <Typography variant="caption" color="text.secondary">
            Prognose
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 2, bgcolor: '#d0d0d0' }} />
          <Typography variant="caption" color="text.secondary">
            Budget
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 10, bgcolor: '#26a69a', borderRadius: 0.5 }} />
          <Typography variant="caption" color="text.secondary">Procurement</Typography>
        </Box>
      </Box>
      <Box sx={{ position: 'relative', height: chartHeight }}>
        {/* Bar chart for procurement */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <BarChart
            xAxis={[{ 
              scaleType: 'band', 
              data: weeks,
              tickLabelStyle: { fontSize: 10 },
            }]}
            yAxis={[{ 
              min: adjustedMinValue,
              max: maxValue,
              valueFormatter: formatYAxisValue,
              tickLabelStyle: { fontSize: 11 },
            }]}
            series={[
              {
                data: procurement,
                color: '#26a69a',
              },
            ]}
            height={chartHeight}
            margin={{ left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }}
            hideLegend
            grid={{ horizontal: true }}
            sx={{
              '& .MuiChartsGrid-line': {
                stroke: '#e0e0e0',
                strokeWidth: 1,
              },
            }}
          />
        </Box>
        {/* Line chart for lagerbestand and budget */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          <LineChart
            xAxis={[{ 
              scaleType: 'band', 
              data: weeks,
              tickLabelStyle: { fontSize: 10 },
            }]}
            yAxis={[{ 
              min: adjustedMinValue,
              max: maxValue,
            }]}
            series={[
              // Budget line (grey, above forecast as benchmark)
              {
                id: 'budget',
                data: budget,
                color: '#d0d0d0',
                showMark: false,
                curve: 'linear' as const,
              },
              // Solid line for current/past data (actual stock)
              {
                id: 'current',
                data: solidLineData,
                color: theme.palette.primary.main,
                showMark: false,
                curve: 'linear' as const,
              },
              // Dashed line for forecast data (future projected stock)
              {
                id: 'forecast',
                data: dashedLineData,
                color: theme.palette.primary.main,
                showMark: false,
                curve: 'linear' as const,
              },
            ]}
            height={chartHeight}
            margin={{ left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom }}
            hideLegend
            sx={{
              // Hide axes on the line chart (bar chart shows them)
              '& .MuiChartsAxis-root': {
                display: 'none',
              },
              // Make forecast line dashed using the series ID
              '& .MuiLineElement-series-forecast': {
                strokeDasharray: '6,4',
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
