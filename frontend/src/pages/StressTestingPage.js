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
import { runStressTest } from '../services/apiService';

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

/**
 * More robust formatter for ensuring data meets backend requirements
 * 
 * @param {Object} structureDetails - Structure data from savedResults
 * @returns {Object} - Properly formatted structure object for API
 */
const formatStructureForStressTest = (structureDetails) => {
  console.log('Input structure details:', structureDetails);
  
  // Helper function to find data in different possible locations
  const extractProperty = (obj, keys, defaultValue) => {
    if (!obj) return defaultValue;
    
    for (const key of keys) {
      if (obj[key] !== undefined) {
        console.log(`Found property "${key}" with value:`, obj[key]);
        return obj[key];
      }
    }
    
    // For nested property paths using dot notation
    for (const key of keys) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let value = obj;
        let found = true;
        
        for (const part of parts) {
          if (value && value[part] !== undefined) {
            value = value[part];
          } else {
            found = false;
            break;
          }
        }
        
        if (found) {
          console.log(`Found nested property "${key}" with value:`, value);
          return value;
        }
      }
    }
    
    console.log(`Property not found for keys: [${keys.join(', ')}], using default:`, defaultValue);
    return defaultValue;
  };

  // Ensure start_date is in the correct format (YYYY-MM-DD)
  const possibleDateFields = ['start_date', 'general_settings.start_date', 'date', 'startDate', 'issue_date'];
  let rawDate = extractProperty(structureDetails, possibleDateFields, null);
  let formattedDate;
  
  if (rawDate instanceof Date) {
    formattedDate = rawDate.toISOString().split('T')[0];
  } else if (typeof rawDate === 'string') {
    // Try to parse the date and format it correctly
    try {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        formattedDate = parsedDate.toISOString().split('T')[0];
      } else {
        // If parsing fails, use the original string (assuming it's already in YYYY-MM-DD format)
        formattedDate = rawDate;
      }
    } catch (e) {
      // If any error occurs, use the original string
      formattedDate = rawDate;
    }
  } else {
    // Fallback to current date if no valid date is available
    formattedDate = new Date().toISOString().split('T')[0];
    console.warn('No valid start_date found, using current date');
  }

  // Helper function to ensure array fields
  const ensureNumericArray = (arr, minLength = 1) => {
    if (!arr) {
      console.log(`Creating default array of length ${minLength}`);
      return Array(minLength).fill(0);
    }
    
    if (typeof arr === 'string') {
      // Try to parse JSON string
      try {
        const parsed = JSON.parse(arr);
        return Array.isArray(parsed) ? parsed.map(Number) : Array(minLength).fill(0);
      } catch (e) {
        return Array(minLength).fill(0);
      }
    }
    
    if (!Array.isArray(arr)) {
      // If not an array but a single number, create an array with that number
      const num = Number(arr);
      return isNaN(num) ? Array(minLength).fill(0) : [num];
    }
    
    // Convert array elements to numbers, replacing NaN with 0
    return arr.map(item => {
      const num = Number(item);
      return isNaN(num) ? 0 : num;
    });
  };

  // Helper function to ensure numeric fields
  const ensureNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Expanded list of possible field names for Class A maturities
  const possibleFieldMappings = {
    a_maturities: [
      'a_maturities', 
      'tranches_a.maturity_days', 
      'tranchesA.maturity_days', 
      'class_a_maturities',
      'maturity_days',
      'maturities',
      'tranche_maturities',
      'class_a.maturities',
      'class_a.maturity_days'
    ],
    a_base_rates: [
      'a_base_rates', 
      'tranches_a.base_rate', 
      'tranchesA.base_rate',
      'class_a_base_rates',
      'base_rates',
      'class_a.base_rates',
      'class_a.base_rate'
    ],  
    a_spreads: [
      'a_spreads', 
      'tranches_a.spread', 
      'tranchesA.spread',
      'class_a_spreads',
      'spreads',
      'class_a.spreads',
      'class_a.spread'
    ],
    a_reinvest_rates: [
      'a_reinvest_rates', 
      'tranches_a.reinvest_rate', 
      'tranchesA.reinvest_rate',
      'class_a_reinvest_rates',
      'reinvest_rates',
      'class_a.reinvest_rates',
      'class_a.reinvest_rate'
    ],
    a_nominals: [
      'a_nominals', 
      'tranches_a.nominal', 
      'tranchesA.nominal',
      'class_a_nominals',
      'nominals',
      'class_a_principal',
      'class_a.nominals',
      'class_a.nominal'
    ],
    b_maturity: [
      'b_maturity', 
      'tranche_b.maturity_days', 
      'trancheB.maturity_days',
      'class_b_maturity',
      'class_b.maturity_days',
      'class_b.maturity'
    ],
    b_base_rate: [
      'b_base_rate', 
      'tranche_b.base_rate', 
      'trancheB.base_rate',
      'class_b_base_rate',
      'class_b.base_rate'
    ],
    b_spread: [
      'b_spread', 
      'tranche_b.spread', 
      'trancheB.spread',
      'class_b_spread',
      'class_b.spread'
    ],
    b_reinvest_rate: [
      'b_reinvest_rate', 
      'tranche_b.reinvest_rate', 
      'trancheB.reinvest_rate',
      'class_b_reinvest_rate',
      'class_b.reinvest_rate'
    ],
    b_nominal: [
      'b_nominal', 
      'tranche_b.nominal', 
      'trancheB.nominal', 
      'class_b_principal',
      'class_b.nominal',
      'class_b.principal'
    ],
    ops_expenses: [
      'ops_expenses', 
      'operational_expenses', 
      'general_settings.operational_expenses',
      'expenses',
      'operational.expenses'
    ]
  };

  // Check if we have a tranche structure or data in one of several possible locations
  console.log('Looking for Class A tranche data in various locations...');
  
  // Check for structured tranche data first
  let a_maturities = [], a_base_rates = [], a_spreads = [], a_reinvest_rates = [], a_nominals = [];
  let trancheDataFound = false;
  
  // Check for tranches in various possible field names and formats
  const possibleTrancheFields = [
    'tranches_a', 'tranchesA', 'class_a_tranches', 'class_a', 'tranches.a', 'a_tranches'
  ];
  
  for (const field of possibleTrancheFields) {
    const tranches = extractProperty(structureDetails, [field], null);
    if (Array.isArray(tranches) && tranches.length > 0 && typeof tranches[0] === 'object') {
      console.log(`Found tranches as array of objects in field: ${field}`, tranches);
      a_maturities = tranches.map(t => ensureNumber(t.maturity_days || t.maturity));
      a_base_rates = tranches.map(t => ensureNumber(t.base_rate));
      a_spreads = tranches.map(t => ensureNumber(t.spread));
      a_reinvest_rates = tranches.map(t => ensureNumber(t.reinvest_rate));
      a_nominals = tranches.map(t => ensureNumber(t.nominal || t.principal));
      trancheDataFound = true;
      break;
    }
  }
  
  // If we didn't find structured tranche data, look for the individual arrays
  if (!trancheDataFound) {
    console.log('No structured tranche data found, looking for individual arrays...');
    a_maturities = ensureNumericArray(extractProperty(structureDetails, possibleFieldMappings.a_maturities, []));
    
    // If we still don't have maturities, create a default one to prevent API errors
    if (a_maturities.length === 0) {
      console.log('No Class A maturities found, creating default value of [90]');
      a_maturities = [90]; // Default 90-day maturity as a fallback
    }
    
    const maxLength = a_maturities.length;
    a_base_rates = ensureNumericArray(extractProperty(structureDetails, possibleFieldMappings.a_base_rates, []), maxLength);
    a_spreads = ensureNumericArray(extractProperty(structureDetails, possibleFieldMappings.a_spreads, []), maxLength);
    a_reinvest_rates = ensureNumericArray(extractProperty(structureDetails, possibleFieldMappings.a_reinvest_rates, []), maxLength);
    a_nominals = ensureNumericArray(extractProperty(structureDetails, possibleFieldMappings.a_nominals, []), maxLength);
  }

  // Extract class B properties
  const b_maturity = ensureNumber(extractProperty(structureDetails, possibleFieldMappings.b_maturity, 180));
  const b_base_rate = ensureNumber(extractProperty(structureDetails, possibleFieldMappings.b_base_rate, 0));
  const b_spread = ensureNumber(extractProperty(structureDetails, possibleFieldMappings.b_spread, 0));
  const b_reinvest_rate = ensureNumber(extractProperty(structureDetails, possibleFieldMappings.b_reinvest_rate, 0));
  const b_nominal = ensureNumber(extractProperty(structureDetails, possibleFieldMappings.b_nominal, 0));
  const ops_expenses = ensureNumber(extractProperty(structureDetails, possibleFieldMappings.ops_expenses, 0));

  // Ensure lengths are consistent
  const maxLength = a_maturities.length;
  
  const result = {
    start_date: formattedDate,
    a_maturities: a_maturities,
    a_base_rates: a_base_rates.length === maxLength ? a_base_rates : Array(maxLength).fill(a_base_rates[0] || 0),
    a_spreads: a_spreads.length === maxLength ? a_spreads : Array(maxLength).fill(a_spreads[0] || 0),
    a_reinvest_rates: a_reinvest_rates.length === maxLength ? a_reinvest_rates : Array(maxLength).fill(a_reinvest_rates[0] || 0),
    a_nominals: a_nominals.length === maxLength ? a_nominals : Array(maxLength).fill(a_nominals[0] || 0),
    b_maturity: b_maturity,
    b_base_rate: b_base_rate,
    b_spread: b_spread,
    b_reinvest_rate: b_reinvest_rate,
    b_nominal: b_nominal,
    ops_expenses: ops_expenses
  };

  // Log the resulting structure
  console.log('Formatted structure for API:', result);
  
  return result;
};

