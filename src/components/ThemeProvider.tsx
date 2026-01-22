'use client';

import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '@/lib/theme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

