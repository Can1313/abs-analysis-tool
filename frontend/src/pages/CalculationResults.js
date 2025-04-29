// src/components/calculation/CalculationResults.js
import React, { useState } from "react";
import { 
  Box, 
  Typography, 
  Paper,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Divider,
  Chip,
  alpha,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  useTheme,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Snackbar,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from "@mui/material";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine } from "recharts";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TimelineIcon from '@mui/icons-material/Timeline';
import PieChartIcon from '@mui/icons-material/PieChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TableChartIcon from '@mui/icons-material/TableChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SaveIcon from '@mui/icons-material/Save';
import { useData } from '../contexts/DataContext';

// Custom tooltip component for charts with enhanced styling
const CustomTooltip = ({ active, payload, label, formatter }) => {
  const theme = useTheme();
  if (active && payload && payload.length) {
    return (
      <Paper
        sx={{
          p: 1.5,
          boxShadow: theme.shadows[3],
          borderRadius: theme.shape.borderRadius,
          border: "none",
          minWidth: 180,
          maxWidth: 280,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>{label}</Typography>
        {payload.map((entry, index) => (
          <Box key={`item-${index}`} sx={{ color: entry.color, display: 'flex', justifyContent: 'space-between', my: 0.5 }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {entry.name}:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatter ? formatter(entry.value) : entry.value}
            </Typography>
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};

const CalculationResults = ({ results }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  
  // States for save functionality
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [resultName, setResultName] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedMethodType, setSelectedMethodType] = useState('manual');
  
  // Get saveResult function from context
  const { saveResult } = useData();
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Functions for save functionality
  const handleSaveClick = () => {
    setSaveDialogOpen(true);
    // Default name based on calculation type
    let defaultName = 'Manual Calculation';
    if (results.is_optimized) {
      defaultName = results.optimization_method ? 
        `${results.optimization_method.charAt(0).toUpperCase() + results.optimization_method.slice(1)} Optimization` : 
        'Optimized Calculation';
    }
    setResultName(defaultName);
    
    // Set default method type based on results
    let methodType = 'manual';
    if (results.is_optimized) {
      methodType = results.optimization_method === 'genetic' ? 'genetic' : 'standard';
    }
    setSelectedMethodType(methodType);
  };
  
  const handleSaveDialogClose = () => {
    setSaveDialogOpen(false);
  };
  
  const handleSaveConfirm = () => {
    const saved = saveResult(results, resultName, selectedMethodType);
    
    if (saved) {
      setSnackbarMessage(`Result saved as "${resultName}" (${selectedMethodType})`);
      setSnackbarOpen(true);
      setSaveDialogOpen(false);
    } else {
      setSnackbarMessage('Failed to save result');
      setSnackbarOpen(true);
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  if (!results) {
    return (
      <Paper sx={{ 
        p: 4, 
        textAlign: "center", 
        borderRadius: 2,
        backgroundColor: alpha(theme.palette.info.light, 0.08),
        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
      }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Results Not Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please start the calculation process to view results
        </Typography>
      </Paper>
    );
  }
  
  // Format currency values
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return "₺0.00";
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
  };
  
  // Format percentage values with null check
  const formatPercent = (value) => {
    if (value === undefined || value === null) return "0.00%";
    return `${value.toFixed(2)}%`;
  };

  // Extract color values from theme
  const classAColor = theme.palette.primary.main;
  const classBColor = theme.palette.secondary.main;
  
  // Calculate totals with null checks
  const totalClassA = (results.class_a_principal || 0) + (results.class_a_interest || 0);
  const totalClassB = results.class_b_principal || 0;
  const totalAll = totalClassA + totalClassB;
  
  // Check if minimum buffer requirement is met
  const minBufferTarget = 5.0;
  const isBufferMet = (results.min_buffer_actual || 0) >= minBufferTarget;
  
  // Prepare data for tranche comparison chart - showing both principal and interest
  const classComparisonData = [
    {
      name: "Class A",
      principal: results.class_a_principal || 0,
      interest: results.class_a_interest || 0,
      total: totalClassA,
      color: classAColor
    },
    {
      name: "Class B",
      principal: results.class_b_principal || 0,
      coupon: results.class_b_coupon || 0,
      total: results.class_b_total || 0,
      color: classBColor
    },
  ];
  
  // Prepare data for pie chart - as specified, Class A is principal + interest, Class B is principal only
  const pieData = [
    { name: 'Class A (Principal + Interest)', value: totalClassA, color: classAColor },
    { name: 'Class B (Principal)', value: totalClassB, color: classBColor }
  ];
  
  // Prepare data for tranche-level charts
  const trancheDetails = results.tranche_results ? results.tranche_results.map(t => ({
    name: t["Tranche"],
    principal: t["Principal"],
    interest: t["Is Class A"] ? t["Interest"] : t["Coupon Payment"],
    total: t["Total Payment"],
    buffer: t["Buffer Cash Flow Ratio (%)"],
    maturity: t["Maturity Days"],
    maturityDate: t["Maturity Date"],
    isClassA: t["Is Class A"],
    bufferIn: t["Buffer In"],
    cashFlow: t["Cash Flow Total"],
    reinvestment: t["Reinvestment Return"],
    bufferReinvestment: t["Buffer Reinvestment"],
    totalAvailable: t["Total Available"],
  })) : [];
  
  // Sort tranche details by maturity for timeline visualization
  const sortedByMaturity = [...trancheDetails].sort((a, b) => a.maturity - b.maturity);
  
  // Cumulative payment timeline for enhanced visualization
  const cumulativeTimelineData = [];
  let cumulativeTotal = 0;
  
  sortedByMaturity.forEach(t => {
    cumulativeTotal += t.total;
    cumulativeTimelineData.push({
      ...t,
      cumulativeTotal: cumulativeTotal
    });
  });
  
  // Buffer ratio chart data
  const bufferData = trancheDetails
    .filter(t => t.isClassA)
    .map(t => ({
      name: t.name,
      buffer: t.buffer,
      minimum: minBufferTarget
    }));
    
  // Cash flow components data
  const cashFlowComponentsData = trancheDetails.map(t => ({
    name: t.name,
    cashFlow: t.cashFlow,
    reinvestment: t.reinvestment,
    bufferIn: t.bufferIn,
    bufferReinvestment: t.bufferReinvestment,
  }));
  
  // Financing analysis data for visualization
  const financingData = [
    { name: 'Total Receivable Amount', value: results.total_loan_principal },
    { name: 'Total Amount Paid to Institution', value: results.total_principal_paid },
  ];
  
  // Color palette for multiple tranches
  const getTrancheColor = (index, isClassA) => {
    if (isClassA) {
      const colors = [
        theme.palette.primary.main,
        theme.palette.primary.light,
        alpha(theme.palette.primary.main, 0.8),
        alpha(theme.palette.primary.main, 0.6),
        alpha(theme.palette.primary.main, 0.4),
      ];
      return colors[index % colors.length];
    } else {
      const colors = [
        theme.palette.secondary.main,
        theme.palette.secondary.light,
        alpha(theme.palette.secondary.main, 0.8),
        alpha(theme.palette.secondary.main, 0.6),
        alpha(theme.palette.secondary.main, 0.4),
      ];
      return colors[index % colors.length];
    }
  };
  
  // Chart configuration
  const chartConfig = {
    height: 350,
    margin: { top: 20, right: 30, left: 20, bottom: 20 },
  };

  return (
    <Box>
      {/* Save Button at the top */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          onClick={handleSaveClick}
        >
          Save Result
        </Button>
      </Box>
      
      {/* Summary Section with enhanced styling */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          backgroundColor: alpha(theme.palette.primary.main, 0.03),
          borderRadius: 2
        }}
      >
        <Typography variant="h6" color="primary.main" fontWeight="medium" gutterBottom>
          Calculation Results Summary
        </Typography>
        
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mt: 2 }}>
          <Box sx={{ 
            flex: "1 0 300px", 
            bgcolor: 'background.paper', 
            p: 2, 
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[1]
          }}>
            <Typography variant="subtitle1" gutterBottom color="text.secondary" fontWeight="medium">
              Payment Totals
            </Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ pl: 0, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>Class A Total</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>{formatCurrency(totalClassA)}</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                      <Chip 
                        size="small" 
                        label={formatPercent(totalAll > 0 ? (totalClassA / totalAll * 100) : 0)}
                        sx={{ 
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 0, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>Class B Total</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>{formatCurrency(totalClassB)}</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                      <Chip 
                        size="small" 
                        label={formatPercent(totalAll > 0 ? (totalClassB / totalAll * 100) : 0)}
                        sx={{ 
                          bgcolor: alpha(theme.palette.secondary.main, 0.1),
                          color: theme.palette.secondary.main,
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ "& td": { fontWeight: 600 } }}>
                    <TableCell sx={{ pl: 0 }}>Grand Total</TableCell>
                    <TableCell align="right">{formatCurrency(totalAll)}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        size="small" 
                        label="100.00%"
                        sx={{ 
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          
          <Box sx={{ 
            flex: "1 0 300px", 
            bgcolor: 'background.paper', 
            p: 2, 
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[1]
          }}>
            <Typography variant="subtitle1" gutterBottom color="text.secondary" fontWeight="medium">
              Principal and Interest
            </Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ pl: 0, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          component="span" 
                          sx={{ 
                            display: 'inline-block', 
                            width: 10, 
                            height: 10, 
                            borderRadius: '50%', 
                            bgcolor: classAColor,
                            mr: 1 
                          }} 
                        />
                        Class A
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>{formatCurrency(results.class_a_principal)}</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>{formatCurrency(results.class_a_interest)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 0, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          component="span" 
                          sx={{ 
                            display: 'inline-block', 
                            width: 10, 
                            height: 10, 
                            borderRadius: '50%', 
                            bgcolor: classBColor,
                            mr: 1 
                          }} 
                        />
                        Class B
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>{formatCurrency(results.class_b_principal)}</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>{formatCurrency(results.class_b_coupon)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ "& td": { fontWeight: 600 } }}>
                    <TableCell sx={{ pl: 0 }}>Total</TableCell>
                    <TableCell align="right">
                      {formatCurrency((results.class_a_principal || 0) + (results.class_b_principal || 0))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency((results.class_a_interest || 0) + (results.class_b_coupon || 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
        
        <Divider sx={{ my: 3, opacity: 0.6 }} />
        
        <Box sx={{ 
          display: 'flex', 
          gap: 4, 
          flexWrap: 'wrap',
          backgroundColor: isBufferMet ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.error.main, 0.08),
          p: 2,
          borderRadius: theme.shape.borderRadius,
        }}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Minimum Buffer Requirement
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {formatPercent(minBufferTarget)}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Actual Minimum Buffer (Class A)
            </Typography>
            <Typography variant="h6" color={isBufferMet ? "success.main" : "error.main"} sx={{ mt: 0.5 }}>
              {formatPercent(results.min_buffer_actual)}
            </Typography>
          </Box>
          
          <Box sx={{ ml: 'auto' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              {isBufferMet ? (
                <CheckCircleOutlineIcon color="success" sx={{ mr: 1 }} />
              ) : (
                <ErrorOutlineIcon color="error" sx={{ mr: 1 }} />
              )}
              <Typography 
                variant="h6" 
                color={isBufferMet ? "success.main" : "error.main"}
              >
                {isBufferMet ? "Requirement Met" : "Requirement Not Met"}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
      
      {/* Enhanced Chart and Table Tabs */}
      <Box sx={{ mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 2,
            '& .MuiTab-root': {
              minWidth: 'auto',
              px: 3
            }
          }}
        >
          <Tab icon={<PieChartIcon />} label="Overview" iconPosition="start" />
          <Tab icon={<BarChartIcon />} label="Tranche Details" iconPosition="start" />
          <Tab icon={<TimelineIcon />} label="Maturity Analysis" iconPosition="start" />
          <Tab icon={<ShowChartIcon />} label="Cash Flow Analysis" iconPosition="start" />
          <Tab icon={<AccountBalanceWalletIcon />} label="Financing" iconPosition="start" />
          <Tab icon={<TableChartIcon />} label="Detailed Table" iconPosition="start" />
        </Tabs>
        
        {/* Tab 1: Overview Charts - With enhanced visualization */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  height: '100%',
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Distribution by Class
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Showing Class A (Principal + Interest) vs Class B (Principal)
                </Typography>
                <Box sx={{ height: chartConfig.height, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={chartConfig.margin}>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={70}
                        labelLine={false}
                        label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(1)}%)`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  height: '100%',
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Principal vs Interest/Coupon
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Showing the breakdown of payments by type
                </Typography>
                <Box sx={{ height: chartConfig.height, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classComparisonData}
                      margin={chartConfig.margin}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `₺${value/1000000}M`} />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                      />
                      <Legend />
                      <Bar 
                        dataKey="principal" 
                        name="Principal" 
                        stackId="a" 
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="interest" 
                        name="Interest" 
                        stackId="a" 
                        fill={theme.palette.info.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="coupon" 
                        name="Coupon" 
                        stackId="a" 
                        fill={theme.palette.secondary.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  backgroundColor: alpha(theme.palette.info.main, 0.03),
                  borderRadius: 2
                }}
              >
                <Typography variant="h6" color="info.main" gutterBottom fontWeight="medium">
                  Financing Analysis
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      mt: 2,
                      p: 2,
                      bgcolor: 'background.paper', 
                      borderRadius: theme.shape.borderRadius,
                      boxShadow: theme.shadows[1]
                    }}>
                      <TableContainer>
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell sx={{ pl: 2, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>Total Amount Paid to Institution:</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600, pr: 2, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                                {formatCurrency(results.total_principal_paid)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell sx={{ pl: 2, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>Total Receivable Amount:</TableCell>
                              <TableCell align="right" sx={{ pr: 2, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                                {formatCurrency(results.total_loan_principal)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell sx={{ pl: 2, fontWeight: 600 }}>
                                Total Financing Cost:
                              </TableCell>
                              <TableCell 
                                align="right" 
                                sx={{ 
                                  fontWeight: 600,
                                  pr: 2,
                                  color: (results.financing_cost || 0) > 0 ? "success.main" : "error.main"
                                }}
                              >
                                {formatCurrency(Math.abs(results.financing_cost || 0))}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={financingData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                          <XAxis type="number" tickFormatter={(value) => `₺${value/1000000}M`} />
                          <YAxis type="category" dataKey="name" />
                          <Tooltip 
                            content={<CustomTooltip formatter={(value) => formatCurrency(value)} />} 
                          />
                          <Bar 
                            dataKey="value" 
                            fill={(results.financing_cost || 0) > 0 ? theme.palette.success.light : theme.palette.error.light}
                            radius={4}
                            barSize={30}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {/* Tab 2: Tranche Details - Enhanced for clarity */}
        {tabValue === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Tranche Payments Breakdown
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Showing the principal and interest/coupon payments for each tranche
                </Typography>
                <Box sx={{ height: 400, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trancheDetails}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tickFormatter={(value) => `₺${value/1000000}M`} />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                      />
                      <Legend />
                      <Bar 
                        dataKey="principal" 
                        name="Principal" 
                        fill={theme.palette.primary.dark}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="interest" 
                        name="Interest/Coupon" 
                        fill={theme.palette.secondary.light}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Individual Tranche Payments
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Comparison of total payments across all tranches
                </Typography>
                <Box sx={{ height: 350, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trancheDetails}
                      margin={{ top: 5, right: 30, left: 5, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis 
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}  
                      />
                      <YAxis tickFormatter={(value) => `₺${value/1000000}M`} />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                      />
                      <Bar 
                        dataKey="total" 
                        name="Total Payment" 
                        radius={[4, 4, 0, 0]}
                      >
                        {trancheDetails.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getTrancheColor(index, entry.isClassA)} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Buffer Analysis (Class A)
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Comparing actual buffer ratios against minimum requirements
                </Typography>
                <Box sx={{ height: 350, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bufferData}
                      margin={{ top: 5, right: 30, left: 5, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis 
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}  
                      />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value) => `${value.toFixed(2)}%`} />}
                      />
                      <Legend />
                      <Bar 
                        dataKey="buffer" 
                        name="Buffer Ratio" 
                        fill={theme.palette.success.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <ReferenceLine 
                        y={minBufferTarget} 
                        stroke={theme.palette.error.main} 
                        strokeDasharray="3 3"
                        label={{ value: 'Minimum Requirement', position: 'insideBottomRight', fill: theme.palette.error.main }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {/* Tab 3: Maturity Analysis - Completely redesigned for better visualization */}
        {tabValue === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Payment Schedule by Maturity
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Discrete payment events across the maturity timeline
                </Typography>
                <Box sx={{ height: 400, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sortedByMaturity}
                      margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis 
                        dataKey="maturity" 
                        type="number"
                        domain={[0, 'dataMax + 30']}
                        label={{ 
                          value: 'Maturity (days)', 
                          position: 'insideBottom', 
                          offset: -5 
                        }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `₺${value/1000000}M`}
                        label={{ 
                          value: 'Payment Amount', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                      />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value, name) => 
                          name === "maturity" ? `${value} days` : 
                          name === "maturityDate" ? value : 
                          formatCurrency(value)
                        } />}
                      />
                      <Legend />
                      <Bar 
                        dataKey="total" 
                        name="Payment Amount" 
                        radius={[4, 4, 0, 0]}
                      >
                        {sortedByMaturity.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.isClassA ? theme.palette.primary.main : theme.palette.secondary.main} 
                          />
                        ))}
                      </Bar>
                      <ReferenceLine
                        x={0}
                        stroke={theme.palette.text.secondary}
                        strokeWidth={1}
                        label={{ value: 'Today', position: 'insideTopLeft', fill: theme.palette.text.secondary }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Maturity Distribution by Class
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Comparing maturity dates between Class A and Class B tranches
                </Typography>
                <Box sx={{ height: 350, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trancheDetails.sort((a, b) => a.maturity - b.maturity)}
                      margin={{ top: 5, right: 30, left: 5, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis 
                        dataKey="maturity"
                        label={{ 
                          value: 'Maturity (days)', 
                          position: 'insideBottom', 
                          offset: -5 
                        }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `₺${value/1000000}M`}
                      />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value, name) => 
                          name === "maturity" ? `${value} days` : formatCurrency(value)
                        } />}
                      />
                      <Legend />
                      <Bar 
                        dataKey="total" 
                        name="Payment Amount" 
                        radius={[4, 4, 0, 0]}
                      >
                        {trancheDetails.sort((a, b) => a.maturity - b.maturity).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.isClassA ? theme.palette.primary.main : theme.palette.secondary.main} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Maturity vs. Buffer Ratio
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Analyzing how buffer ratios change across different maturity dates
                </Typography>
                <Box sx={{ height: 350, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trancheDetails.filter(t => t.isClassA).sort((a, b) => a.maturity - b.maturity)}
                      margin={{ top: 5, right: 30, left: 5, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis 
                        dataKey="maturity"
                        type="number"
                        label={{ 
                          value: 'Maturity (days)', 
                          position: 'insideBottom', 
                          offset: -5 
                        }}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Buffer Ratio (%)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                        unit="%"
                      />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value, name) => 
                          name === "maturity" ? `${value} days` : 
                          name === "buffer" ? `${value.toFixed(2)}%` : 
                          value
                        } />}
                      />
                      <ReferenceLine 
                        y={minBufferTarget}
                        stroke={theme.palette.error.main}
                        strokeDasharray="3 3"
                        label={{ 
                          value: 'Minimum Requirement', 
                          position: 'insideTopRight',
                          fill: theme.palette.error.main,
                          fontSize: 12
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="buffer" 
                        name="Buffer Ratio" 
                        stroke={theme.palette.success.main}
                        strokeWidth={2}
                        dot={{ 
                          r: 6, 
                          fill: data => data.value >= minBufferTarget ? theme.palette.success.main : theme.palette.error.main 
                        }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {/* Tab 4: Cash Flow Analysis - Enhanced for better readability */}
        {tabValue === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Cash Flow Components by Tranche
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Detailed breakdown of all cash flow sources for each tranche
                </Typography>
                <Box sx={{ height: 400, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={cashFlowComponentsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tickFormatter={(value) => `₺${value/1000000}M`} />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                      />
                      <Legend />
                      <Bar 
                        dataKey="cashFlow" 
                        name="Cash Flow" 
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="reinvestment" 
                        name="Reinvestment Return" 
                        fill={theme.palette.secondary.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="bufferIn" 
                        name="Buffer In" 
                        fill={theme.palette.info.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="bufferReinvestment" 
                        name="Buffer Reinvestment" 
                        fill={theme.palette.warning.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Available Funds vs Required Payments
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Comparing total available funds against payment obligations
                </Typography>
                <Box sx={{ height: 350, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trancheDetails}
                      margin={{ top: 5, right: 30, left: 5, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis 
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}  
                      />
                      <YAxis tickFormatter={(value) => `₺${value/1000000}M`} />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                      />
                      <Legend />
                      <Bar 
                        dataKey="totalAvailable" 
                        name="Total Available" 
                        fill={theme.palette.success.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="total" 
                        name="Total Payment" 
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Cash Flow Components Over Time
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Visualizing how different cash flow sources contribute to the overall pool
                </Typography>
                <Box sx={{ height: 350, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={cashFlowComponentsData}
                      margin={{ top: 5, right: 30, left: 5, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                      <XAxis 
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}  
                      />
                      <YAxis tickFormatter={(value) => `₺${value/1000000}M`} />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="cashFlow" 
                        name="Cash Flow" 
                        stackId="1"
                        stroke={theme.palette.primary.main}
                        fill={alpha(theme.palette.primary.main, 0.6)}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="reinvestment" 
                        name="Reinvestment" 
                        stackId="1"
                        stroke={theme.palette.secondary.main}
                        fill={alpha(theme.palette.secondary.main, 0.6)}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="bufferIn" 
                        name="Buffer In" 
                        stackId="1"
                        stroke={theme.palette.info.main}
                        fill={alpha(theme.palette.info.main, 0.6)}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {/* Tab 5: Financing Analysis - Enhanced and terminology improved */}
        {tabValue === 4 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  backgroundColor: alpha(theme.palette.info.main, 0.03),
                  borderRadius: 2
                }}
              >
                <Typography variant="h6" color="info.main" gutterBottom fontWeight="medium">
                  Financing Analysis
                </Typography>
                
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      p: 3,
                      bgcolor: 'background.paper', 
                      borderRadius: 2,
                      boxShadow: theme.shadows[1]
                    }}>
                      <Typography variant="subtitle1" gutterBottom color="text.secondary" fontWeight="medium">
                        Key Financing Metrics
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Total Receivable Amount</Typography>
                            <Typography variant="h6" fontWeight="medium">{formatCurrency(results.total_loan_principal)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Amount Paid to Institution</Typography>
                            <Typography variant="h6" fontWeight="medium">{formatCurrency(results.total_principal_paid)}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Financing Cost</Typography>
                            <Typography 
                              variant="h5" 
                              fontWeight="medium"
                              color={(results.financing_cost || 0) > 0 ? "success.main" : "error.main"}
                            >
                              TOTAL COST
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Amount</Typography>
                            <Typography 
                              variant="h5" 
                              fontWeight="medium"
                              color={(results.financing_cost || 0) > 0 ? "success.main" : "error.main"}
                            >
                              {formatCurrency(Math.abs(results.financing_cost || 0))}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={financingData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `₺${value/1000000}M`} />
                          <Tooltip 
                            content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                          />
                          <Legend />
                          <Bar 
                            dataKey="value" 
                            name="Amount" 
                            radius={[4, 4, 0, 0]}
                          >
                            {financingData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index === 0 
                                  ? theme.palette.info.main 
                                  : theme.palette.primary.main
                                } 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 3,
                      bgcolor: 'background.paper', 
                      borderRadius: 2,
                      boxShadow: theme.shadows[1]
                    }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                        Financing Analysis Summary
                      </Typography>
                      
                      <Typography variant="body1" paragraph>
                        The total amount paid to the institution is {formatCurrency(results.total_principal_paid)}, while the total receivable amount is {formatCurrency(results.total_loan_principal)}.
                      </Typography>
                      
                      <Typography variant="body1" paragraph>
                        The difference between these amounts represents a <strong>total financing cost of {formatCurrency(Math.abs(results.financing_cost || 0))}</strong>. This is the cost of the securitization structure based on the current configuration.
                      </Typography>
                      
                      <Typography variant="body1">
                        The total principal of the ABS structure (Class A + Class B) is {formatCurrency((results.class_a_principal || 0) + (results.class_b_principal || 0))}, with total interest and coupon payments of {formatCurrency((results.class_a_interest || 0) + (results.class_b_coupon || 0))}.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {/* Tab 6: Detailed Table - Enhanced styling */}
        {tabValue === 5 && (
          <Box>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                backgroundColor: 'background.paper',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom fontWeight="medium">
                Detailed Tranche Results
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Complete breakdown of all payment details by individual tranche
              </Typography>
              
              {results.tranche_results && results.tranche_results.length > 0 ? (
                <TableContainer sx={{ 
                  maxHeight: 440,
                  mt: 2,
                  borderRadius: 1,
                  boxShadow: theme.shadows[1]
                }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>Tranche</TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>Maturity Days</TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>Maturity Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>Principal</TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>Interest / Coupon</TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>Total Payment</TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>Buffer Ratio (%)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.tranche_results.map((tranche, index) => (
                        <TableRow 
                          key={index}
                          sx={{ 
                            backgroundColor: tranche["Is Class A"] 
                              ? alpha(theme.palette.primary.main, 0.03)
                              : alpha(theme.palette.secondary.main, 0.03),
                            '&:hover': {
                              backgroundColor: tranche["Is Class A"] 
                                ? alpha(theme.palette.primary.main, 0.07)
                                : alpha(theme.palette.secondary.main, 0.07),
                            }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box 
                                component="span" 
                                sx={{ 
                                  display: 'inline-block', 
                                  width: 10, 
                                  height: 10, 
                                  borderRadius: '50%', 
                                  bgcolor: tranche["Is Class A"] ? classAColor : classBColor,
                                  mr: 1 
                                }} 
                              />
                              {tranche["Tranche"]}
                            </Box>
                          </TableCell>
                          <TableCell>{tranche["Maturity Days"]}</TableCell>
                          <TableCell>{tranche["Maturity Date"]}</TableCell>
                          <TableCell>{formatCurrency(tranche["Principal"])}</TableCell>
                          <TableCell>
                            {formatCurrency(
                              tranche["Is Class A"] ? tranche["Interest"] : tranche["Coupon Payment"]
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(tranche["Total Payment"])}</TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={formatPercent(tranche["Buffer Cash Flow Ratio (%)"])}
                              sx={{ 
                                bgcolor: 
                                  tranche["Buffer Cash Flow Ratio (%)"] >= minBufferTarget
                                    ? alpha(theme.palette.success.main, 0.1)
                                    : alpha(theme.palette.warning.main, 0.1),
                                color: 
                                  tranche["Buffer Cash Flow Ratio (%)"] >= minBufferTarget
                                    ? theme.palette.success.main
                                    : theme.palette.warning.main,
                                fontWeight: 500,
                                fontSize: '0.75rem'
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  Detailed results are not available yet
                </Typography>
              )}
            </Paper>
          </Box>
        )}
      </Box>
      
      {/* Save Dialog with Method Type Selection */}
      <Dialog open={saveDialogOpen} onClose={handleSaveDialogClose}>
        <DialogTitle>Save Calculation Result</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for this result and select its type for comparison.
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
              <FormControlLabel value="manual" control={<Radio />} label="Manual Configuration" />
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
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default CalculationResults;