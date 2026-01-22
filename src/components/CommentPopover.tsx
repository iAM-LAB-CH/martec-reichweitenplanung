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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface CommentPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  currentValue: number;
  originalValue: number;
  existingComment?: string;
  onAccept: (newValue: number, comment: string) => void;
  onReject: () => void;
  fieldLabel?: string;
}

export default function CommentPopover({
  open,
  anchorEl,
  onClose,
  currentValue,
  originalValue,
  existingComment = '',
  onAccept,
  onReject,
  fieldLabel = 'Wert',
}: CommentPopoverProps) {
  const [value, setValue] = useState<string>(currentValue.toString());
  const [comment, setComment] = useState(existingComment);

  // Reset form when popover opens
  useEffect(() => {
    if (open) {
      setValue(currentValue.toString());
      setComment(existingComment);
    }
  }, [open, currentValue, existingComment]);

  const handleAccept = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onAccept(numValue, comment);
    }
  };

  const handleReject = () => {
    onReject();
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
            width: 320,
            p: 0,
            overflow: 'visible',
          },
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            Wert anpassen
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

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
          rows={3}
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
    </Popover>
  );
}