const StressTestingPage = () => {
  const theme = darkTheme;
  const { calculationResults, savedResults } = useData();
  const navigate = useNavigate();
  // Start with NPL tab as default instead of summary
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for stress test parameters with new base scenario values
  const [nplRange, setNplRange] = useState([1.5, 1.5]);
  const [prepaymentRange, setPrepaymentRange] = useState([30, 30]);
  const [reinvestmentRange, setReinvestmentRange] = useState([0, 0]);
  const [defaultReinvestRate, setDefaultReinvestRate] = useState(30);
  const [scenarios, setScenarios] = useState(10);
  const [selectedScenarioType, setSelectedScenarioType] = useState('base');
  
  // State variable for dropdown selection
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [availableStructures, setAvailableStructures] = useState([]);
  
  // State variables for predefined scenario
  const [predefinedScenario, setPredefinedScenario] = useState('base');
  
  // State variable for reinvestment shift toggle
  const [applyReinvestmentShift, setApplyReinvestmentShift] = useState(false);
  
  // State variables for notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  // State for API test results
  const [testResults, setTestResults] = useState({
    classBCouponRate: null,
    scenarioResults: [],
    sensitivityAnalysis: {
      npl: [],
      prepayment: [],
      reinvestment: []
    },
    combinedScenarios: []
  });
  
  // Fetch Available Structures
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
          // Store coupon rate but don't display it in the dropdown
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

  // Run stress test with enhanced error handling and debugging
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
      
      // Log the structure details for debugging
      console.log('Original structure details:', structureDetails);
      
      // Extract parameters for the test with proper number conversion
      const nplRate = Number(nplRange[0]); 
      const prepaymentRate = Number(prepaymentRange[0]);
      const reinvestmentShift = applyReinvestmentShift ? Number(reinvestmentRange[0]) : 0;
      
      // Create request parameters for the API with enhanced formatting
      const formattedStructure = formatStructureForStressTest(structureDetails);
      
      const requestParams = {
        structure: formattedStructure,
        scenario: {
          name: predefinedScenario,
          npl_rate: nplRate,
          prepayment_rate: prepaymentRate,
          reinvestment_shift: reinvestmentShift
        }
      };
      
      // Debug: Log the complete request payload
      console.log('FULL REQUEST PAYLOAD:', JSON.stringify(requestParams, null, 2));
      
      // Call the API
      const response = await runStressTest(requestParams);
      
      console.log('Received stress test response:', response);
      
      // Process API response
      const responseData = {
        classBCouponRate: {
          modeled: response.baseline.class_b_coupon_rate,
          realized: response.stress_test.class_b_coupon_rate,
          difference: response.difference.class_b_coupon_rate,
          status: response.difference.class_b_coupon_rate >= -1 ? 'success' : 
                 response.difference.class_b_coupon_rate >= -5 ? 'warning' : 'error'
        },
        scenarioResults: [
          {
            name: "Base Case",
            npl: 0,
            prepayment: 0,
            reinvestment: 0,
            modeled: response.baseline.class_b_coupon_rate,
            realized: response.baseline.class_b_coupon_rate,
            difference: 0
          },
          {
            name: predefinedScenario.charAt(0).toUpperCase() + predefinedScenario.slice(1),
            npl: nplRate,
            prepayment: prepaymentRate,
            reinvestment: reinvestmentShift,
            modeled: response.baseline.class_b_coupon_rate,
            realized: response.stress_test.class_b_coupon_rate,
            difference: response.difference.class_b_coupon_rate
          }
        ],
        sensitivityAnalysis: {
          npl: [],
          prepayment: [],
          reinvestment: []
        },
        combinedScenarios: []
      };
      
      // Update state with the API results
      setTestResults(responseData);
      setIsLoading(false);
      setTabValue(0); // Switch to NPL tab to show results
      
      // Show success message
      setSnackbarMessage("Stress test completed successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error("Error running stress test:", error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('RESPONSE ERROR DATA:', error.response.data);
        if (error.response.data.detail) {
          console.error('ERROR DETAIL:', error.response.data.detail);
        }
      }
      
      setIsLoading(false);
      
      // Extract the actual error message from the response if available
      let errorMessage = "Error running stress test";
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage += ": " + error.response.data;
        } else if (error.response.data.detail) {
          // Check for specific error patterns
          const detail = error.response.data.detail;
          if (detail.includes("No data found") || detail.includes("upload Excel file")) {
            errorMessage = "You need to upload an Excel file with loan data before running a stress test. Please go to the Structure Analysis page first.";
          } else {
            errorMessage += ": " + detail;
          }
        }
      } else if (error.message) {
        errorMessage += ": " + error.message;
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };
  
  // Format data for the sensitivity charts
  const formatSensitivityData = (dataKey) => {
    if (!testResults?.sensitivityAnalysis?.[dataKey]) {
      return [];
    }
    
    return testResults.sensitivityAnalysis[dataKey].map(item => ({
      value: item.value || 0,
      modeled: item.modeled || 0,
      realized: item.realized || 0,
      difference: (item.realized || 0) - (item.modeled || 0)
    }));
  };
  
  // Format combined scenarios data for scatter plot
  const formatScatterData = () => {
    if (!testResults?.combinedScenarios) {
      return [];
    }
    
    return testResults.combinedScenarios.map(item => ({
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
        
        {/* Structure Dropdown Selection - Removed coupon rate display */}
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
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {structure.type === 'manual' && <TuneIcon sx={{ color: theme.palette.error.main, mr: 1 }} />}
                      {structure.type === 'genetic' && <ScienceIcon sx={{ color: theme.palette.success.main, mr: 1 }} />}
                      {structure.type === 'standard' && <SettingsIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />}
                      <Typography>{structure.name}</Typography>
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
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Type:</Typography>
                  <Typography variant="body1">
                    {getSelectedStructure().type === 'manual' ? 'Manual Calculation' : 
                     getSelectedStructure().type === 'genetic' ? 'Genetic Algorithm' : 
                     'Grid Algorithm'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Structure Name:</Typography>
                  <Typography variant="body1">
                    {getSelectedStructure().name}
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
              
              {/* Predefined Scenario Selection with updated values */}
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
                      setReinvestmentRange([2, 2]);
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
                    variant={predefinedScenario === 'moderate' ? 'contained' : 'outlined'}
                    color="secondary"
                    onClick={() => {
                      setPredefinedScenario('moderate');
                      setNplRange([3, 3]);
                      setPrepaymentRange([15, 15]);
                      setReinvestmentRange([-3, -3]);
                    }}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Moderate
                  </Button>
                  
                  <Button
                    variant={predefinedScenario === 'severe' ? 'contained' : 'outlined'}
                    color="error"
                    onClick={() => {
                      setPredefinedScenario('severe');
                      setNplRange([5, 5]);
                      setPrepaymentRange([10, 10]);
                      setReinvestmentRange([-5, -5]);
                    }}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Severe
                  </Button>
                  
                  <Button
                    variant={predefinedScenario === 'extreme' ? 'contained' : 'outlined'}
                    color="warning"
                    onClick={() => {
                      setPredefinedScenario('extreme');
                      setNplRange([7, 7]);
                      setPrepaymentRange([5, 5]);
                      setReinvestmentRange([-10, -10]);
                    }}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Extreme
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
                    max={15}
                    step={0.5}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 1.5, label: '1.5%' },
                      { value: 5, label: '5%' },
                      { value: 10, label: '10%' },
                      { value: 15, label: '15%' }
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
                      { value: 10, label: '10%' },
                      { value: 20, label: '20%' },
                      { value: 30, label: '30%' },
                      { value: 40, label: '40%' },
                      { value: 50, label: '50%' }
                    ]}
                  />
                </Box>
              </Box>
              
              {/* Reinvestment Rate Shift Toggle */}
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
                    <MenuItem value="optimistic">Optimistic</MenuItem>
                    <MenuItem value="base">Base Case</MenuItem>
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
              
              {/* NPL Sensitivity Tab (now the default tab) */}
              {tabValue === 0 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Class B Coupon Rate vs. NPL Rates
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This analysis shows how Non-Performing Loan (NPL) rates affect the Class B coupon rates. Higher NPL rates typically reduce available cash flow for Class B payments.
                  </Typography>
                  
                  {testResults.sensitivityAnalysis.npl.length > 0 ? (
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
                  ) : (
                    <Box sx={{ p: 8, textAlign: 'center' }}>
                      <Typography variant="subtitle1" color="text.secondary">
                        Run a stress test to see NPL sensitivity analysis
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.4), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Key Insights:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • The modeled and realized rates both decrease as NPL rates increase<br />
                      • The gap between modeled and realized rates widens with higher NPL rates<br />
                      • At NPL rates above 3%, the deviation becomes significant<br />
                      • Base case projections assume a 1.5% NPL rate<br />
                      • NPL rates above 5% represent severe stress scenarios
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Prepayment Impact Tab */}
              {tabValue === 1 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Class B Coupon Rate vs. Prepayment Rates
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This analysis shows how early prepayment rates affect Class B coupon performance. Lower prepayment rates can impact the expected cash flow timing and reduce reinvestment opportunities.
                  </Typography>
                  
                  {testResults.sensitivityAnalysis.prepayment.length > 0 ? (
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
                  ) : (
                    <Box sx={{ p: 8, textAlign: 'center' }}>
                      <Typography variant="subtitle1" color="text.secondary">
                        Run a stress test to see prepayment impact analysis
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.4), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Key Insights:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • Lower prepayment rates lead to lower coupon rates for Class B notes<br />
                      • At prepayment rates below 15%, the deviation between modeled and realized becomes critical<br />
                      • Base case projections assume a 30% prepayment rate<br />
                      • Prepayment rates below 10% represent severe stress scenarios<br />
                      • Higher prepayment rates generally benefit the structure in this model
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Combined Analysis Tab */}
              {tabValue === 2 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Multifactor Analysis of Rate Deviation
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This combined analysis shows how NPL and prepayment rates together affect Class B coupon rate deviation. Bubble size indicates the magnitude of deviation.
                  </Typography>
                  
                  {testResults.combinedScenarios.length > 0 ? (
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
                            domain={[0, 15]}
                            label={{ value: 'NPL Rate (%)', position: 'insideBottomRight', offset: -5, fill: theme.palette.text.secondary }}
                            tick={{ fill: theme.palette.text.secondary }}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="y" 
                            name="Prepayment Rate" 
                            unit="%"
                            domain={[0, 40]}
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
                  ) : (
                    <Box sx={{ p: 8, textAlign: 'center' }}>
                      <Typography variant="subtitle1" color="text.secondary">
                        Run a stress test to see multifactor analysis
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.4), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Risk Heatmap Interpretation
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Larger bubbles indicate greater deviation between modeled and realized coupon rates<br />
                      • The lower right quadrant (high NPL, low prepayment) represents the most severe stress conditions<br />
                      • Scenarios with high NPL rates (&gt;5%) and low prepayment rates (&lt;10%) tend to result in the largest deviations<br />
                      • Base case parameters (1.5% NPL, 30% prepayment) show moderate but acceptable deviation<br />
                      • Optimistic scenarios (1% NPL, 20% prepayment) with positive reinvestment shifts show minimal impact
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
        
        {/* Snackbar for Notifications */}
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