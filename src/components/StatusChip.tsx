'use client';

import { Chip } from '@mui/material';
import { ArticleStatus } from '@/lib/types';
import { statusColors, statusLabels } from '@/lib/theme';

interface StatusChipProps {
  status: ArticleStatus;
  size?: 'small' | 'medium';
}

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  return (
    <Chip
      label={statusLabels[status]}
      color={statusColors[status].chipColor}
      size={size}
      sx={{
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
      }}
    />
  );
}

