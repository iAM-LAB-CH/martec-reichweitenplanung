'use client';

import { useState, useRef } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';
import LinkIcon from '@mui/icons-material/Link';
import CommentPopover from './CommentPopover';
import ProcurementCellPopover from './ProcurementCellPopover';
import { useChanges } from '@/lib/ChangesContext';
import { usePOLink } from '@/lib/POLinkContext';
import { CellChangeField } from '@/lib/types';

interface EditableCellProps {
  articleId: string;
  field: CellChangeField;
  weekOrOrderId: string;
  originalValue: number;
  formatValue?: (value: number) => string;
  fieldLabel?: string;
  day?: string; // For day-level editing (mo, di, mi, do, fr)
}

export default function EditableCell({
  articleId,
  field,
  weekOrOrderId,
  originalValue,
  formatValue = (v) => v.toLocaleString('de-CH'),
  fieldLabel = 'Wert',
  day,
}: EditableCellProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  
  const { getChangeForCell, addChange, removeChange } = useChanges();
  const { linkPO, unlinkPO, getLinkedPO } = usePOLink();
  
  const change = getChangeForCell(articleId, field, weekOrOrderId, day);
  const hasChange = !!change;
  const currentValue = change ? change.newValue : originalValue;
  
  // Check if this is a procurement forecast cell (supports PO linking)
  const isProcurementForecast = field === 'procurementForecast' && !day;
  const linkedPO = isProcurementForecast ? getLinkedPO(weekOrOrderId) : undefined;

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
      // Determine the correct week/orderId based on field type
      const isWeeklyField = [
        'forecastBaseline', 
        'forecastPromoKarton', 
        'forecastPromoDisplays', 
        'procurementForecast',
        'forecast',
        'orders'
      ].includes(field);

      addChange({
        articleId,
        field,
        week: isWeeklyField ? weekOrOrderId : undefined,
        orderId: !isWeeklyField ? weekOrOrderId : undefined,
        day,
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

  const handleLinkPO = (poNummer: string, poMenge: number) => {
    // Link the PO in the PO context (no activity log entry created)
    linkPO(weekOrOrderId, poNummer);
    setPopoverOpen(false);
  };

  const handleUnlinkPO = () => {
    // Unlink the PO from this week
    unlinkPO(weekOrOrderId);
  };

  return (
    <>
      <Box
        ref={cellRef}
        onClick={handleClick}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 0.5,
          cursor: 'pointer',
          position: 'relative',
          px: 0.5,
          borderRadius: 0.5,
          backgroundColor: hasChange ? 'rgba(255, 193, 7, 0.2)' : 'transparent',
          border: hasChange ? '1px solid' : '1px solid transparent',
          borderColor: hasChange ? 'warning.main' : 'transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: hasChange ? 'rgba(255, 193, 7, 0.3)' : 'action.hover',
          },
        }}
      >
        {linkedPO && (
          <Tooltip title={`Verknüpft mit ${linkedPO}`} arrow placement="top">
            <LinkIcon
              sx={{
                fontSize: 14,
                color: 'success.main',
                mr: 0.25,
              }}
            />
          </Tooltip>
        )}
        
        <Typography
          variant="body2"
          sx={{
            fontWeight: hasChange ? 600 : 400,
            fontSize: '14px',
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

      {isProcurementForecast ? (
        <ProcurementCellPopover
          open={popoverOpen}
          anchorEl={cellRef.current}
          onClose={handleClose}
          week={weekOrOrderId}
          articleId={articleId}
          currentValue={currentValue}
          originalValue={originalValue}
          existingComment={change?.comment}
          onAccept={handleAccept}
          onReject={handleReject}
          onLinkPO={handleLinkPO}
          onUnlinkPO={handleUnlinkPO}
          fieldLabel={fieldLabel}
        />
      ) : (
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
      )}
    </>
  );
}
