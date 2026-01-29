'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { WeeklyData } from '@/lib/types';
import InventoryChart from './InventoryChart';
import ForecastTable from './ForecastTable';

interface LagerbestandProjectionProps {
  weeklyData: WeeklyData[];
  articleId?: string;
  currentWeekIndex?: number;
  variant?: 'recommendations' | 'detail';
  currentWeek?: number; // Current calendar week number (e.g., 13 for KW13)
}

// Column widths must match ForecastTable
const COLUMN_WIDTH = 60; // minWidth of data columns in ForecastTable
const STICKY_COLUMN_WIDTH = 180; // minWidth of the first sticky column

export default function LagerbestandProjection({
  weeklyData,
  articleId,
  currentWeekIndex = 12,
  variant = 'detail',
  currentWeek = 13, // Default to KW13
}: LagerbestandProjectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(15, weeklyData.length) });

  // Handle scroll events to update visible range
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;
    
    // Calculate how many columns fit in the visible area (excluding sticky column)
    const availableWidth = clientWidth - STICKY_COLUMN_WIDTH;
    const visibleColumns = Math.ceil(availableWidth / COLUMN_WIDTH);
    
    // Calculate which week index corresponds to the scroll position
    const startIndex = Math.floor(scrollLeft / COLUMN_WIDTH);
    const endIndex = Math.min(startIndex + visibleColumns + 1, weeklyData.length);
    
    setVisibleRange({ start: Math.max(0, startIndex), end: endIndex });
  }, [weeklyData.length]);

  // Scroll to current week on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Small delay to ensure container is rendered
    const timer = setTimeout(() => {
      // Find the index of the current week in the data
      const currentWeekIndex = weeklyData.findIndex(
        (w) => parseInt(w.week.replace('KW', '')) === currentWeek
      );
      
      if (currentWeekIndex > 0) {
        // Scroll to position the current week in view (with some past weeks visible)
        // Show about 2-3 past weeks before the current week
        const scrollToIndex = Math.max(0, currentWeekIndex - 3);
        const scrollPosition = scrollToIndex * COLUMN_WIDTH;
        container.scrollLeft = scrollPosition;
      }
      
      handleScroll();
    }, 50);
    return () => clearTimeout(timer);
  }, [handleScroll, weeklyData, currentWeek]);

  // Get the visible slice of data for the chart
  const visibleWeeklyData = visibleRange.end > 0 
    ? weeklyData.slice(visibleRange.start, visibleRange.end)
    : weeklyData.slice(0, 15);

  // Adjust currentWeekIndex relative to the visible range
  const adjustedCurrentWeekIndex = Math.max(0, Math.min(
    currentWeekIndex - visibleRange.start,
    visibleWeeklyData.length - 1
  ));

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
        Lagerbestand Projektion
      </Typography>
      
      {/* Single scroll container for both chart and table */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {/* Inner container with fixed width to enable scrolling */}
        <Box sx={{ minWidth: weeklyData.length * COLUMN_WIDTH + STICKY_COLUMN_WIDTH }}>
          {/* Chart - shows only visible weeks */}
          <Box sx={{ 
            position: 'sticky',
            left: 0,
            width: '100%',
            maxWidth: `calc(100vw - 400px)`, // Account for sidebar
            overflow: 'hidden',
          }}>
            <InventoryChart
              weeklyData={visibleWeeklyData}
              fullWeeklyData={weeklyData}
              articleId={articleId}
              currentWeekIndex={adjustedCurrentWeekIndex}
            />
          </Box>

          {/* Table */}
          <Box sx={{ mt: 0 }}>
            <ForecastTable
              weeklyData={weeklyData}
              articleId={articleId}
              variant={variant}
              disableScroll
              currentWeek={currentWeek}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
