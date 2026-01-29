'use client';

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState } from 'react';
import { useChanges } from '@/lib/ChangesContext';
import { CellChangeField } from '@/lib/types';

interface HistoryLogProps {
  articleId: string;
}

const fieldLabels: Record<CellChangeField, string> = {
  forecastBaseline: 'Baseline',
  forecastPromoKarton: 'Promo Karton',
  forecastPromoDisplays: 'Promo Displays',
  procurementForecast: 'Procurement',
  poLink: 'PO Verknüpft',
  // Legacy fields
  forecast: 'Forecast',
  orders: 'Orders',
  einkauf_menge: 'Einkauf',
  verkauf_menge: 'Verkauf',
};

const fieldColors: Record<CellChangeField, 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  forecastBaseline: 'primary',
  forecastPromoKarton: 'secondary',
  forecastPromoDisplays: 'secondary',
  procurementForecast: 'info',
  poLink: 'success',
  // Legacy fields
  forecast: 'primary',
  orders: 'secondary',
  einkauf_menge: 'success',
  verkauf_menge: 'warning',
};

export default function HistoryLog({ articleId }: HistoryLogProps) {
  const { getChangesForArticle } = useChanges();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const changes = getChangesForArticle(articleId);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (changes.length === 0) {
    return (
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Keine Änderungen vorhanden
        </Typography>
      </Box>
    );
  }

  return (
    <List dense sx={{ px: 1, py: 0 }}>
      {changes.map((change) => {
        const isExpanded = expandedItems.has(change.id);
        const identifier = change.week || change.orderId || '';
        const isPOLink = change.field === 'poLink';
        
        return (
          <ListItem
            key={change.id}
            sx={{
              flexDirection: 'column',
              alignItems: 'stretch',
              py: 1,
              px: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-child': { borderBottom: 0 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
              <Chip
                label={fieldLabels[change.field]}
                size="small"
                color={fieldColors[change.field]}
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                {identifier}
              </Typography>
              <IconButton
                size="small"
                onClick={() => toggleExpand(change.id)}
                sx={{ p: 0.5 }}
              >
                {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              {isPOLink ? (
                // PO Link entry shows PO number and quantity
                <>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {change.poNummer}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({change.newValue.toLocaleString('de-CH')} Stück)
                  </Typography>
                </>
              ) : (
                // Regular entry shows value change
                <>
                  <Typography variant="caption" color="text.secondary">
                    {change.originalValue.toLocaleString('de-CH')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    →
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {change.newValue.toLocaleString('de-CH')}
                  </Typography>
                </>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                {formatTimestamp(change.timestamp)}
              </Typography>
            </Box>

            <Collapse in={isExpanded}>
              <Box
                sx={{
                  mt: 1,
                  p: 1,
                  bgcolor: isPOLink ? 'success.50' : 'grey.50',
                  borderRadius: 1,
                  borderLeft: '3px solid',
                  borderLeftColor: isPOLink ? 'success.main' : 'warning.main',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {isPOLink ? 'Details:' : 'Kommentar:'}
                </Typography>
                <Typography variant="body2">
                  {change.comment || 'Kein Kommentar'}
                </Typography>
              </Box>
            </Collapse>
          </ListItem>
        );
      })}
    </List>
  );
}
