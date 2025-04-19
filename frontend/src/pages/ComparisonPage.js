import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Tabs, 
  Tab, 
  Grid, 
  Card, 
  CardContent, 
  Table,
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Divider,
  alpha,
  useTheme,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { useData } from '../contexts/DataContext';
import CompareIcon from '@mui/icons-material/Compare';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import DownloadIcon from '@mui/icons-material/Download';
import ScienceIcon from '@mui/icons-material/Science';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  Area, AreaChart, ScatterChart, Scatter, ZAxis, ReferenceLine
} from "recharts";

// Create a dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4dabf5',
    },
    secondary: {
      main: '#ce93d8',
    },
    success: {
      main: '#66bb6a',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ffa726',
    },
    info: {
      main: '#29b6f6',
    },
    background: {
      default: '#0a1929',
      paper: '#132f4c',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    grid: 'rgba(255, 255, 255, 0.15)',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },
  },
});

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ComparisonPage = () => {
  const theme = darkTheme;
  const { 
    savedResults,
    clearSavedResults,
    deleteSavedResult
  } = useData();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedResults, setSelectedResults] = useState([]);
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resultToDelete, setResultToDelete] = useState(null);
  const [comparisonData, setComparisonData] = useState({
    manualResults: null,
    geneticResults: null,
    standardResults: null
  });

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Format currency values
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return "₺0,00";
    
    try {
      return new Intl.NumberFormat("tr-TR", { 
        style: "currency", 
        currency: "TRY",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `₺${value.toFixed(2).replace('.', ',')}`;
    }
  };
  
  // Format percentage values
  const formatPercent = (value) => {
    if (value === undefined || value === null) return "0,00%";
    return `${value.toFixed(2).replace('.', ',')}%`;
  };

  // Calculate percentage difference
  const calculateDifference = (current, reference) => {
    if (!current || !reference || reference === 0) return null;
    return ((current - reference) / reference) * 100;
  };

  // Format difference with color and sign
  const formatDifference = (diff) => {
    if (diff === null) return "-";
    const isPositive = diff > 0;
    return (
      <Typography 
        variant="body2" 
        sx={{ 
          color: isPositive ? 'success.main' : 'error.main',
          fontWeight: 'medium',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {isPositive ? '+' : ''}{diff.toFixed(2).replace('.', ',')}%
      </Typography>
    );
  };

  // Open select dialog
  const handleOpenSelectDialog = () => {
    setSelectDialogOpen(true);
  };

  // Close select dialog
  const handleCloseSelectDialog = () => {
    setSelectDialogOpen(false);
  };

  // Handle result selection
  const handleSelectResult = (resultId) => {
    setSelectedResults(prev => {
      if (prev.includes(resultId)) {
        return prev.filter(id => id !== resultId);
      } else {
        // Limit to 3 selections
        if (prev.length >= 3) {
          return [...prev.slice(1), resultId];
        }
        return [...prev, resultId];
      }
    });
  };

  // Confirm result selection
  const handleConfirmSelection = () => {
    setSelectDialogOpen(false);
    
    // Process the selected results based on selection
    processSelectedResults();
  };

  // Process the selected results
  const processSelectedResults = () => {
    if (selectedResults.length === 0) return;
    
    setLoading(true);
    
    // Filter the saved results based on selection
    const selectedResultsData = savedResults.filter(result => 
      selectedResults.includes(result.id)
    );
    
    // Create an empty result object structure
    const processedData = {
      manualResults: null,
      geneticResults: null,
      standardResults: null
    };
    
    // Process each selected result and assign to the appropriate category
    selectedResultsData.forEach(result => {      
      if (result.methodType === 'manual') {
        processedData.manualResults = {...result};
      } else if (result.methodType === 'genetic') {
        processedData.geneticResults = {...result};
      } else if (result.methodType === 'standard') {
        processedData.standardResults = {...result};
      }
    });
    
    // Update the comparison data state
    setComparisonData(processedData);
    setLoading(false);
  };

  // Handle delete dialog open
  const handleDeleteDialogOpen = (resultId) => {
    setResultToDelete(resultId);
    setDeleteDialogOpen(true);
  };

  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setResultToDelete(null);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (resultToDelete) {
      deleteSavedResult(resultToDelete);
      
      // Remove from selected results if present
      if (selectedResults.includes(resultToDelete)) {
        setSelectedResults(prev => prev.filter(id => id !== resultToDelete));
      }
      
      setDeleteDialogOpen(false);
      setResultToDelete(null);
    }
  };

  // Reset all comparison data
  const handleResetComparison = () => {
    clearSavedResults();
    setSelectedResults([]);
    setComparisonData({
      manualResults: null,
      geneticResults: null,
      standardResults: null
    });
  };
  
  // Initialize selected results when component mounts
  useEffect(() => {
    setLoading(true);
    
    if (savedResults && savedResults.length > 0) {
      // Auto-select one of each type (manual, genetic, standard) initially
      const initialSelectedIds = [];
      
      // Try to find one of each type
      const manualResult = savedResults.find(r => r.methodType === 'manual');
      const geneticResult = savedResults.find(r => r.methodType === 'genetic');
      const standardResult = savedResults.find(r => r.methodType === 'standard');
      
      // Add each result's ID to our initial selection if found
      if (manualResult) initialSelectedIds.push(manualResult.id);
      if (geneticResult) initialSelectedIds.push(geneticResult.id);
      if (standardResult) initialSelectedIds.push(standardResult.id);
      
      // If we haven't selected anything yet, just take the first result
      if (initialSelectedIds.length === 0 && savedResults.length > 0) {
        initialSelectedIds.push(savedResults[0].id);
      }
      
      // Process these initial selections
      const initialSelectedData = savedResults.filter(result => 
        initialSelectedIds.includes(result.id)
      );
      
      // Set the selected results state
      setSelectedResults(initialSelectedIds);
      
      // Explicitly create a new object for each result type to avoid reference issues
      const processedData = {
        manualResults: null,
        geneticResults: null,
        standardResults: null
      };
      
      // Assign each result type manually with spread operator to create a copy
      const manualResultData = initialSelectedData.find(r => r.methodType === 'manual');
      const geneticResultData = initialSelectedData.find(r => r.methodType === 'genetic');
      const standardResultData = initialSelectedData.find(r => r.methodType === 'standard');
      
      if (manualResultData) processedData.manualResults = {...manualResultData};
      if (geneticResultData) processedData.geneticResults = {...geneticResultData};
      if (standardResultData) processedData.standardResults = {...standardResultData};
      
      setComparisonData(processedData);
    }
    
    setLoading(false);
  }, [savedResults]);

  // Get all valid results as an array
  const getComparisonResults = () => {
    const results = [];
    
    if (comparisonData.manualResults) {
      results.push({
        id: comparisonData.manualResults.id,
        label: 'Manual Calculation',
        result: comparisonData.manualResults,
        isOptimized: false,
        method: 'manual',
        color: theme.palette.error.main,
        icon: <TuneIcon />
      });
    }
    
    if (comparisonData.geneticResults) {
      results.push({
        id: comparisonData.geneticResults.id,
        label: 'Genetic Algorithm',
        result: comparisonData.geneticResults,
        isOptimized: true,
        method: 'genetic',
        color: theme.palette.success.main,
        icon: <ScienceIcon />
      });
    }
    
    if (comparisonData.standardResults) {
      results.push({
        id: comparisonData.standardResults.id,
        label: 'Standard Optimization',
        result: comparisonData.standardResults,
        isOptimized: true,
        method: 'standard',
        color: theme.palette.primary.main,
        icon: <SettingsIcon />
      });
    }
    
    return results;
  };

  // Check if we have at least two results to compare
  const hasEnoughData = () => {
    const results = getComparisonResults();
    return results.length >= 2;
  };

  // Add the header with buttons
  const ComparisonHeader = () => {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CompareIcon sx={{ fontSize: 28, color: theme.palette.primary.main, mr: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Comparison Analysis
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleOpenSelectDialog}
            sx={{ borderRadius: 2 }}
          >
            Select Results
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<RefreshIcon />}
            onClick={handleResetComparison}
            sx={{ borderRadius: 2 }}
          >
            Clear All Results
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            size="medium"
            sx={{ borderRadius: 2 }}
          >
            Export Comparison
          </Button>
        </Box>
      </Box>
    );
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, borderRadius: 1, boxShadow: 2, bgcolor: 'background.paper' }}>
          <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>{label}</Typography>
          {payload.map((entry, index) => (
            <Box key={`tooltip-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="body2" sx={{ mr: 2, color: entry.color }}>
                {entry.name}:
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {entry.name.includes('Buffer') || entry.name.includes('Rate')
                  ? `${entry.value.toFixed(2)}%` 
                  : formatCurrency(entry.value)}
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // No comparison data available or loading, show guidance or loading state
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center', py: 10 }}>
          <CircularProgress size={60} color="primary" />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Loading comparison data...
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }

  if (!savedResults || savedResults.length === 0) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <ComparisonHeader />
          
          <Paper 
            elevation={2}
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
            }}
          >
            <CompareIcon sx={{ fontSize: 60, color: theme.palette.info.main, opacity: 0.8, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Saved Results
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You need to save calculation results first before comparing them.
            </Typography>
            <Box sx={{ mt: 4 }}>
              <Grid container spacing={3} justifyContent="center">
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom color="primary" fontWeight="medium">
                        How to Compare Results
                      </Typography>
                      <ol>
                        <li>Go to the Calculation page and set your manual parameters</li>
                        <li>Calculate your manual configuration results and save them</li>
                        <li>Go to the Optimization page and run genetic algorithm optimization</li>
                        <li>Save the optimization results</li>
                        <li>Go to the Optimization page and run standard optimization</li>
                        <li>Save the optimization results</li>
                        <li>Return to this page to compare all saved results</li>
                      </ol>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Container>
      </ThemeProvider>
    );
  }

  if (!hasEnoughData()) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <ComparisonHeader />
          
          <Paper 
            elevation={2}
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.warning.main, 0.05),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
            }}
          >
            <CompareIcon sx={{ fontSize: 60, color: theme.palette.warning.main, opacity: 0.8, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Select at Least Two Results
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You need to select at least two results to compare them.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenSelectDialog}
              sx={{ mt: 3, borderRadius: 2 }}
            >
              Select Results
            </Button>
            
            <Box sx={{ mt: 4 }}>
              <TableContainer component={Paper} elevation={1} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Date Saved</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {savedResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>{result.savedName}</TableCell>
                        <TableCell>
                          <Chip 
                            label={result.methodType === 'manual' ? 'Manual' : 
                                   result.methodType === 'genetic' ? 'Genetic' : 'Standard'} 
                            color={result.methodType === 'manual' ? 'error' :
                                   result.methodType === 'genetic' ? 'success' : 'primary'}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(result.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            color="error" 
                            size="small"
                            onClick={() => handleDeleteDialogOpen(result.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Container>
      </ThemeProvider>
    );
  }
  
  // Get active comparison results
  const comparisonResults = getComparisonResults();

  // Identify which results we have
  const hasManual = comparisonData.manualResults !== null;
  const hasGenetic = comparisonData.geneticResults !== null;
  const hasStandard = comparisonData.standardResults !== null;
  
  // Prepare chart data
  const barChartData = comparisonResults.map(item => {
    return {
      name: item.label,
      classA: item.result.class_a_total || 0,
      classB: item.result.class_b_total || 0,
      total: (item.result.class_a_total || 0) + (item.result.class_b_total || 0),
      color: item.color
    };
  });
  
  // Prepare principal interest breakdown data
  const breakdownData = comparisonResults.map(item => ({
    name: item.label,
    classAPrincipal: item.result.class_a_principal || 0,
    classAInterest: item.result.class_a_interest || 0,
    classBPrincipal: item.result.class_b_principal || 0,
    classBCoupon: item.result.class_b_coupon || 0,
    color: item.color
  }));
  
  // Prepare buffer data
  const bufferData = comparisonResults.map(item => ({
    name: item.label,
    minBuffer: item.result.min_buffer_actual || 0,
    color: item.color
  }));
  
  // Prepare financing data
  const financingData = comparisonResults.map(item => ({
    name: item.label,
    financingCost: Math.abs(item.result.financing_cost || 0),
    isProfit: (item.result.financing_cost || 0) > 0,
    principalPaid: item.result.total_principal_paid || 0,
    loanPrincipal: item.result.total_loan_principal || 0,
    color: item.color
  }));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <ComparisonHeader />
        
        {/* Summary Cards */}
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            backgroundColor: alpha(theme.palette.background.paper, 0.8)
          }}
        >
          <Typography variant="h5" color="primary.main" gutterBottom fontWeight="medium" sx={{ mb: 3 }}>
            Comparison Summary
          </Typography>
          
          <Grid container spacing={3}>
            {comparisonResults.map((item, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card elevation={2} sx={{ 
                  height: '100%', 
                  backgroundColor: alpha(item.color, 0.1), 
                  border: `1px solid ${alpha(item.color, 0.2)}`,
                  borderRadius: 2
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ mr: 1, color: item.color }}>
                        {item.icon}
                      </Box>
                      <Typography variant="h6" fontWeight="medium" sx={{ color: item.color }}>
                        {item.label}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ mb: 2, opacity: 0.2 }} />
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">Total Structure Size</Typography>
                      <Typography variant="h6" sx={{ my: 0.5 }}>
                        {formatCurrency((item.result.class_a_total || 0) + (item.result.class_b_total || 0))}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Class A: {formatCurrency(item.result.class_a_total || 0)}, 
                        Class B: {formatCurrency(item.result.class_b_total || 0)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">Minimum Buffer</Typography>
                      <Typography variant="h6" color={
                        (item.result.min_buffer_actual || 0) >= 5.0 ? 'success.main' : 'error.main'
                      } sx={{ my: 0.5 }}>
                        {formatPercent(item.result.min_buffer_actual || 0)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">Financing Result</Typography>
                      <Typography variant="h6" color={
                        (item.result.financing_cost || 0) > 0 ? 'success.main' : 'error.main'
                      } sx={{ my: 0.5 }}>
                        {(item.result.financing_cost || 0) > 0 ? "Profit: " : "Loss: "}
                        {formatCurrency(Math.abs(item.result.financing_cost || 0))}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
        
        {/* Tabs for different comparison views */}
        <Box sx={{ 
          mb: 3, 
          borderRadius: 2, 
          overflow: 'hidden', 
          backgroundColor: alpha(theme.palette.background.paper, 0.4)
        }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minWidth: 'auto',
                px: 3,
                py: 2
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3
              }
            }}
          >
            <Tab icon={<PieChartIcon />} label="Structure Comparison" iconPosition="start" />
            <Tab icon={<BarChartIcon />} label="Tranches Detail" iconPosition="start" />
            <Tab icon={<AccountBalanceWalletIcon />} label="Financing Comparison" iconPosition="start" />
            <Tab icon={<TimelineIcon />} label="Tranche Details" iconPosition="start" />
          </Tabs>
        </Box>
        
        {/* Tab 1: Structure Comparison */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Paper 
                elevation={3}
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" fontWeight="medium">
                    Total Structure Comparison
                  </Typography>
                  <Tooltip title="Shows the distribution of Class A and Class B in each calculation approach">
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" color="info" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box sx={{ height: 400, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grid} />
                      <XAxis dataKey="name" tick={{ fill: theme.palette.text.secondary }} />
                      <YAxis 
                        tickFormatter={(value) => `₺${value/1000000}M`} 
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: 20 }}
                        formatter={(value) => (
                          <span style={{ color: theme.palette.text.primary }}>{value}</span>
                        )}
                      />
                      <Bar 
                        dataKey="classA" 
                        name="Class A" 
                        stackId="a"
                      >
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={alpha(entry.color, 0.8)} />
                        ))}
                      </Bar>
                      <Bar 
                        dataKey="classB" 
                        name="Class B" 
                        stackId="a"
                        opacity={0.5}
                      >
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                
                <Divider sx={{ my: 4 }} />
                
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Class Distribution
                </Typography>
                
                <Grid container spacing={4}>
                  {comparisonResults.map((item, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle1" align="center" gutterBottom sx={{ color: item.color, fontWeight: 'medium' }}>
                          {item.label}
                        </Typography>
                        <Box sx={{ height: 280 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Class A', value: item.result.class_a_total || 0 },
                                  { name: 'Class B', value: item.result.class_b_total || 0 }
                                ]}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                                labelLine={{ stroke: theme.palette.text.secondary }}
                              >
                                <Cell fill={alpha(item.color, 0.8)} />
                                <Cell fill={alpha(item.color, 0.4)} />
                              </Pie>
                              <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Total: {formatCurrency((item.result.class_a_total || 0) + (item.result.class_b_total || 0))}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Tab 2: Tranches Breakdown */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Paper 
                elevation={3}
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" fontWeight="medium">
                    Principal and Interest Distribution
                  </Typography>
                  <Tooltip title="Detailed breakdown of principal and interest components for each class">
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" color="info" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box sx={{ height: 400, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={breakdownData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grid} />
                      <XAxis dataKey="name" tick={{ fill: theme.palette.text.secondary }} />
                      <YAxis 
                        tickFormatter={(value) => `₺${value/1000000}M`} 
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: 20 }}
                        formatter={(value) => (
                          <span style={{ color: theme.palette.text.primary }}>{value}</span>
                        )}
                      />
                      <Bar 
                        dataKey="classAPrincipal" 
                        name="Class A Principal" 
                        fill={alpha(theme.palette.primary.main, 0.8)}
                      />
                      <Bar 
                        dataKey="classAInterest" 
                        name="Class A Interest" 
                        fill={alpha(theme.palette.primary.main, 0.5)}
                      />
                      <Bar 
                        dataKey="classBPrincipal" 
                        name="Class B Principal" 
                        fill={alpha(theme.palette.secondary.main, 0.8)}
                      />
                      <Bar 
                        dataKey="classBCoupon" 
                        name="Class B Coupon" 
                        fill={alpha(theme.palette.secondary.main, 0.5)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                
                <Divider sx={{ my: 4 }} />
                
                <TableContainer sx={{ maxHeight: 500 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Metric</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell 
                            key={index} 
                            align="right"
                            sx={{
                              color: item.color,
                              fontWeight: 'medium'
                            }}
                          >
                            {item.label}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right">
                            Manual vs. Genetic
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right">
                            Manual vs. Standard
                          </TableCell>
                        )}
                        {hasGenetic && hasStandard && (
                          <TableCell align="right">
                            Genetic vs. Standard
                          </TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow hover>
                        <TableCell>Class A Principal</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell key={index} align="right">
                            {formatCurrency(item.result.class_a_principal || 0)}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.geneticResults.class_a_principal,
                              comparisonData.manualResults.class_a_principal
                            ))}
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.class_a_principal,
                              comparisonData.manualResults.class_a_principal
                            ))}
                          </TableCell>
                        )}
                        {hasGenetic && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.class_a_principal,
                              comparisonData.geneticResults.class_a_principal
                            ))}
                          </TableCell>
                        )}
                      </TableRow>
                      <TableRow hover>
                        <TableCell>Class A Interest</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell key={index} align="right">
                            {formatCurrency(item.result.class_a_interest || 0)}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.geneticResults.class_a_interest,
                              comparisonData.manualResults.class_a_interest
                            ))}
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.class_a_interest,
                              comparisonData.manualResults.class_a_interest
                            ))}
                          </TableCell>
                        )}
                        {hasGenetic && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.class_a_interest,
                              comparisonData.geneticResults.class_a_interest
                            ))}
                          </TableCell>
                        )}
                      </TableRow>
                      <TableRow hover>
                        <TableCell>Class B Principal</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell key={index} align="right">
                            {formatCurrency(item.result.class_b_principal || 0)}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.geneticResults.class_b_principal,
                              comparisonData.manualResults.class_b_principal
                            ))}
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.class_b_principal,
                              comparisonData.manualResults.class_b_principal
                            ))}
                          </TableCell>
                        )}
                        {hasGenetic && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.class_b_principal,
                              comparisonData.geneticResults.class_b_principal
                            ))}
                          </TableCell>
                        )}
                      </TableRow>
                      <TableRow hover>
                        <TableCell>Class B Coupon</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell key={index} align="right">
                            {formatCurrency(item.result.class_b_coupon || 0)}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.geneticResults.class_b_coupon,
                              comparisonData.manualResults.class_b_coupon
                            ))}
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.class_b_coupon,
                              comparisonData.manualResults.class_b_coupon
                            ))}
                          </TableCell>
                        )}
                        {hasGenetic && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.class_b_coupon,
                              comparisonData.geneticResults.class_b_coupon
                            ))}
                          </TableCell>
                        )}
                      </TableRow>
                      <TableRow sx={{ "& td": { fontWeight: 'medium', backgroundColor: alpha(theme.palette.primary.main, 0.1) } }}>
                        <TableCell>Total</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell key={index} align="right">
                            {formatCurrency(
                              (item.result.class_a_total || 0) + (item.result.class_b_total || 0)
                            )}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              (comparisonData.geneticResults.class_a_total || 0) + (comparisonData.geneticResults.class_b_total || 0),
                              (comparisonData.manualResults.class_a_total || 0) + (comparisonData.manualResults.class_b_total || 0)
                            ))}
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              (comparisonData.standardResults.class_a_total || 0) + (comparisonData.standardResults.class_b_total || 0),
                              (comparisonData.manualResults.class_a_total || 0) + (comparisonData.manualResults.class_b_total || 0)
                            ))}
                          </TableCell>
                        )}
                        {hasGenetic && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              (comparisonData.standardResults.class_a_total || 0) + (comparisonData.standardResults.class_b_total || 0),
                              (comparisonData.geneticResults.class_a_total || 0) + (comparisonData.geneticResults.class_b_total || 0)
                            ))}
                          </TableCell>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Tab 3: Financing Comparison */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Paper 
                elevation={3}
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" color="info.main" fontWeight="medium">
                    Financing Comparison
                  </Typography>
                  <Tooltip title="Compares principal and interest payments alongside financing outcomes">
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" color="info" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Grid container spacing={4}>
                  <Grid item xs={12} md={7}>
                    <Box sx={{ height: 350, pr: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={financingData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grid} />
                          <XAxis 
                            type="number" 
                            tickFormatter={(value) => `₺${value/1000000}M`} 
                            tick={{ fill: theme.palette.text.secondary }}
                          />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fill: theme.palette.text.secondary }}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend 
                            wrapperStyle={{ paddingTop: 20 }}
                            formatter={(value) => (
                              <span style={{ color: theme.palette.text.primary }}>{value}</span>
                            )}
                          />
                          <Bar 
                            dataKey="principalPaid" 
                            name="Total Principal Paid" 
                            fill={theme.palette.primary.main} 
                            radius={[0, 4, 4, 0]}
                          />
                          <Bar 
                            dataKey="loanPrincipal" 
                            name="Total Loan Principal" 
                            fill={theme.palette.info.main}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={5}>
                    <Box sx={{ height: 350 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={financingData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grid} />
                          <XAxis dataKey="name" tick={{ fill: theme.palette.text.secondary }} />
                          <YAxis 
                            tickFormatter={(value) => `₺${value/1000000}M`} 
                            tick={{ fill: theme.palette.text.secondary }}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend 
                            wrapperStyle={{ paddingTop: 20 }}
                            formatter={(value) => (
                              <span style={{ color: theme.palette.text.primary }}>{value}</span>
                            )}
                          />
                          <Bar 
                            dataKey="financingCost" 
                            name="Financing Result" 
                            radius={[4, 4, 0, 0]}
                          >
                            {financingData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.isProfit ? theme.palette.success.main : theme.palette.error.main}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 4 }} />
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Metric</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell 
                            key={index} 
                            align="right"
                            sx={{
                              color: item.color,
                              fontWeight: 'medium'
                            }}
                          >
                            {item.label}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right">
                            Genetic Gain
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right">
                            Standard Gain
                          </TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow hover>
                        <TableCell>Total Principal Paid</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell key={index} align="right">
                            {formatCurrency(item.result.total_principal_paid || 0)}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.geneticResults.total_principal_paid,
                              comparisonData.manualResults.total_principal_paid
                            ))}
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.total_principal_paid,
                              comparisonData.manualResults.total_principal_paid
                            ))}
                          </TableCell>
                        )}
                      </TableRow>
                      <TableRow hover>
                        <TableCell>Total Loan Principal</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell key={index} align="right">
                            {formatCurrency(item.result.total_loan_principal || 0)}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.geneticResults.total_loan_principal,
                              comparisonData.manualResults.total_loan_principal
                            ))}
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right">
                            {formatDifference(calculateDifference(
                              comparisonData.standardResults.total_loan_principal,
                              comparisonData.manualResults.total_loan_principal
                            ))}
                          </TableCell>
                        )}
                      </TableRow>
                      <TableRow sx={{ 
                        "& td": { 
                          fontWeight: 'medium', 
                          backgroundColor: alpha(theme.palette.info.main, 0.1) 
                        } 
                      }}>
                        <TableCell>Financing Result</TableCell>
                        {comparisonResults.map((item, index) => (
                          <TableCell 
                            key={index} 
                            align="right"
                            sx={{ 
                              color: (item.result.financing_cost || 0) > 0 
                                ? 'success.main' 
                                : 'error.main' 
                            }}
                          >
                            {(item.result.financing_cost || 0) > 0 ? "Profit: " : "Loss: "}
                            {formatCurrency(Math.abs(item.result.financing_cost || 0))}
                          </TableCell>
                        ))}
                        {hasManual && hasGenetic && (
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(Math.abs(
                              (comparisonData.geneticResults.financing_cost || 0) - 
                              (comparisonData.manualResults.financing_cost || 0)
                            ))}
                          </TableCell>
                        )}
                        {hasManual && hasStandard && (
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(Math.abs(
                              (comparisonData.standardResults.financing_cost || 0) - 
                              (comparisonData.manualResults.financing_cost || 0)
                            ))}
                          </TableCell>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Tab 4: Tranche Details */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Paper 
                elevation={3}
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" color="success.main" fontWeight="medium">
                    Buffer Analysis
                  </Typography>
                  <Tooltip title="Analyzes the minimum buffer values across tranches">
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" color="info" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Alert 
                    severity="info" 
                    sx={{ mb: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}
                  >
                    Minimum buffer requirement is 5.0%. Values below this threshold may cause cash flow issues.
                  </Alert>
                </Box>
                
                <Box sx={{ height: 400, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bufferData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grid} />
                      <XAxis dataKey="name" tick={{ fill: theme.palette.text.secondary }} />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`} 
                        domain={[0, 'dataMax + 2']} 
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <RechartsTooltip formatter={(value) => `${value.toFixed(2)}%`} />
                      <Legend 
                        wrapperStyle={{ paddingTop: 20 }}
                        formatter={(value) => (
                          <span style={{ color: theme.palette.text.primary }}>{value}</span>
                        )}
                      />
                      <ReferenceLine 
                        y={5} 
                        label={{ value: "Min Requirement", fill: theme.palette.text.secondary }}
                        stroke={theme.palette.error.main} 
                        strokeDasharray="3 3" 
                      />
                      <Bar dataKey="minBuffer" name="Minimum Buffer" radius={[4, 4, 0, 0]}>
                        {bufferData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.minBuffer >= 5.0 ? theme.palette.success.main : theme.palette.error.main} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                
                <Divider sx={{ my: 4 }} />
                
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Tranche-Level Buffer Details
                </Typography>
                
                {comparisonResults.map((resultItem, resultIndex) => (
                  <Box key={resultIndex} sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      color: resultItem.color,
                      fontWeight: 'medium',
                      mt: 3
                    }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          backgroundColor: resultItem.color,
                          mr: 1 
                        }} 
                      />
                      {resultItem.label}
                    </Typography>
                    
                    {resultItem.result.tranche_results ? (
                      <TableContainer sx={{ mb: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Tranche</TableCell>
                              <TableCell align="right">Maturity (Days)</TableCell>
                              <TableCell align="right">Total Payment</TableCell>
                              <TableCell align="right">Buffer Ratio (%)</TableCell>
                              <TableCell align="right">Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {resultItem.result.tranche_results
                              .filter(tranche => tranche["Is Class A"])
                              .map((tranche, index) => (
                                <TableRow key={index} hover>
                                  <TableCell>{tranche["Tranche"]}</TableCell>
                                  <TableCell align="right">{tranche["Maturity Days"]}</TableCell>
                                  <TableCell align="right">{formatCurrency(tranche["Total Payment"])}</TableCell>
                                  <TableCell align="right">{formatPercent(tranche["Buffer Cash Flow Ratio (%)"])}</TableCell>
                                  <TableCell align="right">
                                    <Chip 
                                      size="small" 
                                      label={tranche["Buffer Cash Flow Ratio (%)"] >= 5.0 ? "Valid" : "Low"} 
                                      color={tranche["Buffer Cash Flow Ratio (%)"] >= 5.0 ? "success" : "error"} 
                                      sx={{ fontWeight: 500 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Detailed tranche data not available for this result.
                      </Typography>
                    )}
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Select Results Dialog */}
        <Dialog 
          open={selectDialogOpen} 
          onClose={handleCloseSelectDialog} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'background.paper',
              borderRadius: 2
            }
          }}
        >
          <DialogTitle>Select Results to Compare</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Select up to 3 results to compare. Choose results of different types (Manual, Genetic, and Standard) for the best comparison.
            </DialogContentText>
            <List sx={{ mt: 2 }}>
              {savedResults.map((result) => (
                <ListItem 
                  key={result.id} 
                  dense
                  onClick={() => handleSelectResult(result.id)}
                  sx={{ 
                    cursor: 'pointer',
                    p: 1,
                    mb: 1,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05)
                    },
                    backgroundColor: selectedResults.includes(result.id) 
                      ? alpha(theme.palette.primary.main, 0.1) 
                      : 'transparent',
                    borderRadius: 1
                  }}
                >
                  <Checkbox
                    edge="start"
                    checked={selectedResults.includes(result.id)}
                    tabIndex={-1}
                    disableRipple
                    color={
                      result.methodType === 'manual' ? 'error' :
                      result.methodType === 'genetic' ? 'success' : 'primary'
                    }
                  />
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body1">{result.savedName}</Typography>
                        <Chip 
                          label={
                            result.methodType === 'manual' ? 'Manual' : 
                            result.methodType === 'genetic' ? 'Genetic' : 'Standard'
                          }
                          size="small"
                          color={
                            result.methodType === 'manual' ? 'error' :
                            result.methodType === 'genetic' ? 'success' : 'primary'
                          }
                          sx={{ ml: 2, fontWeight: 500 }}
                        />
                      </Box>
                    }
                    secondary={new Date(result.timestamp).toLocaleString()}
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDialogOpen(result.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseSelectDialog} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button 
              onClick={handleConfirmSelection} 
              color="primary"
              variant="contained"
              disabled={selectedResults.length === 0}
              sx={{ borderRadius: 2 }}
            >
              Compare Selected ({selectedResults.length})
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
          PaperProps={{
            sx: {
              bgcolor: 'background.paper',
              borderRadius: 2
            }
          }}
        >
          <DialogTitle>Delete Saved Result</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this saved result? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleDeleteDialogClose} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              sx={{ borderRadius: 2 }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default ComparisonPage;