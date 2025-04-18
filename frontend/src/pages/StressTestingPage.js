// src/pages/StressTestingPage.js
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Slider, 
  TextField, 
  InputAdornment, 
  Button, 
  Tabs, 
  Tab, 
  Divider, 
  Card, 
  CardContent, 
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
  useTheme,
  ThemeProvider,
  createTheme,
  CssBaseline,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import TuneIcon from '@mui/icons-material/Tune';
import ScienceIcon from '@mui/icons-material/Science';
import SettingsIcon from '@mui/icons-material/Settings';
import CompareIcon from '@mui/icons-material/Compare';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';

// Import Recharts components
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ReferenceLine,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

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

// Custom styled component for slider
const StyledSlider = styled(Slider)(({ theme }) => ({
  color: theme.palette.primary.main,
  height: 8,
  '& .MuiSlider-track': {
    border: 'none',
    backgroundImage: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
  },
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    backgroundColor: theme.palette.background.paper,
    border: `2px solid ${theme.palette.primary.main}`,
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
    },
    '&:before': {
      display: 'none',
    },
  },
  '& .MuiSlider-valueLabel': {
    lineHeight: 1.2,
    fontSize: 12,
    background: 'unset',
    padding: 0,
    width: 32,
    height: 32,
    borderRadius: '50% 50% 50% 0',
    backgroundColor: theme.palette.primary.main,
    transformOrigin: 'bottom left',
    transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
    '&:before': { display: 'none' },
    '&.MuiSlider-valueLabelOpen': {
      transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
    },
    '& > *': {
      transform: 'rotate(45deg)',
    },
  },
}));

