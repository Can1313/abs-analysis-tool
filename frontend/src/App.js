// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import AppLayout from "./components/AppLayout";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import CalculationPage from "./pages/CalculationPage";
import OptimizationPage from "./pages/OptimizationPage";
import StressTestingPage from "./pages/StressTestingPage";
import { DataProvider } from "./contexts/DataContext";
import ComparisonPage from "./pages/ComparisonPage";
import ReceivablesAnalysis from "./pages/ReceivablesAnalysis";

// Create a dark navy theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4e7bea', // Modern blue
      light: '#6d92fd',
      dark: '#3461c7',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0', // Purple
      light: '#bb4fd3',
      dark: '#7b1fa2',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
      light: '#ff7961',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#29b6f6',
      light: '#4fc3f7',
      dark: '#0288d1',
    },
    success: {
      main: '#4caf50',
      light: '#80e27e',
      dark: '#087f23',
    },
    background: {
      default: '#0f172a', // Dark navy
      paper: '#1e293b', // Lighter navy
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
    divider: 'rgba(148, 163, 184, 0.12)',
  },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", "Helvetica Neue", sans-serif',
    h4: {
      fontWeight: 500,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    subtitle1: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.7)',
          borderRadius: 8,
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.7)',
        },
        elevation2: {
          boxShadow: '0 3px 6px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.8)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
        },
        contained: {
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: 'rgba(78, 123, 234, 0.15)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': {
            borderBottom: 0,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.7)',
          backgroundColor: '#0f172a', // Match background.default
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        thumb: {
          height: 20,
          width: 20,
          backgroundColor: '#fff',
          border: '2px solid currentColor',
          '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
            boxShadow: 'inherit',
          },
        },
        valueLabel: {
          fontSize: 12,
          fontWeight: 'normal',
          top: -6,
          backgroundColor: 'unset',
          '&:before': {
            display: 'none',
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#6b6b6b #2b2b2b",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "#2b2b2b",
            width: 8,
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: "#6b6b6b",
            minHeight: 24,
          },
          "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#959595",
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#4e7bea',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DataProvider>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/calculation" element={<CalculationPage />} />
              <Route path="/optimization" element={<OptimizationPage />} />
              <Route path="/comparison" element={<ComparisonPage />} />
              <Route path="/stress-testing" element={<StressTestingPage />} />
              <Route path="/receivables-analysis" element={<ReceivablesAnalysis />} />
            </Routes>
            <Footer />
          </AppLayout>
        </Router>
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;