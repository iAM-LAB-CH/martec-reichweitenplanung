'use client';

import {
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { usePOLink } from '@/lib/POLinkContext';

interface POLinkPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  week: string;
  articleId: string;
}

export default function POLinkPopover({
  open,
  anchorEl,
  onClose,
  week,
  articleId,
}: POLinkPopoverProps) {
  const { unlinkedPOsForCurrentArticle, linkPO, getLinkedPO } = usePOLink();

  const linkedPONumber = getLinkedPO(week);
  const availablePOs = unlinkedPOsForCurrentArticle;

  const handleLink = (poNummer: string) => {
    linkPO(week, poNummer);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      slotProps={{
        paper: {
          sx: { minWidth: 320, maxWidth: 400 },
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          PO verknüpfen - {week}
        </Typography>
        
        {linkedPONumber && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2" color="success.dark">
              Aktuell verknüpft: {linkedPONumber}
            </Typography>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Verfügbare POs zum Verknüpfen:
        </Typography>

        {availablePOs.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              Keine unverknüpften POs verfügbar
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ mx: -2 }}>
            {availablePOs.map((po, index) => (
              <Box key={po.poNummer}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    px: 2,
                    py: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {po.poNummer}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {po.menge.toLocaleString('de-CH')} Stück • Lieferung {po.liefertermin}
                      </Typography>
                    }
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LinkIcon />}
                    onClick={() => handleLink(po.poNummer)}
                    sx={{ ml: 1, whiteSpace: 'nowrap' }}
                  >
                    Verknüpfen
                  </Button>
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Popover>
  );
}
