'use client';

import { useState, useRef } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';
import CommentPopover from './CommentPopover';
import { useChanges } from '@/lib/ChangesContext';
import { CellChangeField } from '@/lib/types';

interface EditableCellProps {
  articleId: string;
  field: CellChangeField;
  weekOrOrderId: string;
  originalValue: number;
  formatValue?: (value: number) => string;
  fieldLabel?: string;
}

export default function EditableCell({
  articleId,
  field,
  weekOrOrderId,
  originalValue,
  formatValue = (v) => v.toLocaleString('de-CH'),
  fieldLabel = 'Wert',
}: EditableCellProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  
  const { getChangeForCell, addChange, removeChange } = useChanges();
  
  const change = getChangeForCell(articleId, field, weekOrOrderId);
  const hasChange = !!change;
  const currentValue = change ? change.newValue : originalValue;

  const handleClick = () => {
    setPopoverOpen(true);
  };

  const handleClose = () => {
    setPopoverOpen(false);
  };

  const handleAccept = (newValue: number, comment: string) => {
    if (newValue === originalValue && !comment) {
      // If value is back to original and no comment, remove the change
      if (change) {
        removeChange(change.id);
      }
    } else {
      addChange({
        articleId,
        field,
        week: field === 'forecast' || field === 'orders' ? weekOrOrderId : undefined,
        orderId: field === 'einkauf_menge' || field === 'verkauf_menge' ? weekOrOrderId : undefined,
        originalValue,
        newValue,
        comment,
      });
    }
    setPopoverOpen(false);
  };

  const handleReject = () => {
    if (change) {
      removeChange(change.id);
    }
    setPopoverOpen(false);
  };

  return (
    <>
      <Box
        ref={cellRef}
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          cursor: 'pointer',
          position: 'relative',
          py: 0.5,
          px: 1,
          mx: -1,
          borderRadius: 1,
          backgroundColor: hasChange ? 'rgba(255, 193, 7, 0.2)' : 'transparent',
          border: hasChange ? '1px solid' : '1px solid transparent',
          borderColor: hasChange ? 'warning.main' : 'transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: hasChange ? 'rgba(255, 193, 7, 0.3)' : 'action.hover',
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: hasChange ? 600 : 400,
          }}
        >
          {formatValue(currentValue)}
        </Typography>
        
        {change?.comment && (
          <Tooltip title={change.comment} arrow placement="top">
            <CommentIcon
              sx={{
                fontSize: 14,
                color: 'warning.main',
                ml: 0.5,
              }}
            />
          </Tooltip>
        )}
      </Box>

      <CommentPopover
        open={popoverOpen}
        anchorEl={cellRef.current}
        onClose={handleClose}
        currentValue={currentValue}
        originalValue={originalValue}
        existingComment={change?.comment}
        onAccept={handleAccept}
        onReject={handleReject}
        fieldLabel={fieldLabel}
      />
    </>
  );
}
