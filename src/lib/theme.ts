'use client';

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    success: {
      main: '#2e7d32',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    subtitle1: {
      fontWeight: 500,
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '16px',
        },
        head: {
          fontWeight: 500,
          color: 'rgba(0, 0, 0, 0.87)',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          fontWeight: 500,
        },
      },
    },
  },
});

// Status color mapping
export const statusColors = {
  kritisch: {
    background: '#ffebee',
    color: '#c62828',
    chipColor: 'error' as const,
  },
  planen: {
    background: '#fff3e0',
    color: '#e65100',
    chipColor: 'warning' as const,
  },
  beobachten: {
    background: '#e8f5e9',
    color: '#2e7d32',
    chipColor: 'success' as const,
  },
};

export const statusLabels = {
  kritisch: 'Kritisch',
  planen: 'Planen',
  beobachten: 'Beobachten',
};