// Helper function to get color based on difference value
const getDifferenceColor = (diff, theme) => {
  if (diff >= -1) return theme.palette.success.main;
  if (diff >= -5) return theme.palette.warning.main;
  return theme.palette.error.main;
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  const theme = darkTheme;
  if (active && payload && payload.length) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.1),
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          maxWidth: 300,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>{label}</Typography>
        {payload.map((entry, index) => (
          <Box key={`tooltip-item-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', my: 0.5, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  mr: 1,
                  borderRadius: '50%'
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {entry.name}:
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight="medium" color={entry.color}>
              {typeof entry.value === 'number' 
                ? entry.value.toFixed(2) + (entry.unit || '%')
                : entry.value}
            </Typography>
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};

// Advanced custom tooltip for scatter chart
const ScatterTooltip = ({ active, payload }) => {
  const theme = darkTheme;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.1),
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          maxWidth: 300,
        }}
      >
        <Typography variant="subtitle2" gutterBottom fontWeight="medium">
          Scenario Analysis
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">NPL Rate:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="medium">{data.npl}%</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Prepayment:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="medium">{data.prepayment}%</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Reinvest Shift:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="medium">{data.reinvest}%</Typography>
          </Grid>
          <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Modeled Rate:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="medium" color={theme.palette.primary.main}>
              {data.modeled}%
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Realized Rate:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="medium" color={theme.palette.secondary.main}>
              {data.realized}%
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Difference:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="medium" 
              color={getDifferenceColor(data.difference, theme)}>
              {data.difference}%
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    );
  }
  return null;
};

const StressTestingPage = () => {
  const theme = darkTheme;
  const { calculationResults, savedResults } = useData();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for stress test parameters
  const [nplRange, setNplRange] = useState([2, 15]);
  const [prepaymentRange, setPrepaymentRange] = useState([5, 25]);
  const [reinvestmentRange, setReinvestmentRange] = useState([-10, 10]);
  const [defaultReinvestRate, setDefaultReinvestRate] = useState(30);
  const [scenarios, setScenarios] = useState(10);
  const [selectedScenarioType, setSelectedScenarioType] = useState('base');
  
  // New state variable for dropdown selection
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [availableStructures, setAvailableStructures] = useState([]);
  
  // State variables from Step 4
  const [predefinedScenario, setPredefinedScenario] = useState('base');
  
  // State variables from Step 5
  const [applyReinvestmentShift, setApplyReinvestmentShift] = useState(false);
  
  // State variables from Step 8
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  // Initialize with safe default values
  const [mockResults, setMockResults] = useState({
    classBCouponRate: {
      modeled: 42.5,
      realized: 38.7,
      difference: -3.8,
      status: 'warning' // 'success', 'warning', 'error'
    },
    scenarioResults: [
      { name: 'Base Case', npl: 5, prepayment: 10, reinvestment: 0, modeled: 42.5, realized: 38.7, difference: -3.8 },
      { name: 'Mild Stress', npl: 8, prepayment: 15, reinvestment: -3, modeled: 41.2, realized: 36.1, difference: -5.1 },
      { name: 'Severe Stress', npl: 12, prepayment: 20, reinvestment: -7, modeled: 39.5, realized: 33.2, difference: -6.3 },
      { name: 'Extreme Stress', npl: 15, prepayment: 25, reinvestment: -10, modeled: 37.8, realized: 30.4, difference: -7.4 },
      { name: 'Best Case', npl: 2, prepayment: 5, reinvestment: 5, modeled: 43.8, realized: 41.3, difference: -2.5 },
    ],
    sensitivityAnalysis: {
      npl: [
        { value: 2, modeled: 43.5, realized: 41.0 },
        { value: 5, modeled: 42.5, realized: 38.7 },
        { value: 8, modeled: 41.2, realized: 36.1 },
        { value: 10, modeled: 40.3, realized: 34.8 },
        { value: 12, modeled: 39.5, realized: 33.2 },
        { value: 15, modeled: 37.8, realized: 30.4 },
      ],
      prepayment: [
        { value: 5, modeled: 43.8, realized: 41.3 },
        { value: 10, modeled: 42.5, realized: 38.7 },
        { value: 15, modeled: 41.2, realized: 36.1 },
        { value: 20, modeled: 39.5, realized: 33.2 },
        { value: 25, modeled: 37.8, realized: 30.4 },
      ],
      reinvestment: [
        { value: -10, modeled: 37.8, realized: 30.4 },
        { value: -5, modeled: 40.3, realized: 34.8 },
        { value: 0, modeled: 42.5, realized: 38.7 },
        { value: 5, modeled: 43.8, realized: 41.3 },
        { value: 10, modeled: 45.0, realized: 43.6 },
      ],
    },
    combinedScenarios: [
      { npl: 2, prepayment: 5, reinvest: 5, modeled: 45.0, realized: 43.6 },
      { npl: 5, prepayment: 5, reinvest: 0, modeled: 43.2, realized: 40.5 },
      { npl: 5, prepayment: 10, reinvest: 0, modeled: 42.5, realized: 38.7 },
      { npl: 5, prepayment: 15, reinvest: 0, modeled: 41.8, realized: 37.2 },
      { npl: 8, prepayment: 10, reinvest: -3, modeled: 41.2, realized: 36.1 },
      { npl: 10, prepayment: 15, reinvest: -5, modeled: 40.3, realized: 34.8 },
      { npl: 12, prepayment: 20, reinvest: -7, modeled: 39.5, realized: 33.2 },
      { npl: 15, prepayment: 20, reinvest: -7, modeled: 38.6, realized: 31.8 },
      { npl: 15, prepayment: 25, reinvest: -10, modeled: 37.8, realized: 30.4 },
    ]
  });
  
  // From Step 2: Fetch Available Structures
  useEffect(() => {
    if (savedResults && savedResults.length > 0) {
      // Group results by structure type
      const structures = savedResults.map(result => {
        // Calculate coupon rate from Class B Coupon and Class B Principal if not available
        let directCouponRate = result.direct_class_b_coupon_rate;
        
        // If value is not present but coupon and principal are, calculate the rate
        if ((!directCouponRate || directCouponRate === 0) && result.class_b_coupon && result.class_b_principal) {
          directCouponRate = (result.class_b_coupon / result.class_b_principal) * 100;
        }
        
        return {
          id: result.id,
          name: result.savedName || `${result.methodType} Structure`,
          type: result.methodType,
          // Use calculated coupon rate
          classBCouponRate: directCouponRate || 0,
          directCouponRate: directCouponRate || 0,
          effectiveCouponRate: result.class_b_coupon_rate || 0
        };
      });
      
      setAvailableStructures(structures);
      
      // Set first structure as default if none selected
      if (structures.length > 0 && !selectedStructureId) {
        setSelectedStructureId(structures[0].id);
      }
    }
  }, [savedResults, selectedStructureId]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle structure selection change
  const handleStructureChange = (event) => {
    setSelectedStructureId(event.target.value);
  };
  
  // Get selected structure details
  const getSelectedStructure = () => {
    return availableStructures.find(structure => structure.id === selectedStructureId) || null;
  };

  // Updated handleRunStressTest
  const handleRunStressTest = async () => {
    const selectedStructure = getSelectedStructure();
    
    if (!selectedStructure) {
      setSnackbarMessage("Please select a structure to test");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the original structure details from savedResults
      const structureDetails = savedResults.find(r => r.id === selectedStructure.id);
      
      if (!structureDetails) {
        throw new Error("Structure details not found");
      }
      
      // Extract parameters for the test
      const nplRate = nplRange[0]; // Use the first value if it's a range
      const prepaymentRate = prepaymentRange[0]; // Use the first value if it's a range
      const reinvestmentShift = applyReinvestmentShift ? reinvestmentRange[0] : 0;
      
      // Here you would typically call your API to run the stress test
      // For now, we'll simulate it with setTimeout
      
      setTimeout(() => {
        // Use the calculated coupon rate as baseline
        const baselineCouponRate = selectedStructure.directCouponRate || 0;
        
        // Calculate impact (this would normally come from backend):
        // Higher NPL rates reduce coupon rate
        // Higher prepayment can reduce or increase depending on structure
        // Reinvestment shifts directly impact
        const nplImpact = -1.5 * (nplRate / 2); // -1.5% per 2% NPL
        const prepaymentImpact = -0.8 * ((prepaymentRate - 20) / 10); // -0.8% per 10% above 20%
        const reinvestmentImpact = reinvestmentShift * 0.3; // 0.3% impact per 1% shift
        
        const modifiedCouponRate = baselineCouponRate + nplImpact + prepaymentImpact + reinvestmentImpact;
        
        // Update the mock results
        const updatedResults = {
          ...mockResults,
          classBCouponRate: {
            modeled: baselineCouponRate,
            realized: Math.max(0, modifiedCouponRate),
            difference: modifiedCouponRate - baselineCouponRate,
            status: modifiedCouponRate < baselineCouponRate - 5 ? 'error' : 
                  modifiedCouponRate < baselineCouponRate - 1 ? 'warning' : 'success'
          },
          scenarioResults: [
            {
              name: "Original",
              npl: 0,
              prepayment: 0,
              reinvestment: 0,
              modeled: baselineCouponRate,
              realized: baselineCouponRate,
              difference: 0
            },
            {
              name: predefinedScenario.charAt(0).toUpperCase() + predefinedScenario.slice(1),
              npl: nplRate,
              prepayment: prepaymentRate,
              reinvestment: reinvestmentShift,
              modeled: baselineCouponRate,
              realized: modifiedCouponRate,
              difference: modifiedCouponRate - baselineCouponRate
            }
          ]
        };
        
        // Update state with the new results
        setMockResults(updatedResults);
        setIsLoading(false);
        
        // Automatically switch to summary tab
        setTabValue(0);
        
        // Show success message
        setSnackbarMessage("Stress test completed successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      }, 1500);
      
      // In a real implementation, use the API instead of setTimeout:
      /*
      const response = await runStressTest({
        structure: {
          id: structureDetails.id,
          direct_coupon_rate: selectedStructure.directCouponRate || 0,
          effective_coupon_rate: selectedStructure.effectiveCouponRate || 0
        },
        scenario: {
          name: predefinedScenario,
          npl_rate: nplRate,
          prepayment_rate: prepaymentRate,
          reinvestment_shift: reinvestmentShift
        }
      });
      
      setMockResults(response);
      setIsLoading(false);
      setTabValue(0);
      setSnackbarMessage("Stress test completed successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      */
      
    } catch (error) {
      console.error("Error running stress test:", error);
      setIsLoading(false);
      setSnackbarMessage("Error running stress test: " + error.message);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };
  
  // Format data for the sensitivity charts
  const formatSensitivityData = (dataKey) => {
    if (!mockResults?.sensitivityAnalysis?.[dataKey]) {
      return [];
    }
    
    return mockResults.sensitivityAnalysis[dataKey].map(item => ({
      value: item.value || 0,
      modeled: item.modeled || 0,
      realized: item.realized || 0,
      difference: (item.realized || 0) - (item.modeled || 0)
    }));
  };
  
  // Format combined scenarios data for scatter plot
  const formatScatterData = () => {
    if (!mockResults?.combinedScenarios) {
      return [];
    }
    
    return mockResults.combinedScenarios.map(item => ({
      x: item.npl || 0, // NPL rate for X axis
      y: item.prepayment || 0, // Prepayment rate for Y axis
      z: Math.abs((item.realized || 0) - (item.modeled || 0)) * 10, // Difference size for bubble size (scaled)
      npl: item.npl || 0,
      prepayment: item.prepayment || 0,
      reinvest: item.reinvest || 0,
      modeled: item.modeled || 0,
      realized: item.realized || 0,
      difference: ((item.realized || 0) - (item.modeled || 0)).toFixed(2)
    }));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Page Header */}
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon 
              sx={{ 
                fontSize: 36, 
                color: theme.palette.primary.main,
                mr: 2,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }} 
            />
            <Box>
              <Typography variant="h4" fontWeight="500">
                Stress Testing
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Analyze Class B coupon performance under various market conditions
              </Typography>
            </Box>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveAltIcon />}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
            }}
          >
            Export Results
          </Button>
        </Box>
        
        {/* Structure Dropdown Selection */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <CompareIcon sx={{ mr: 1, color: theme.palette.warning.light }} />
            Select Structure to Stress Test
          </Typography>
          
          {availableStructures.length > 0 ? (
            <FormControl fullWidth variant="outlined">
              <InputLabel id="structure-select-label">Select Structure</InputLabel>
              <Select
                labelId="structure-select-label"
                id="structure-select"
                value={selectedStructureId}
                onChange={handleStructureChange}
                label="Select Structure"
                sx={{ mb: 2 }}
              >
                {availableStructures.map((structure) => (
                  <MenuItem key={structure.id} value={structure.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {structure.type === 'manual' && <TuneIcon sx={{ color: theme.palette.error.main, mr: 1 }} />}
                        {structure.type === 'genetic' && <ScienceIcon sx={{ color: theme.palette.success.main, mr: 1 }} />}
                        {structure.type === 'standard' && <SettingsIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />}
                        <Typography>{structure.name}</Typography>
                      </Box>
                      <Chip 
                        label={`Coupon Rate: ${structure.directCouponRate.toFixed(2)}%`}
                        color="warning"
                        size="small"
                        sx={{ ml: 2 }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Alert severity="info">
              No saved structures found. Please calculate and save at least one structure before running stress tests.
            </Alert>
          )}
          
          {getSelectedStructure() && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
              <Typography variant="subtitle2" gutterBottom>Selected Structure Details:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Type:</Typography>
                  <Typography variant="body1">
                    {getSelectedStructure().type === 'manual' ? 'Manual Calculation' : 
                     getSelectedStructure().type === 'genetic' ? 'Genetic Algorithm' : 
                     'Grid Algorithm'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Class B Direct Coupon Rate:</Typography>
                  <Typography variant="body1" color="warning.main" fontWeight="medium">
                    {getSelectedStructure().directCouponRate.toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Class B Effective Coupon Rate:</Typography>
                  <Typography variant="body1">
                    {getSelectedStructure().effectiveCouponRate.toFixed(2)}%
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
        
        <Grid container spacing={4}>
          {/* Parameters Panel */}
          <Grid item xs={12} md={4}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3, 
                height: '100%',
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TuneIcon sx={{ mr: 1, color: theme.palette.primary.light }} />
                Stress Test Parameters
              </Typography>
              
              {/* Predefined Scenario Selection from Step 4 */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                  <CompareArrowsIcon sx={{ fontSize: 20, mr: 1, color: theme.palette.info.light }} />
                  Predefined Scenarios
                  <Tooltip title="Select a predefined scenario or customize parameters manually" sx={{ ml: 1 }}>
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                  <Button
                    variant={predefinedScenario === 'optimistic' ? 'contained' : 'outlined'}
                    color="success"
                    onClick={() => {
                      setPredefinedScenario('optimistic');
                      setNplRange([1, 1]);
                      setPrepaymentRange([20, 20]);
                      setReinvestmentRange([0, 0]);
                    }}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Optimistic
                  </Button>
                  
                  <Button
                    variant={predefinedScenario === 'base' ? 'contained' : 'outlined'}
                    color="primary"
                    onClick={() => {
                      setPredefinedScenario('base');
                      setNplRange([1.5, 1.5]);
                      setPrepaymentRange([30, 30]);
                      setReinvestmentRange([0, 0]);
                    }}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Base Case
                  </Button>
                  
                  <Button
                    variant={predefinedScenario === 'pessimistic' ? 'contained' : 'outlined'}
                    color="error"
                    onClick={() => {
                      setPredefinedScenario('pessimistic');
                      setNplRange([5, 5]);
                      setPrepaymentRange([15, 15]);
                      setReinvestmentRange([-5, -5]);
                    }}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Pessimistic
                  </Button>
                  
                  <Button
                    variant={predefinedScenario === 'extreme' ? 'contained' : 'outlined'}
                    color="warning"
                    onClick={() => {
                      setPredefinedScenario('extreme');
                      setNplRange([10, 10]);
                      setPrepaymentRange([10, 10]);
                      setReinvestmentRange([-10, -10]);
                    }}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Extreme Stress
                  </Button>
                  
                  <Button
                    variant={predefinedScenario === 'custom' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setPredefinedScenario('custom');
                    }}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Custom
                  </Button>
                </Box>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                  <WarningAmberIcon sx={{ fontSize: 20, mr: 1, color: theme.palette.warning.main }} />
                  NPL Rate Range (%)
                  <Tooltip title="Non-Performing Loan rate affects the cash flow available for Class B payment" sx={{ ml: 1 }}>
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Box sx={{ px: 1, pt: 1, pb: 2 }}>
                  <StyledSlider
                    value={nplRange}
                    onChange={(e, value) => setNplRange(value)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={30}
                    step={1}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 15, label: '15%' },
                      { value: 30, label: '30%' }
                    ]}
                  />
                </Box>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                  <TrendingDownIcon sx={{ fontSize: 20, mr: 1, color: theme.palette.primary.light }} />
                  Prepayment Rate Range (%)
                  <Tooltip title="Early prepayment rates affect the expected cash flow timing" sx={{ ml: 1 }}>
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Box sx={{ px: 1, pt: 1, pb: 2 }}>
                  <StyledSlider
                    value={prepaymentRange}
                    onChange={(e, value) => setPrepaymentRange(value)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={50}
                    step={1}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 25, label: '25%' },
                      { value: 50, label: '50%' }
                    ]}
                  />
                </Box>
              </Box>
              
              {/* Reinvestment Rate Shift Toggle from Step 5 */}
              <Box sx={{ mt: 3 }}>
                <FormControl component="fieldset">
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={applyReinvestmentShift}
                        onChange={(e) => setApplyReinvestmentShift(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Apply Reinvestment Rate Shift"
                  />
                  <Typography variant="body2" color="text.secondary">
                    When enabled, all reinvestment rates will shift by the specified amount
                  </Typography>
                </FormControl>
                
                {applyReinvestmentShift && (
                  <Box sx={{ px: 1, pt: 1, pb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                      <AttachMoneyIcon sx={{ fontSize: 20, mr: 1, color: theme.palette.secondary.light }} />
                      Reinvestment Rate Shift (±%)
                    </Typography>
                    <StyledSlider
                      value={reinvestmentRange}
                      onChange={(e, value) => setReinvestmentRange(value)}
                      valueLabelDisplay="auto"
                      min={-10}
                      max={10}
                      step={1}
                      marks={[
                        { value: -10, label: '-10%' },
                        { value: -5, label: '-5%' },
                        { value: 0, label: '0%' },
                        { value: 5, label: '+5%' },
                        { value: 10, label: '+10%' }
                      ]}
                    />
                  </Box>
                )}
              </Box>
              
              <Box sx={{ mt: 4 }}>
                <TextField
                  fullWidth
                  label="Base Reinvestment Rate (%)"
                  value={defaultReinvestRate}
                  onChange={(e) => setDefaultReinvestRate(Number(e.target.value))}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 3 }}
                />
                
                <TextField
                  fullWidth
                  label="Number of Scenarios"
                  value={scenarios}
                  onChange={(e) => setScenarios(Number(e.target.value))}
                  type="number"
                  variant="outlined"
                  size="small"
                  sx={{ mb: 3 }}
                />
                
                <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 4 }}>
                  <InputLabel>Pre-defined Scenario</InputLabel>
                  <Select
                    value={selectedScenarioType}
                    onChange={(e) => setSelectedScenarioType(e.target.value)}
                    label="Pre-defined Scenario"
                  >
                    <MenuItem value="base">Base Case</MenuItem>
                    <MenuItem value="mild">Mild Stress</MenuItem>
                    <MenuItem value="moderate">Moderate Stress</MenuItem>
                    <MenuItem value="severe">Severe Stress</MenuItem>
                    <MenuItem value="extreme">Extreme Stress</MenuItem>
                    <MenuItem value="custom">Custom Scenario</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <AssessmentIcon />}
                  onClick={handleRunStressTest}
                  disabled={isLoading || !selectedStructureId}
                  sx={{
                    py: 1.2,
                    borderRadius: 2,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
                    }
                  }}
                >
                  {isLoading ? 'Running Tests...' : 'Run Stress Tests'}
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Results Panel */}
          <Grid item xs={12} md={8}>
            <Paper 
              elevation={3}
              sx={{ 
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Box sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                backgroundColor: alpha(theme.palette.background.paper, 0.4),
                px: 2
              }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      minWidth: 100,
                      py: 2
                    }
                  }}
                >
                  <Tab 
                    label="Summary" 
                    icon={<ShowChartIcon />} 
                    iconPosition="start"
                  />
                  <Tab 
                    label="NPL Sensitivity" 
                    icon={<WarningAmberIcon />} 
                    iconPosition="start"
                  />
                  <Tab 
                    label="Prepayment Impact" 
                    icon={<TrendingDownIcon />} 
                    iconPosition="start"
                  />
                  <Tab 
                    label="Combined Analysis" 
                    icon={<CompareArrowsIcon />} 
                    iconPosition="start"
                  />
                </Tabs>
              </Box>
              
              {/* Summary Tab */}
              {tabValue === 0 && (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Box sx={{ 
                        p: 2.5, 
                        borderRadius: 2, 
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        backgroundColor: alpha(theme.palette.background.paper, 0.4),
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4
                      }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Direct Coupon Rate</Typography>
                          <Typography variant="h3" color="primary.main" sx={{ mt: 0.5 }}>
                            {(mockResults.classBCouponRate?.modeled || 0).toFixed(1)}%
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="body2" color="text.secondary">Realized Direct Coupon Rate</Typography>
                          <Typography 
                            variant="h3" 
                            sx={{ 
                              mt: 0.5, 
                              color: getDifferenceColor(mockResults.classBCouponRate?.difference || 0, theme)
                            }}
                          >
                            {(mockResults.classBCouponRate?.realized || 0).toFixed(1)}%
                          </Typography>
                        </Box>
                        
                        <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                          <Typography variant="body2" color="text.secondary">Difference</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 1 }}>
                            <Chip 
                              label={`${(mockResults.classBCouponRate?.difference || 0) > 0 ? '+' : ''}${(mockResults.classBCouponRate?.difference || 0).toFixed(1)}%`}
                              color={
                                (mockResults.classBCouponRate?.difference || 0) >= -1 ? "success" :
                                (mockResults.classBCouponRate?.difference || 0) >= -5 ? "warning" : "error"
                              }
                              sx={{ fontWeight: 'bold', fontSize: '1.1rem', height: 32, px: 1 }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {mockResults.classBCouponRate.difference >= -1 ? "Within target" :
                             mockResults.classBCouponRate.difference >= -5 ? "Moderate deviation" : "Significant deviation"}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Scenario Comparison
                      </Typography>
                      <Box sx={{ height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={mockResults.scenarioResults}
                            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grid} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: theme.palette.text.secondary }}
                              angle={-45}
                              textAnchor="end"
                              height={70}
                            />
                            <YAxis 
                              tickFormatter={(value) => `${value}%`}
                              tick={{ fill: theme.palette.text.secondary }}
                              domain={[0, 'dataMax + 5']}
                            />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Legend 
                              wrapperStyle={{ paddingTop: 20 }}
                              formatter={(value) => (
                                <span style={{ color: theme.palette.text.primary }}>{value}</span>
                              )}
                            />
                            <Bar 
                              name="Modeled Rate" 
                              dataKey="modeled" 
                              fill={theme.palette.primary.main}
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar 
                              name="Realized Rate" 
                              dataKey="realized" 
                              fill={theme.palette.secondary.main}
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              {/* NPL Sensitivity Tab */}
              {tabValue === 1 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Class B Coupon Rate vs. NPL Rates
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This analysis shows how Non-Performing Loan (NPL) rates affect the Class B coupon rates. Higher NPL rates typically reduce available cash flow for Class B payments.
                  </Typography>
                  
                  <Box sx={{ height: 400, mb: 4 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={formatSensitivityData('npl')}
                        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grid} />
                        <XAxis 
                          dataKey="value"
                          label={{ value: 'NPL Rate (%)', position: 'insideBottomRight', offset: -5, fill: theme.palette.text.secondary }}
                          tick={{ fill: theme.palette.text.secondary }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value}%`}
                          label={{ value: 'Coupon Rate (%)', angle: -90, position: 'insideLeft', fill: theme.palette.text.secondary }}
                          tick={{ fill: theme.palette.text.secondary }}
                          domain={[0, 'dataMax + 5']}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend 
                          wrapperStyle={{ paddingTop: 20 }}
                          formatter={(value) => (
                            <span style={{ color: theme.palette.text.primary }}>{value}</span>
                          )}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="modeled" 
                          name="Modeled Rate" 
                          stroke={theme.palette.primary.main}
                          strokeWidth={2}
                          dot={{ r: 5, fill: theme.palette.primary.main }}
                          activeDot={{ r: 7, fill: theme.palette.primary.light }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="realized" 
                          name="Realized Rate" 
                          stroke={theme.palette.secondary.main}
                          strokeWidth={2}
                          dot={{ r: 5, fill: theme.palette.secondary.main }}
                          activeDot={{ r: 7, fill: theme.palette.secondary.light }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.4), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Key Insights:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • The modeled and realized rates both decrease as NPL rates increase<br />
                      • The gap between modeled and realized rates widens with higher NPL rates<br />
                      • At NPL rates above 12%, the deviation becomes significant (over 5%)<br />
                      • Base case projections assume a 5% NPL rate
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Prepayment Impact Tab */}
              {tabValue === 2 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Class B Coupon Rate vs. Prepayment Rates
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This analysis shows how early prepayment rates affect Class B coupon performance. Higher prepayment rates can impact the expected cash flow timing and reinvestment opportunities.
                  </Typography>
                  
                  <Box sx={{ height: 400, mb: 4 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={formatSensitivityData('prepayment')}
                        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grid} />
                        <XAxis 
                          dataKey="value"
                          label={{ value: 'Prepayment Rate (%)', position: 'insideBottomRight', offset: -5, fill: theme.palette.text.secondary }}
                          tick={{ fill: theme.palette.text.secondary }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value}%`}
                          label={{ value: 'Coupon Rate (%)', angle: -90, position: 'insideLeft', fill: theme.palette.text.secondary }}
                          tick={{ fill: theme.palette.text.secondary }}
                          domain={[0, 'dataMax + 5']}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend 
                          wrapperStyle={{ paddingTop: 20 }}
                          formatter={(value) => (
                            <span style={{ color: theme.palette.text.primary }}>{value}</span>
                          )}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="modeled" 
                          name="Modeled Rate" 
                          stroke={theme.palette.primary.main}
                          strokeWidth={2}
                          dot={{ r: 5, fill: theme.palette.primary.main }}
                          activeDot={{ r: 7, fill: theme.palette.primary.light }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="realized" 
                          name="Realized Rate" 
                          stroke={theme.palette.secondary.main}
                          strokeWidth={2}
                          dot={{ r: 5, fill: theme.palette.secondary.main }}
                          activeDot={{ r: 7, fill: theme.palette.secondary.light }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.4), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Key Insights:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • Higher prepayment rates lead to lower coupon rates for Class B notes<br />
                      • At prepayment rates above 20%, the deviation between modeled and realized becomes critical<br />
                      • Base case projections assume a 10% prepayment rate<br />
                      • Prepayment sensitivity analysis suggests careful monitoring of early repayments
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Combined Analysis Tab */}
              {tabValue === 3 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Multifactor Analysis of Rate Deviation
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This combined analysis shows how NPL and prepayment rates together affect Class B coupon rate deviation. Bubble size indicates the magnitude of deviation.
                  </Typography>
                  
                  <Box sx={{ height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.grid} />
                        <XAxis 
                          type="number" 
                          dataKey="x" 
                          name="NPL Rate" 
                          unit="%" 
                          domain={[0, 20]}
                          label={{ value: 'NPL Rate (%)', position: 'insideBottomRight', offset: -5, fill: theme.palette.text.secondary }}
                          tick={{ fill: theme.palette.text.secondary }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="y" 
                          name="Prepayment Rate" 
                          unit="%"
                          domain={[0, 30]}
                          label={{ value: 'Prepayment Rate (%)', angle: -90, position: 'insideLeft', fill: theme.palette.text.secondary }}
                          tick={{ fill: theme.palette.text.secondary }}
                        />
                        <ZAxis type="number" range={[60, 350]} />
                        <RechartsTooltip content={<ScatterTooltip />} />
                        <Legend 
                          wrapperStyle={{ paddingTop: 20 }}
                          formatter={(value) => (
                            <span style={{ color: theme.palette.text.primary }}>{value}</span>
                          )}
                        />
                        <Scatter 
                          name="Rate Deviation" 
                          data={formatScatterData()} 
                          fill={theme.palette.error.main}
                          fillOpacity={0.7}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.4), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Risk Heatmap Interpretation
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Larger bubbles indicate greater deviation between modeled and realized coupon rates<br />
                      • The upper right quadrant (high NPL, high prepayment) represents the most severe stress conditions<br />
                      • Scenarios with high NPL rates and high prepayment rates tend to result in the largest deviations<br />
                      • Base case parameters (5% NPL, 10% prepayment) show moderate but acceptable deviation
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
        
        {/* Snackbar for Notifications from Step 8 */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
};

export default StressTestingPage;