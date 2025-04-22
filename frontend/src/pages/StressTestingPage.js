import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Slider, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  alpha,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Tab,
  Tabs,
  LinearProgress
} from '@mui/material';

import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import PieChartIcon from '@mui/icons-material/PieChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material';
import { runEnhancedStressTest, formatStructureForStressTest } from '../services/apiService';

// Recharts components
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ScatterChart, 
  Scatter, ZAxis, ReferenceLine, PieChart, Pie, Cell
} from 'recharts';

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  const theme = useTheme();
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 2, boxShadow: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          {label}
        </Typography>
        
        {payload.map((entry, index) => (
          <Box key={`tooltip-item-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', my: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              {entry.name}:
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ color: entry.color }}>
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

// Main StressTestingPage component
const StressTestingPage = () => {
  const theme = useTheme();
  const { 
    savedResults, 
    stressScenarios,
    setStressScenarios,
    stressTestResults,
    setStressTestResults,
    saveStressTestResult,
    createStressTestRequest
  } = useData();
  const navigate = useNavigate();
  
  // State variables
  const [isLoading, setIsLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // Scenario parameters
  const [nplRate, setNplRate] = useState(1.5);
  const [prepaymentRate, setPrepaymentRate] = useState(30);
  const [reinvestmentShift, setReinvestmentShift] = useState(0);
  const [recoveryRate, setRecoveryRate] = useState(0.5);
  const [recoveryLag, setRecoveryLag] = useState(90);
  const [delinquencyRate, setDelinquencyRate] = useState(null);
  
  // Scenario type
  const [scenarioType, setScenarioType] = useState('base');
  
  // Structure selection
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [availableStructures, setAvailableStructures] = useState([]);
  
  // Notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  // Results display
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState({
    classBRate: {
      original: null,
      stressed: null,
      difference: null
    },
    cashFlowMetrics: {
      reductionPct: null,
      nplImpact: null,
      prepaymentTotal: null,
      reinvestmentTotal: null
    },
    modeledCashflows: []
  });
  
  // Get available structures on component mount
  useEffect(() => {
    if (savedResults && savedResults.length > 0) {
      const structures = savedResults.map(result => ({
        id: result.id,
        name: result.savedName || `${result.methodType || 'Default'} Structure`,
        type: result.methodType || 'default',
        classBCouponRate: result.class_b_coupon_rate || result.stressed_class_b_rate || 0,
        originalData: result // Store the entire result for later use
      }));
      
      setAvailableStructures(structures);
      
      if (structures.length > 0 && !selectedStructureId) {
        setSelectedStructureId(structures[0].id);
      }
    }
  }, [savedResults, selectedStructureId]);
  
  // Check if we have stored stress test results
  useEffect(() => {
    if (stressTestResults && 
        stressTestResults.structureId === selectedStructureId && 
        stressTestResults.scenarioType === scenarioType) {
      setTestResults(stressTestResults);
      setShowResults(true);
    }
  }, [stressTestResults, selectedStructureId, scenarioType]);
  
  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Structure selection handler
  const handleStructureChange = (event) => {
    setSelectedStructureId(event.target.value);
  };
  
  // Get the selected structure
  const getSelectedStructure = () => {
    return availableStructures.find(structure => structure.id === selectedStructureId) || null;
  };
  
  // Scenario selection handler
  const handleScenarioChange = (type) => {
    setScenarioType(type);
    
    // Update parameters based on scenario type
    if (stressScenarios && stressScenarios[type]) {
      const scenario = stressScenarios[type];
      setNplRate(scenario.npl_rate);
      setPrepaymentRate(scenario.prepayment_rate);
      setReinvestmentShift(scenario.reinvestment_shift);
    } else {
      // Default values if scenario not found
      switch (type) {
        case 'base':
          setNplRate(1.5);
          setPrepaymentRate(30);
          setReinvestmentShift(0);
          break;
        case 'moderate':
          setNplRate(3);
          setPrepaymentRate(15);
          setReinvestmentShift(-3);
          break;
        case 'severe':
          setNplRate(5);
          setPrepaymentRate(10);
          setReinvestmentShift(-5);
          break;
        default:
          // Keep current values for custom scenario
          break;
      }
    }
  };
  
  // Navigate back to calculation
  const handleNavigateToCalculation = () => {
    navigate('/calculation');
  };
  
  // Run stress test
  const handleRunStressTest = async () => {
    const selectedStructure = getSelectedStructure();
    
    if (!selectedStructure) {
      setSnackbarMessage("Please select a structure to test");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    
    setIsLoading(true);
    setShowResults(false);
    
    try {
      // Get structure details from savedResults
      const structureDetails = savedResults.find(r => r.id === selectedStructureId);
      
      if (!structureDetails) {
        throw new Error("Structure details not found");
      }
      
      // Get original Class B rate and calculate original coupon payment
      const originalClassBRate = structureDetails.class_b_coupon_rate || structureDetails.stressed_class_b_rate || 36.72;
      const classBPrincipal = structureDetails.class_b_nominal || 200000000; // Class B principal
      const originalClassBCouponPayment = (originalClassBRate / 100) * classBPrincipal; // Calculate original coupon payment
      const originalTotalCashflow = structureDetails.total_cashflow || 1942409829; // Original total cash flow in TL
      
      // Manually formatted structure with original values preserved
      const manuallyFormattedStructure = {
        start_date: structureDetails.start_date || "2025-02-12",
        a_maturities: [],
        a_base_rates: [],
        a_spreads: [],
        a_reinvest_rates: [],
        a_nominals: [],
        b_maturity: 300,
        b_base_rate: 0,
        b_spread: 0,
        b_reinvest_rate: 25.5, // Original value preserved
        b_nominal: classBPrincipal,
        ops_expenses: structureDetails.general_settings?.operational_expenses || 0,
        original_class_b_rate: originalClassBRate,
        original_total_cashflow: originalTotalCashflow
      };
      
      // Collect Class A tranche details
      if (structureDetails.tranche_results && Array.isArray(structureDetails.tranche_results)) {
        for (const tranche of structureDetails.tranche_results) {
          if (tranche["Is Class A"]) {
            manuallyFormattedStructure.a_maturities.push(tranche["Maturity Days"]);
            manuallyFormattedStructure.a_base_rates.push(parseFloat(tranche["Base Rate (%)"] || 0));
            manuallyFormattedStructure.a_spreads.push(parseFloat(tranche["Spread (bps)"] || 0));
            manuallyFormattedStructure.a_reinvest_rates.push(40); // Original value preserved
            manuallyFormattedStructure.a_nominals.push(tranche["Principal"] || 0);
          } else {
            manuallyFormattedStructure.b_maturity = tranche["Maturity Days"];
            manuallyFormattedStructure.b_base_rate = parseFloat(tranche["Base Rate (%)"] || 0);
            manuallyFormattedStructure.b_spread = parseFloat(tranche["Spread (bps)"] || 0);
            manuallyFormattedStructure.b_reinvest_rate = 25.5; // Original value preserved
            manuallyFormattedStructure.b_nominal = tranche["Principal"] || 0;
          }
        }
      }
      
      // If Class A not found, use default values - preserving original high rates
      if (manuallyFormattedStructure.a_maturities.length === 0) {
        manuallyFormattedStructure.a_maturities = [61, 120, 182, 274];
        manuallyFormattedStructure.a_base_rates = [45.6, 44.5, 43.3, 42.5];
        manuallyFormattedStructure.a_spreads = [0, 0, 0, 0];
        manuallyFormattedStructure.a_reinvest_rates = [40, 37.25, 32.5, 30]; // Original values preserved
        manuallyFormattedStructure.a_nominals = [480000000, 460000000, 425000000, 400000000];
      }
      
      // Scenario parameters - user-defined values preserved
      const scenarioParams = {
        name: scenarioType,
        npl_rate: nplRate,
        prepayment_rate: prepaymentRate,
        reinvestment_shift: reinvestmentShift,
        recovery_rate: recoveryRate,
        recovery_lag: recoveryLag,
        delinquency_rate: delinquencyRate
      };
      
      // Update scenarios
      const updatedScenarios = {
        ...stressScenarios,
        [scenarioType]: {
          ...scenarioParams
        }
      };
      setStressScenarios(updatedScenarios);
      
      // Create request parameters
      const requestParams = {
        structure: manuallyFormattedStructure,
        scenario: scenarioParams
      };
      
      // API call
      const response = await runEnhancedStressTest(requestParams);
      
      // Process results - calculate net loss and stressed coupon correctly
      // 1. Get total impact from stress scenario
      const nplImpact = response.stress_test?.total_npl_impact || 0;
      const prepaymentImpact = response.stress_test?.prepayment_impact || 0;
      const reinvestmentImpact = response.stress_test?.reinvestment_impact || 0;
      const totalStressImpact = nplImpact + prepaymentImpact - reinvestmentImpact;
      
      // 2. Calculate stressed Class B coupon payment
      const stressedClassBCouponPayment = originalClassBCouponPayment - totalStressImpact;
      
      // 3. Calculate stressed Class B coupon rate
      const stressedClassBCouponRate = (stressedClassBCouponPayment / classBPrincipal) * 100;
      
      // 4. Calculate net loss percentage based on original total cash flow
      const netLossPercentage = (totalStressImpact / originalTotalCashflow) * 100;
      
      // Calculate difference
      const difference = stressedClassBCouponRate - originalClassBRate;
      
      const resultsData = {
        structureId: selectedStructureId,
        scenarioType: scenarioType,
        classBRate: {
          original: originalClassBRate,
          stressed: stressedClassBCouponRate,
          difference: difference
        },
        cashFlowMetrics: {
          reductionPct: netLossPercentage,  // Net loss as percentage of original total cash flow
          nplImpact: nplImpact,
          prepaymentTotal: response.stress_test?.total_prepayment || 0,
          reinvestmentTotal: response.stress_test?.total_reinvestment || 0,
          netLoss: totalStressImpact,
          originalClassBCouponPayment: originalClassBCouponPayment,
          stressedClassBCouponPayment: stressedClassBCouponPayment,
          originalTotalCashflow: originalTotalCashflow
        },
        modeledCashflows: response.cashflows?.stress || []
      };
      
      // Validate results to ensure they're reasonable
      if (resultsData.classBRate.stressed < 0 || resultsData.classBRate.stressed > 100) {
        console.error("Unreasonable stress test results detected:", resultsData);
        throw new Error("Stress test returned unrealistic values. Please check the calculation logic.");
      }
      
      // Update state
      setTestResults(resultsData);
      setStressTestResults(resultsData);
      
      // Save results
      saveStressTestResult(
        resultsData, 
        `${scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)} Scenario`, 
        selectedStructureId
      );
      
      setIsLoading(false);
      setShowResults(true);
      
      // Success message
      setSnackbarMessage("Stress test completed successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error("Error running stress test:", error);
      setIsLoading(false);
      
      let errorMessage = "Error running stress test";
      if (error.response && error.response.data) {
        errorMessage += ": " + (error.response.data.detail || error.response.data);
      } else if (error.message) {
        errorMessage += ": " + error.message;
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  // Export results
  const handleExportResults = () => {
    if (!showResults) return;
    
    try {
      const selectedStructure = getSelectedStructure();
      const scenarioName = scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1);
      
      // Create export data
      const exportData = {
        testDate: new Date().toISOString(),
        structure: {
          id: selectedStructureId,
          name: selectedStructure?.name || 'Unknown Structure'
        },
        scenario: {
          name: scenarioName,
          npl_rate: nplRate,
          prepayment_rate: prepaymentRate,
          reinvestment_shift: reinvestmentShift,
          recovery_rate: recoveryRate
        },
        results: testResults
      };
      
      // Convert to JSON
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stress-test-${selectedStructureId}-${scenarioType}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSnackbarMessage("Results exported successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error("Export error:", error);
      setSnackbarMessage("Error exporting results");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };
  
  // Get color based on difference value
  const getDifferenceColor = (diff) => {
    if (diff >= 0) return theme.palette.success.main;
    if (diff >= -3) return theme.palette.warning.main;
    return theme.palette.error.main;
  };
  
  // Format pie chart data
  const formatPieData = () => {
    const { classBRate } = testResults;
    
    if (!classBRate.original) {
      return [];
    }
    
    // For pie chart, we want to show the proportion of original rate that remains
    const stressedRate = Math.max(0, classBRate.stressed);
    const loss = Math.max(0, classBRate.original - classBRate.stressed);
    
    // If the stressed rate is higher than original, show gain instead of loss
    if (stressedRate > classBRate.original) {
      return [
        { 
          name: "Original Rate", 
          value: classBRate.original, 
          color: theme.palette.primary.main 
        },
        { 
          name: "Stress Gain", 
          value: stressedRate - classBRate.original, 
          color: theme.palette.success.main 
        }
      ];
    }
    
    return [
      { 
        name: "Stressed Rate", 
        value: stressedRate, 
        color: theme.palette.primary.main 
      },
      { 
        name: "Stress Loss", 
        value: loss, 
        color: theme.palette.error.main 
      }
    ];
  };
  
  // Format cashflow comparison data
  const formatCashflowComparisonData = () => {
    if (!testResults.modeledCashflows || testResults.modeledCashflows.length === 0) {
      return [];
    }
    
    // Use first 10 cashflows for comparison
    return testResults.modeledCashflows.slice(0, 10).map(cf => ({
      date: new Date(cf.installment_date).toLocaleDateString(),
      original: cf.original_cashflow,
      actual: cf.total_actual_cashflow,
      difference: cf.total_actual_cashflow - cf.original_cashflow,
      percentDiff: ((cf.total_actual_cashflow / cf.original_cashflow) - 1) * 100
    }));
  };
  
  // Scenario comparison data
  const scenarioComparisonData = [
    {
      name: "Base Case",
      npl: 0,
      prepayment: 30,
      reinvestment: 0,
      rate: testResults.classBRate.original || 0
    },
    {
      name: scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1),
      npl: nplRate,
      prepayment: prepaymentRate,
      reinvestment: reinvestmentShift,
      rate: testResults.classBRate.stressed || 0
    }
  ];
  
  return (
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
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={handleNavigateToCalculation}
          >
            Back to Structure Analysis
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveAltIcon />}
            disabled={!showResults}
            onClick={handleExportResults}
          >
            Export Results
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={4}>
        {/* Left Panel: Structure Selection and Parameters */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Structure Selection */}
            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
              }}
            >
              <Typography variant="h6" gutterBottom>
                Stress Test Structure
              </Typography>
              
              {availableStructures.length > 0 ? (
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="structure-select-label">Select Structure</InputLabel>
                  <Select
                    labelId="structure-select-label"
                    value={selectedStructureId}
                    onChange={handleStructureChange}
                    label="Select Structure"
                  >
                    {availableStructures.map((structure) => (
                      <MenuItem key={structure.id} value={structure.id}>
                        {structure.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Alert 
                  severity="info"
                  action={
                    <Button color="inherit" size="small" onClick={handleNavigateToCalculation}>
                      Go to Analysis
                    </Button>
                  }
                >
                  No saved structures found. Please calculate and save at least one structure before running stress tests.
                </Alert>
              )}
              
              {getSelectedStructure() && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                  <Typography variant="subtitle2" gutterBottom>Selected Structure Details:</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Type:</Typography>
                      <Typography variant="body1">
                        {getSelectedStructure().type === 'manual' ? 'Manual Calculation' : 
                         getSelectedStructure().type === 'genetic' ? 'Genetic Algorithm' : 
                         'Standard Algorithm'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Class B Coupon Rate:</Typography>
                      <Typography variant="body1" fontWeight="medium" color="primary">
                        {getSelectedStructure().classBCouponRate.toFixed(2)}%
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Paper>
            
            {/* Scenario Selection */}
            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
              }}
            >
              <Typography variant="h6" gutterBottom>
                Stress Scenario
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, mb: 3 }}>
                <Button
                  variant={scenarioType === 'base' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => handleScenarioChange('base')}
                  size="medium"
                >
                  Base
                </Button>
                
                <Button
                  variant={scenarioType === 'moderate' ? 'contained' : 'outlined'}
                  color="secondary"
                  onClick={() => handleScenarioChange('moderate')}
                  size="medium"
                >
                  Moderate
                </Button>
                
                <Button
                  variant={scenarioType === 'severe' ? 'contained' : 'outlined'}
                  color="error"
                  onClick={() => handleScenarioChange('severe')}
                  size="medium"
                >
                  Severe
                </Button>
                
                <Button
                  variant={scenarioType === 'custom' ? 'contained' : 'outlined'}
                  onClick={() => handleScenarioChange('custom')}
                  size="medium"
                >
                  Custom
                </Button>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Parameter Settings */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" display="flex" alignItems="center">
                  <WarningAmberIcon sx={{ fontSize: 20, mr: 1, color: theme.palette.warning.main }} />
                  NPL Rate (%)
                  <Tooltip title="Non-Performing Loan rate affects the cash flow available for Class B payment" sx={{ ml: 1 }}>
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Slider
                  value={nplRate}
                  onChange={(e, value) => setNplRate(value)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={15}
                  step={0.5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 5, label: '5%' },
                    { value: 15, label: '15%' }
                  ]}
                  sx={{ mt: 2, mb: 4 }}
                />
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" display="flex" alignItems="center">
                  <TrendingDownIcon sx={{ fontSize: 20, mr: 1, color: theme.palette.primary.light }} />
                  Prepayment Rate (%)
                  <Tooltip title="Early prepayment rates affect the expected cash flow timing" sx={{ ml: 1 }}>
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Slider
                  value={prepaymentRate}
                  onChange={(e, value) => setPrepaymentRate(value)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={50}
                  step={1}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 30, label: '30%' },
                    { value: 50, label: '50%' }
                  ]}
                  sx={{ mt: 2, mb: 4 }}
                />
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" display="flex" alignItems="center">
                  <AttachMoneyIcon sx={{ fontSize: 20, mr: 1, color: theme.palette.secondary.light }} />
                  Reinvestment Rate Shift (±%)
                  <Tooltip title="All reinvestment rates will shift by this amount" sx={{ ml: 1 }}>
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Slider
                  value={reinvestmentShift}
                  onChange={(e, value) => setReinvestmentShift(value)}
                  valueLabelDisplay="auto"
                  min={-10}
                  max={10}
                  step={1}
                  marks={[
                    { value: -10, label: '-10%' },
                    { value: 0, label: '0%' },
                    { value: 10, label: '+10%' }
                  ]}
                  sx={{ mt: 2, mb: 3 }}
                />
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Advanced Parameters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Recovery Rate (0-1)"
                      value={recoveryRate}
                      onChange={(e) => setRecoveryRate(Number(e.target.value))}
                      type="number"
                      inputProps={{ min: 0, max: 1, step: 0.05 }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Delinquency Rate (%)"
                      value={delinquencyRate === null ? '' : delinquencyRate}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : Number(e.target.value);
                        setDelinquencyRate(value);
                      }}
                      type="number"
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      size="small"
                      helperText="Leave blank to use half of NPL rate"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Recovery Lag (days)"
                      value={recoveryLag}
                      onChange={(e) => setRecoveryLag(Number(e.target.value))}
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>
            </Paper>
            
            {/* Run Button */}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <AssessmentIcon />}
              onClick={handleRunStressTest}
              disabled={isLoading || !selectedStructureId}
              sx={{ py: 1.5, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
            >
              {isLoading ? 'Running Tests...' : 'Run Stress Test'}
            </Button>
          </Box>
        </Grid>
        
        {/* Right Panel: Results */}
        <Grid item xs={12} md={8}>
          {isLoading && (
            <Box sx={{ mt: 2, mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Running stress test...
              </Typography>
              <LinearProgress />
            </Box>
          )}
          
          {!showResults && !isLoading && (
            <Paper
              elevation={3}
              sx={{
                p: 4,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
                textAlign: 'center',
                height: '300px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <AssessmentIcon sx={{ fontSize: 60, color: alpha(theme.palette.primary.main, 0.3), mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Stress Test Results Will Appear Here
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Select a structure and run the stress test
              </Typography>
            </Paper>
          )}
          
          {showResults && testResults.classBRate.original !== null && (
            <>
              {/* Tab Navigation */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab icon={<ShowChartIcon />} label="Summary" iconPosition="start" />
                  <Tab icon={<PieChartIcon />} label="Coupon Analysis" iconPosition="start" />
                  <Tab icon={<TableChartIcon />} label="Cash Flow" iconPosition="start" />
                </Tabs>
              </Box>
              
              {/* Tab Content */}
              {tabValue === 0 && (
                <>
                  {/* Summary Results */}
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    }}
                  >
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <ShowChartIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                      Class B Coupon Rate Results
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Original Coupon Rate
                          </Typography>
                          <Typography variant="h4" color="primary" fontWeight="bold">
                            {testResults.classBRate.original.toFixed(2)}%
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Stressed Coupon Rate
                          </Typography>
                          <Typography variant="h4" color="secondary" fontWeight="bold">
                            {testResults.classBRate.stressed.toFixed(2)}%
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <Paper sx={{ 
                          p: 2, 
                          textAlign: 'center', 
                          bgcolor: alpha(getDifferenceColor(testResults.classBRate.difference), 0.1)
                        }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Impact
                          </Typography>
                          <Typography 
                            variant="h4" 
                            fontWeight="bold"
                            color={getDifferenceColor(testResults.classBRate.difference)}
                          >
                            {testResults.classBRate.difference > 0 ? '+' : ''}
                            {testResults.classBRate.difference.toFixed(2)}%
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" color="text.secondary">Cash Flow Reduction:</Typography>
                          <Typography variant="h6" fontWeight="medium" color="error">
                            {testResults.cashFlowMetrics.reductionPct.toFixed(2)}%
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" color="text.secondary">Net Loss:</Typography>
                          <Typography variant="h6" fontWeight="medium">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(testResults.cashFlowMetrics.netLoss)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" color="text.secondary">NPL Impact:</Typography>
                          <Typography variant="h6" fontWeight="medium">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(testResults.cashFlowMetrics.nplImpact)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                  
                  {/* Comparison Chart */}
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Scenario Comparison
                    </Typography>
                    
                    <Box sx={{ height: 350, mt: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={scenarioComparisonData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis 
                            tickFormatter={(value) => `${value}%`}
                            domain={[0, 'dataMax + 5']}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar 
                            dataKey="rate" 
                            name="Class B Coupon Rate" 
                            fill={theme.palette.primary.main}
                            maxBarSize={80}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Scenario Parameters
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={4}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">NPL Rate</Typography>
                          <Typography variant="h6" fontWeight="medium">
                            {nplRate}%
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Prepayment</Typography>
                          <Typography variant="h6" fontWeight="medium">
                            {prepaymentRate}%
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Reinvestment Shift</Typography>
                          <Typography variant="h6" fontWeight="medium">
                            {reinvestmentShift > 0 ? '+' : ''}{reinvestmentShift}%
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Paper>
                </>
              )}
              
              {/* Coupon Analysis Tab */}
              {tabValue === 1 && (
                <>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Class B Coupon Analysis
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ height: 350 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={formatPieData()}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                innerRadius={60}
                                labelLine={false}
                                label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                              >
                                {formatPieData().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip content={<CustomTooltip />} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                            Coupon Rate Details
                          </Typography>
                          
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary">Original Coupon Rate:</Typography>
                            <Typography variant="h5" color="primary" fontWeight="medium">
                              {testResults.classBRate.original.toFixed(2)}%
                            </Typography>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Typography variant="body2" color="text.secondary">Stressed Coupon Rate:</Typography>
                            <Typography variant="h5" color="secondary" fontWeight="medium">
                              {testResults.classBRate.stressed.toFixed(2)}%
                            </Typography>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Typography variant="body2" color="text.secondary">Coupon Rate Difference:</Typography>
                            <Typography 
                              variant="h5" 
                              fontWeight="medium"
                              color={getDifferenceColor(testResults.classBRate.difference)}
                            >
                              {testResults.classBRate.difference > 0 ? '+' : ''}
                              {testResults.classBRate.difference.toFixed(2)}%
                            </Typography>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Typography variant="body2" color="text.secondary">Percentage Change:</Typography>
                            <Typography 
                              variant="h5" 
                              fontWeight="medium"
                              color={getDifferenceColor(testResults.classBRate.difference)}
                            >
                              {((testResults.classBRate.stressed - testResults.classBRate.original) / testResults.classBRate.original * 100).toFixed(2)}%
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </>
              )}
              
              {/* Cash Flow Tab */}
              {tabValue === 2 && (
                <>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Cash Flow Comparison
                    </Typography>
                    
                    <Box sx={{ height: 350, mt: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={formatCashflowComparisonData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            label={{ value: 'Payment Date', position: 'insideBottom', offset: -15 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis 
                            tickFormatter={(value) => `₺${(value/1000).toFixed(0)}k`}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar 
                            dataKey="original" 
                            name="Original Cash Flow" 
                            fill={theme.palette.primary.main}
                            maxBarSize={20}
                          />
                          <Bar 
                            dataKey="actual" 
                            name="Stressed Cash Flow" 
                            fill={theme.palette.secondary.main}
                            maxBarSize={20}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                  
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Cash Flow Impact Analysis
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.error.main, 0.1) }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            NPL Impact
                          </Typography>
                          <Typography variant="h6" color="error" fontWeight="medium">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(testResults.cashFlowMetrics.nplImpact)}
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Cash Flow Loss
                          </Typography>
                          <Typography variant="h6" color="warning.dark" fontWeight="medium">
                            {testResults.cashFlowMetrics.reductionPct.toFixed(2)}%
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Prepayment
                          </Typography>
                          <Typography variant="h6" color="info.dark" fontWeight="medium">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(testResults.cashFlowMetrics.prepaymentTotal)}
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Reinvestment
                          </Typography>
                          <Typography variant="h6" color="success.dark" fontWeight="medium">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(testResults.cashFlowMetrics.reinvestmentTotal)}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                        Stress Scenario Summary
                      </Typography>
                      
                      <Typography variant="body1" paragraph>
                        This stress test modeled cash flows under a {scenarioType === 'base' ? 'base' : scenarioType === 'moderate' ? 'moderate' : scenarioType === 'severe' ? 'severe' : 'custom'} scenario with {nplRate}% NPL rate and {prepaymentRate}% prepayment rate assumptions.
                      </Typography>
                      
                      <Typography variant="body1" paragraph>
                        Original Class B coupon payment: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(testResults.cashFlowMetrics.originalClassBCouponPayment || 0)}<br/>
                        Total stress impact (net loss): {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(testResults.cashFlowMetrics.netLoss || 0)}<br/>
                        Stressed Class B coupon payment: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(testResults.cashFlowMetrics.stressedClassBCouponPayment || 0)}
                      </Typography>
                      
                      <Typography variant="body1" paragraph>
                        The stressed Class B coupon rate is calculated as:<br/>
                        (Stressed Coupon Payment / Class B Principal) × 100 = {testResults.classBRate.stressed.toFixed(2)}%
                      </Typography>
                      
                      <Typography variant="body1">
                        Net loss as percentage of original total cash flow: {testResults.cashFlowMetrics.reductionPct.toFixed(2)}%
                      </Typography>
                    </Box>
                  </Paper>
                </>
              )}
            </>
          )}
        </Grid>
      </Grid>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StressTestingPage;