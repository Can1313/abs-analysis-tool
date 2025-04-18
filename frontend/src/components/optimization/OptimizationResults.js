// src/components/optimization/OptimizationResults.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  useTheme,
  Snackbar,
  Alert,
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle, 
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { 
  BarChart, Bar, 
  PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Scatter, ScatterChart, ZAxis
} from 'recharts';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import SaveIcon from '@mui/icons-material/Save';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { calculateResults } from '../../services/apiService';

// Convert numbers to Roman numerals
const toRoman = (num) => {
  if (isNaN(num) || num < 1 || num > 3999) {
    return num.toString(); // Return the number as string if not a valid input
  }
  
  const romanNumerals = {
    M: 1000, CM: 900, D: 500, CD: 400,
    C: 100, XC: 90, L: 50, XL: 40,
    X: 10, IX: 9, V: 5, IV: 4, I: 1
  };
  
  let result = '';
  
  for (let key in romanNumerals) {
    while (num >= romanNumerals[key]) {
      result += key;
      num -= romanNumerals[key];
    }
  }
  
  return result;
};

// Strategy name mapping
const strategyNames = {
  equal: "Equal Distribution",
  increasing: "Increasing by Maturity",
  decreasing: "Decreasing by Maturity",
  middle_weighted: "Middle-Weighted",
  classic: "Standard Optimization",
  genetic: "Evolutionary Algorithm"
};

