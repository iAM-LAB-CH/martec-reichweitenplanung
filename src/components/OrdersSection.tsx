'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Order } from '@/lib/types';
import EditableCell from './EditableCell';

interface OrdersSectionProps {
  articleId: string;
  einkauf: Order[];
  verkauf: Order[];
}

export default function OrdersSection({ articleId, einkauf, verkauf }: OrdersSectionProps) {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const orders = tabValue === 0 ? einkauf : verkauf;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in lieferung':
      case 'versendet':
        return 'info';
      case 'in bearbeitung':
      case 'offen':
        return 'warning';
      case 'abgeschlossen':
      case 'bestätigt':
        return 'success';
      case 'geplant':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
        Bestellungen
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            label="EINKAUF" 
            sx={{ 
              color: tabValue === 0 ? 'primary.main' : 'text.secondary',
              fontWeight: 500,
            }} 
          />
          <Tab 
            label="VERKAUF" 
            sx={{ 
              color: tabValue === 1 ? 'primary.main' : 'text.secondary',
              fontWeight: 500,
            }} 
          />
        </Tabs>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 500 }}>PO Nummer</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>Menge</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>Lieferwoche</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>Lieferdatum ↓</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>Lieferant</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Keine Bestellungen vorhanden
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.poNummer} hover>
                  <TableCell>{order.poNummer}</TableCell>
                  <TableCell>
                    <Chip
                      label={order.status}
                      size="small"
                      color={getStatusColor(order.status)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      articleId={articleId}
                      field={tabValue === 0 ? 'einkauf_menge' : 'verkauf_menge'}
                      weekOrOrderId={order.poNummer}
                      originalValue={order.menge}
                      formatValue={(v) => v.toLocaleString('de-CH')}
                      fieldLabel="Menge"
                    />
                  </TableCell>
                  <TableCell>{order.lieferwoche}</TableCell>
                  <TableCell>{order.lieferdatum}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{order.lieferant}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

