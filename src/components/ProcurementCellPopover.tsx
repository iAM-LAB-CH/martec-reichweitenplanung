'use client';

import { useState, useEffect } from 'react';
import {
  Popover,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import { usePOLink } from '@/lib/POLinkContext';

interface ProcurementCellPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  week: string;
  articleId: string;
  currentValue: number;
  originalValue: number;
  existingComment?: string;
  onAccept: (newValue: number, comment: string) => void;
  onReject: () => void;
  onLinkPO: (poNummer: string, poMenge: number) => void;
  fieldLabel?: string;
}

export default function ProcurementCellPopover({
  open,
  anchorEl,
  onClose,
  week,
  articleId,
  currentValue,
  originalValue,
  existingComment = '',
  onAccept,
  onReject,
  onLinkPO,
  fieldLabel = 'Procurement Forecast',
}: ProcurementCellPopoverProps) {
  const [tabValue, setTabValue] = useState(0);
  const [value, setValue] = useState<string>(currentValue.toString());
  const [comment, setComment] = useState(existingComment);
  
  const { unlinkedPOsForCurrentArticle, getLinkedPO } = usePOLink();
  
  const linkedPONumber = getLinkedPO(week);
  const availablePOs = unlinkedPOsForCurrentArticle;
  const hasAvailablePOs = availablePOs.length > 0;

  // Reset form when popover opens
  useEffect(() => {
    if (open) {
      setValue(currentValue.toString());
      setComment(existingComment);
      // Start on PO tab if there are available POs, otherwise on edit tab
      setTabValue(hasAvailablePOs ? 1 : 0);
    }
  }, [open, currentValue, existingComment, hasAvailablePOs]);

  const handleAccept = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onAccept(numValue, comment);
    }
  };

  const handleReject = () => {
    onReject();
  };

  const handleLinkPO = (poNummer: string, poMenge: number) => {
    onLinkPO(poNummer, poMenge);
    onClose();
  };

  const hasChanges = parseFloat(value) !== originalValue;

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
          sx: {
            width: 380,
            p: 0,
            overflow: 'visible',
          },
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            {fieldLabel} - {week}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {linkedPONumber && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2" color="success.dark">
              Verknüpft mit: {linkedPONumber}
            </Typography>
          </Box>
        )}

        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ mb: 2, minHeight: 36 }}
        >
          <Tab 
            icon={<EditIcon sx={{ fontSize: 16 }} />} 
            iconPosition="start" 
            label="Bearbeiten" 
            sx={{ minHeight: 36, py: 0.5 }}
          />
          <Tab 
            icon={<LinkIcon sx={{ fontSize: 16 }} />} 
            iconPosition="start" 
            label={`PO Verknüpfen${hasAvailablePOs ? ` (${availablePOs.length})` : ''}`}
            sx={{ minHeight: 36, py: 0.5 }}
          />
        </Tabs>

        {/* Edit Tab */}
        {tabValue === 0 && (
          <Box>
            <TextField
              label={fieldLabel}
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
              InputProps={{
                inputProps: { min: 0 },
              }}
            />

            {originalValue !== parseFloat(value) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Original: {originalValue.toLocaleString('de-CH')}
              </Typography>
            )}

            <TextField
              label="Kommentar"
              multiline
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              fullWidth
              size="small"
              placeholder="Begründung für die Änderung..."
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleReject}
                disabled={!hasChanges && !existingComment}
              >
                Zurücksetzen
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleAccept}
                disabled={!comment.trim() && hasChanges}
              >
                Übernehmen
              </Button>
            </Box>
          </Box>
        )}

        {/* PO Link Tab */}
        {tabValue === 1 && (
          <Box>
            {availablePOs.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.disabled">
                  Keine unverknüpften POs verfügbar
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Verfügbare POs zum Verknüpfen:
                </Typography>
                <List dense sx={{ mx: -2, maxHeight: 200, overflow: 'auto' }}>
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
                          onClick={() => handleLinkPO(po.poNummer, po.menge)}
                          sx={{ ml: 1, whiteSpace: 'nowrap' }}
                        >
                          Verknüpfen
                        </Button>
                      </ListItem>
                    </Box>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
      </Box>
    </Popover>
  );
}