const OptimizationResults = ({ results }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { 
    setTranchesA, 
    setTrancheB, 
    calculationResults, 
    setPreviousCalculationResults, 
    originalTranchesA, 
    originalTrancheB,
    setIsLoading,
    setError,
    createCalculationRequest,
    setCalculationResults,
    saveResult,
    setMultipleComparisonResults,
    setShouldAutoCalculate
  } = useData();
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  // Add these new states for save functionality
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [resultName, setResultName] = useState('');
  const [selectedMethodType, setSelectedMethodType] = useState('');
  
  // Update useEffect to set initial method type based on results
  useEffect(() => {
    if (results && results.best_strategy) {
      setSelectedMethodType(results.best_strategy === 'genetic' ? 'genetic' : 'standard');
    }
  }, [results]);
  
  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TRY' }).format(value);
  };
  
  // Format percentage values
  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };
  
  // Helper function to get strategy display name
  const getStrategyDisplayName = (strategy) => {
    return strategyNames[strategy] || strategy.charAt(0).toUpperCase() + strategy.slice(1);
  };
  
  // Add these new functions for save functionality
  const handleSaveClick = () => {
    setSaveDialogOpen(true);
    // Default name based on the optimization method
    const defaultName = `${getStrategyDisplayName(results.best_strategy)} Optimization`;
    setResultName(defaultName);
    
    // Set default method type based on results
    setSelectedMethodType(results.best_strategy === 'genetic' ? 'genetic' : 'standard');
  };
  
  const handleSaveDialogClose = () => {
    setSaveDialogOpen(false);
  };
  
  const handleSaveConfirm = () => {
    // Create a result object with necessary properties
    const resultToSave = {
      ...results,
      is_optimized: true,
      optimization_method: selectedMethodType,
      // Add a label so we can identify this in the comparison
      label: resultName,
      method_type: selectedMethodType
    };
    
    const saved = saveResult(resultToSave, resultName, selectedMethodType);
    
    if (saved) {
      setSnackbarMessage(`Result saved as "${resultName}" (${selectedMethodType})`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setSaveDialogOpen(false);
    } else {
      setSnackbarMessage('Failed to save result');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // Prepare data for pie chart
  const pieData = [
    ...results.class_a_nominals.map((nominal, index) => ({
      name: `Class A${toRoman(index + 1)}`,
      value: nominal,
      color: theme.palette.primary.main
    })),
    { 
      name: `Class B${toRoman(1)}`, 
      value: results.class_b_nominal,
      color: theme.palette.secondary.main
    }
  ];
  
  // Prepare data for maturity distribution chart
  const maturityData = [
    ...results.class_a_maturities.map((maturity, index) => ({
      name: `Class A${toRoman(index + 1)}`,
      maturity,
      nominal: results.class_a_nominals[index],
      type: 'Class A'
    })),
    {
      name: `Class B${toRoman(1)}`,
      maturity: results.class_b_maturity,
      nominal: results.class_b_nominal,
      type: 'Class B'
    },
    {
      name: 'Last Cash Flow',
      maturity: results.last_cash_flow_day,
      nominal: Math.max(...results.class_a_nominals, results.class_b_nominal) / 20,
      type: 'Marker'
    }
  ];
  
  // Strategy comparison data
  const strategyResultsData = Object.entries(results.results_by_strategy).map(([strategy, data]) => ({
    name: getStrategyDisplayName(strategy),
    totalPrincipal: data.total_principal,
    directClassBCouponRate: data.direct_coupon_rate || 0,
    classBCouponRate: data.class_b_coupon_rate,
    minBufferActual: data.min_buffer_actual,
    isBest: strategy === results.best_strategy
  }));
  
  // Apply the best strategy configuration to the forms and automatically calculate
  const applyConfiguration = async () => {
    try {
      // Store the current calculation results for comparison before we change the configuration
      if (calculationResults) {
        setPreviousCalculationResults(calculationResults);
      }
      
      // Log all values for debugging
      console.log("Optimization results:", results);
      
      const a_tranches = results.class_a_maturities.map((maturity, index) => ({
        maturity_days: maturity,
        base_rate: results.class_a_rates[index],
        spread: 0.0, // Default value
        reinvest_rate: results.class_a_reinvest[index],
        nominal: results.class_a_nominals[index]
      }));
      
      const b_tranche = {
        maturity_days: results.class_b_maturity,
        base_rate: results.class_b_rate,
        spread: 0.0, // Default value
        reinvest_rate: results.class_b_reinvest,
        nominal: results.class_b_nominal  // Ensure Class B nominal value is transferred
      };
      
      // Enhanced logging with coupon rates and more debugging details
      console.log("Applying configuration with parameters:", {
        tranchesA: a_tranches,
        trancheB: b_tranche,
        class_b_nominal: results.class_b_nominal,
        class_b_coupon_rate: results.class_b_coupon_rate,
        direct_class_b_coupon_rate: results.direct_class_b_coupon_rate || 0,
        class_b_maturity: results.class_b_maturity
      });
      
      // Verify that the nominal values match the expected totals
      const totalClassANominal = a_tranches.reduce((sum, tranche) => sum + tranche.nominal, 0);
      const totalNominal = totalClassANominal + b_tranche.nominal;
      
      console.log("Nominal value verification:", {
        totalClassANominal,
        classBNominal: b_tranche.nominal,
        totalNominal,
        expectedTotal: results.total_principal
      });
      
      // Update form state
      setTranchesA(a_tranches);
      setTrancheB(b_tranche);
      
      // Show processing message
      setSnackbarMessage('Applying configuration and calculating results...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      
      // Create the calculation request directly
      const request = createCalculationRequest();
      
      // Add optimization metadata
      request.is_optimized = true;
      request.optimization_method = results.best_strategy;
      
      // Perform calculation directly instead of navigating
      setIsLoading(true);
      try {
        const calculationResult = await calculateResults(request);
        
        // Add metadata for tracking and display
        calculationResult.label = `${getStrategyDisplayName(results.best_strategy)} Optimization`;
        calculationResult.method_type = results.best_strategy === 'genetic' ? 'genetic' : 'standard';
        calculationResult.timestamp = new Date().toISOString();
        
        // Update results state
        setCalculationResults(calculationResult);
        
        // Show success message
        setSnackbarMessage('Configuration applied and results calculated successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Add to comparison history
        setMultipleComparisonResults(prev => {
          const updatedResults = prev ? [...prev] : [];
          
          // Check if we already have a result of the same type
          const existingIndex = updatedResults.findIndex(r => 
            r.method_type === calculationResult.method_type
          );
          
          // If we have a result of this type, replace it
          if (existingIndex >= 0) {
            updatedResults[existingIndex] = { ...calculationResult };
          } else {
            // Otherwise add it to the array
            if (updatedResults.length >= 5) {
              updatedResults.shift(); // Remove the oldest result
            }
            updatedResults.push({ ...calculationResult });
          }
          
          return updatedResults;
        });
        
        // Navigate to results page to show the new calculation
        navigate('/calculation');
        
      } catch (err) {
        console.error('Error calculating results:', err);
        setSnackbarMessage('Error calculating results. Please try again.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setIsLoading(false);
      }
      
    } catch (error) {
      console.error('Error applying configuration:', error);
      
      // Show error message
      setSnackbarMessage('Error applying configuration. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // Reset to original values
  const resetToOriginal = () => {
    try {
      if (originalTranchesA && originalTrancheB) {
        setTranchesA(JSON.parse(JSON.stringify(originalTranchesA)));
        setTrancheB(JSON.parse(JSON.stringify(originalTrancheB)));
        
        // Show success message
        setSnackbarMessage('Reset to original values successfully.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Navigate to calculation page
        navigate('/calculation');
      } else {
        // Show error message
        setSnackbarMessage('Original configuration not available.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error resetting to original:', error);
      
      // Show error message
      setSnackbarMessage('Error resetting to original values.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Box>
      {/* Add Save Button to the top of the optimization results */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          onClick={handleSaveClick}
          sx={{ ml: 2 }}
        >
          Save Optimization
        </Button>
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* Summary Banner */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderLeft: `4px solid ${theme.palette.secondary.main}`,
          backgroundColor: 'rgba(46, 204, 113, 0.1)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h5" color="secondary">
            Optimal Structure Found
          </Typography>
          <Chip 
            icon={<CheckCircleIcon />} 
            label={getStrategyDisplayName(results.best_strategy)} 
            color="secondary" 
          />
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Class A Tranches
            </Typography>
            <Typography variant="h6">
              {results.class_a_maturities.length}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Direct Coupon Rate
            </Typography>
            <Typography variant="h6" color="secondary">
              {formatPercent(results.direct_class_b_coupon_rate || 0)}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Effective Coupon Rate
            </Typography>
            <Typography variant="h6" color="secondary">
              {formatPercent(results.class_b_coupon_rate)}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Minimum Buffer
            </Typography>
            <Typography variant="h6" color={results.min_buffer_actual >= 5.0 ? 'success.main' : 'error.main'}>
              {formatPercent(results.min_buffer_actual)}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Class B Maturity
            </Typography>
            <Typography variant="h6">
              {results.class_b_maturity} days
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="secondary"
            size="large"
            onClick={applyConfiguration}
          >
            Apply This Configuration
          </Button>
          
          <Button 
            variant="outlined" 
            color="primary"
            size="large"
            startIcon={<ReplayIcon />}
            onClick={resetToOriginal}
          >
            Reset to Original Values
          </Button>
        </Box>
      </Paper>
      
      {/* Class B Maturity Calculation */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Class B Maturity Calculation
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 2, 
          my: 3 
        }}>
          <Paper sx={{ p: 2, bgcolor: 'grey.100', textAlign: 'center', minWidth: 180 }}>
            <Typography variant="body2" color="text.secondary">
              Last Cash Flow
            </Typography>
            <Typography variant="h5">
              {results.last_cash_flow_day} days
            </Typography>
          </Paper>
          
          <Typography variant="h4" color="text.secondary">+</Typography>
          
          <Paper sx={{ p: 2, bgcolor: 'grey.100', textAlign: 'center', minWidth: 180 }}>
            <Typography variant="body2" color="text.secondary">
              Additional Days
            </Typography>
            <Typography variant="h5">
              {results.additional_days} days
            </Typography>
          </Paper>
          
          <Typography variant="h4" color="text.secondary">=</Typography>
          
          <Paper sx={{ 
            p: 2, 
            bgcolor: theme.palette.secondary.main, 
            color: 'white',
            textAlign: 'center', 
            minWidth: 180 
          }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Class B Maturity
            </Typography>
            <Typography variant="h5">
              {results.class_b_maturity} days
            </Typography>
          </Paper>
        </Box>
        
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          Note: Class B maturity is calculated as Last Cash Flow Day + Additional Days.
          Maximum maturity is capped at 365 days.
        </Typography>
      </Paper>
      
      {/* Strategy Comparison */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Strategy Comparison
        </Typography>
        
        <TableContainer sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Strategy</TableCell>
                <TableCell align="right">Total Principal</TableCell>
                <TableCell align="right">Direct Coupon Rate</TableCell>
                <TableCell align="right">Effective Coupon Rate</TableCell>
                <TableCell align="right">Min Buffer</TableCell>
                <TableCell align="right">Class A Tranches</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {strategyResultsData.map((row, index) => (
                <TableRow 
                  key={index}
                  sx={{ 
                    bgcolor: row.isBest ? 'rgba(46, 204, 113, 0.1)' : 'transparent',
                    fontWeight: row.isBest ? 'bold' : 'normal'
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {row.isBest && <CheckCircleIcon color="secondary" fontSize="small" />}
                      {row.name}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(row.totalPrincipal)}</TableCell>
                  <TableCell align="right">{formatPercent(row.directClassBCouponRate)}</TableCell>
                  <TableCell align="right">{formatPercent(row.classBCouponRate)}</TableCell>
                  <TableCell align="right">{formatPercent(row.minBufferActual)}</TableCell>
                  <TableCell align="right">
                    {results.results_by_strategy[Object.keys(results.results_by_strategy).find(key => (getStrategyDisplayName(key)) === row.name)]?.num_a_tranches || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Strategy comparison charts */}
        <Box sx={{ height: 400, mb: 3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={strategyResultsData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar 
                dataKey="totalPrincipal" 
                name="Total Principal" 
                fill={theme.palette.primary.main} 
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        
        <Box sx={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={strategyResultsData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis unit="%" />
              <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
              <Legend />
              <Bar 
                dataKey="directClassBCouponRate" 
                name="Direct Coupon Rate" 
                fill={theme.palette.secondary.dark} 
              />
              <Bar 
                dataKey="classBCouponRate" 
                name="Effective Coupon Rate" 
                fill={theme.palette.secondary.main} 
              />
              <Bar 
                dataKey="minBufferActual" 
                name="Min Buffer" 
                fill={theme.palette.info.main} 
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      
      {/* Tranche Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Tranche Details
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom sx={{ color: theme.palette.primary.main, mt: 3 }}>
          Class A Tranches
        </Typography>
        
        <TableContainer sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tranche</TableCell>
                <TableCell align="right">Maturity (days)</TableCell>
                <TableCell align="right">Base Rate (%)</TableCell>
                <TableCell align="right">Reinvest Rate (%)</TableCell>
                <TableCell align="right">Nominal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.class_a_maturities.map((maturity, index) => (
                <TableRow key={index}>
                  <TableCell>Class A{toRoman(index + 1)}</TableCell>
                  <TableCell align="right">{maturity}</TableCell>
                  <TableCell align="right">{results.class_a_rates[index].toFixed(2)}</TableCell>
                  <TableCell align="right">{results.class_a_reinvest[index].toFixed(2)}</TableCell>
                  <TableCell align="right">{formatCurrency(results.class_a_nominals[index])}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(results.class_a_nominals.reduce((sum, nominal) => sum + nominal, 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        
        <Typography variant="subtitle1" gutterBottom sx={{ color: theme.palette.secondary.main, mt: 3 }}>
          Class B Tranche
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tranche</TableCell>
                <TableCell align="right">Maturity (days)</TableCell>
                <TableCell align="right">Base Rate (%)</TableCell>
                <TableCell align="right">Reinvest Rate (%)</TableCell>
                <TableCell align="right">Nominal</TableCell>
                <TableCell align="right">Direct Coupon Rate (%)</TableCell>
                <TableCell align="right">Effective Coupon Rate (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Class B{toRoman(1)}</TableCell>
                <TableCell align="right">{results.class_b_maturity}</TableCell>
                <TableCell align="right">{results.class_b_rate.toFixed(2)}</TableCell>
                <TableCell align="right">{results.class_b_reinvest.toFixed(2)}</TableCell>
                <TableCell align="right">{formatCurrency(results.class_b_nominal)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main }}>
                  {formatPercent(results.direct_class_b_coupon_rate || 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main }}>
                  {formatPercent(results.class_b_coupon_rate)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Visualizations */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visualizations
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
          Nominal Amount Distribution
        </Typography>
        
        <Box sx={{ height: 400, mb: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name.includes('Class A') 
                      ? theme.palette.primary[index % 5 === 0 ? 'main' : `${Math.min(900, 300 + index * 100)}`]
                      : theme.palette.secondary.main
                    } 
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
          Maturity Distribution
        </Typography>
        
        <Box sx={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="maturity" 
                name="Maturity" 
                unit=" days" 
                domain={[0, 'dataMax + 30']}
              />
              <YAxis 
                type="number" 
                dataKey="nominal" 
                name="Nominal" 
                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              />
              <ZAxis range={[100, 600]} />
              <Tooltip 
                formatter={(value, name, props) => {
                  if (name === 'Nominal') return formatCurrency(value);
                  return `${value} days`;
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid #ccc' }}>
                        <Typography variant="body2" fontWeight="bold">
                          {data.name}
                        </Typography>
                        <Typography variant="body2">
                          Maturity: {data.maturity} days
                        </Typography>
                        {data.type !== 'Marker' && (
                          <Typography variant="body2">
                            Nominal: {formatCurrency(data.nominal)}
                          </Typography>
                        )}
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Scatter 
                name="Class A" 
                data={maturityData.filter(d => d.type === 'Class A')}
                fill={theme.palette.primary.main}
              />
              <Scatter 
                name="Class B" 
                data={maturityData.filter(d => d.type === 'Class B')}
                fill={theme.palette.secondary.main}
              />
              <Scatter 
                name="Last Cash Flow" 
                data={maturityData.filter(d => d.type === 'Marker')}
                fill={theme.palette.error.main}
                shape="star"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      
      {/* Save Dialog with Method Type Selection */}
      <Dialog open={saveDialogOpen} onClose={handleSaveDialogClose}>
        <DialogTitle>Save Optimization Result</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for this result and confirm its type for comparison.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Result Name"
            type="text"
            fullWidth
            variant="outlined"
            value={resultName}
            onChange={(e) => setResultName(e.target.value)}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <FormLabel id="method-type-label">Result Type</FormLabel>
            <RadioGroup
              row
              value={selectedMethodType}
              onChange={(e) => setSelectedMethodType(e.target.value)}
            >
              <FormControlLabel value="standard" control={<Radio />} label="Standard Optimization" />
              <FormControlLabel value="genetic" control={<Radio />} label="Genetic Optimization" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveDialogClose}>Cancel</Button>
          <Button onClick={handleSaveConfirm} color="primary" disabled={!resultName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OptimizationResults;