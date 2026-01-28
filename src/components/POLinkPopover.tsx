'use client';

import { useState } from 'react';
import {
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Button,
  Chip,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import CheckIcon from '@mui/icons-material/Check';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { POEntry } from '@/lib/types';

interface POLinkPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  week: string;
  forecastValue: number;
  unlinkedPOs: POEntry[];
  onLinkPO: (week: string, poNummer: string) => void;
}

export default function POLinkPopover({
  open,
  anchorEl,
  onClose,
  week,
  forecastValue,
  unlinkedPOs,
  onLinkPO,
}: POLinkPopoverProps) {
  const [selectedPO, setSelectedPO] = useState<string | null>(null);

  const handleLink = () => {
    if (selectedPO) {
      onLinkPO(week, selectedPO);
      setSelectedPO(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedPO(null);
    onClose();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('de-CH');
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      PaperProps={{
        sx: {
          width: 340,
          maxHeight: 400,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Scrollable content area */}
      <Box sx={{ p: 2, flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          PO mit Forecast verknüpfen
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Wählen Sie eine Bestellung aus, um sie mit dem Procurement Forecast für {week} zu verknüpfen.
        </Typography>

        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.100',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Forecast Wert
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {formatNumber(forecastValue)} Stück
          </Typography>
        </Box>

        <Divider sx={{ mb: 1 }} />

        {unlinkedPOs.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Keine unverknüpften Bestellungen verfügbar.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Verfügbare Bestellungen ({unlinkedPOs.length})
            </Typography>
            <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
              {unlinkedPOs.map((po) => (
                <ListItem key={po.poNummer} disablePadding>
                  <ListItemButton
                    selected={selectedPO === po.poNummer}
                    onClick={() => setSelectedPO(po.poNummer)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      border: '1px solid',
                      borderColor: selectedPO === po.poNummer ? 'primary.main' : 'divider',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {po.poNummer}
                          </Typography>
                          <Chip
                            label={`${formatNumber(po.menge)} St.`}
                            size="small"
                            color={po.menge === forecastValue ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        po.expectedDelivery && (
                          <Typography variant="caption" color="text.secondary">
                            Erwartete Lieferung: {po.expectedDelivery}
                          </Typography>
                        )
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>

      {/* Sticky footer with buttons - always visible */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <Button variant="outlined" size="small" onClick={handleClose}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleLink}
          disabled={!selectedPO}
          startIcon={<LinkIcon />}
        >
          Verknüpfen
        </Button>
      </Box>
    </Popover>
  );
}

// Clickable cell component for PO linking with 3 states
interface POLinkCellProps {
  value: number;
  week: string;
  isLinked: boolean;
  hasUnlinkedPOs: boolean;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export function POLinkCell({ value, week, isLinked, hasUnlinkedPOs, onClick }: POLinkCellProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString('de-CH');
  };

  // State 1: Zero value - neutral, no action needed
  if (value === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        -
      </Typography>
    );
  }

  // State 2: Linked - show link icon to the right
  if (isLinked) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.25,
        }}
      >
        <Typography variant="body2">
          {formatNumber(value)}
        </Typography>
        <LinkIcon sx={{ fontSize: 12, color: 'success.main', opacity: 0.7 }} />
      </Box>
    );
  }

  // State 3: Needs linking - NO colored background, icon to the right, hover effect for editability
  // Clickable when there are unlinked POs available
  const isClickable = hasUnlinkedPOs && value > 0;
  
  return (
    <Box
      onClick={isClickable ? onClick : undefined}
      sx={{
        cursor: isClickable ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
        py: 0.25,
        px: 0.5,
        mx: -0.5,
        borderRadius: 0.5,
        // NO colored background - transparent by default
        backgroundColor: 'transparent',
        transition: 'all 0.15s ease',
        // Hover effect to indicate editability/clickability
        '&:hover': isClickable ? {
          backgroundColor: 'action.hover',
        } : {},
      }}
    >
      <Typography variant="body2">
        {formatNumber(value)}
      </Typography>
      <LinkOffIcon sx={{ fontSize: 12, color: 'warning.main', opacity: 0.7 }} />
    </Box>
  );
}
