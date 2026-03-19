/**
 * TD3 dark military theme. Per Implementation Plan 5.2.
 * Enhanced with additional component overrides for cohesive tactical dashboard look.
 */
import { createTheme } from '@mui/material/styles';

export const td3Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1E90FF', // electric blue
    },
    secondary: {
      main: '#FF6B35', // amber-orange
    },
    background: {
      default: '#0A0E1A', // near-black navy
      paper: '#0F1929', // dark card surface
    },
    text: {
      primary: '#E8F4FD',
      secondary: '#7B9BB5',
    },
    success: {
      main: '#00C853',
    },
    warning: {
      main: '#FFB300',
    },
    error: {
      main: '#FF1744',
    },
    divider: '#1A3A5C',
  },
  typography: {
    fontFamily: '"JetBrains Mono", "Courier New", monospace',
    h1: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
    h2: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    body2: {
      fontSize: '0.75rem',
      letterSpacing: '0.05em',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #1A3A5C',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          letterSpacing: '0.1em',
          fontWeight: 700,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0F1929',
          borderBottom: '1px solid #1A3A5C',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0F1929',
          border: '1px solid #1A3A5C',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0A0E1A',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0F1929',
          borderRight: '1px solid #1A3A5C',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#1A3A5C',
            },
            '&:hover fieldset': {
              borderColor: '#1E90FF',
            },
          },
        },
      },
    },
  },
});
