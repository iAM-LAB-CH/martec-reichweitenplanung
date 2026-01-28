'use client';

import { Box, Typography } from '@mui/material';
import { WeeklyData, POEntry } from '@/lib/types';
import ForecastTable from './ForecastTable';

interface LagerbestandProjectionProps {
  weeklyData: WeeklyData[];
  articleId?: string;
  currentWeekIndex?: number;
  variant?: 'recommendations' | 'detail';
  unlinkedPOs?: POEntry[];
  onLinkPO?: (week: string, poNummer: string) => void;
}

export default function LagerbestandProjection({
  weeklyData,
  articleId,
  variant = 'detail',
  unlinkedPOs = [],
  onLinkPO,
}: LagerbestandProjectionProps) {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
        Lagerbestand Projektion
      </Typography>
      
      {/* ForecastTable with built-in navigation controls */}
      <ForecastTable
        weeklyData={weeklyData}
        articleId={articleId}
        variant={variant}
        unlinkedPOs={unlinkedPOs}
        onLinkPO={onLinkPO}
        initialWeekRange={12}
      />
    </Box>
  );
}
