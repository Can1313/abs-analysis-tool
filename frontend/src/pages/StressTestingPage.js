// src/pages/StressTestingPage.js
import React, { useState } from 'react';
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
  IconButton,
  Tooltip,
  CircularProgress // CircularProgress importu eklendi
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
import { useData } from '../contexts/DataContext';

// Import Recharts components
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ReferenceLine,
  PieChart, Pie, Cell, Scatter, ScatterChart, ZAxis
} from 'recharts';

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

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  const theme = useTheme();
  if (active && payload && payload.length) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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

const StressTestingPage = () => {
  const theme = useTheme();
  const { calculationResults } = useData();
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for stress test parameters
  const [nplRange, setNplRange] = useState([2, 15]);
  const [prepaymentRange, setPrepaymentRange] = useState([5, 25]);
  const [reinvestmentRange, setReinvestmentRange] = useState([-10, 10]);
  const [defaultReinvestRate, setDefaultReinvestRate] = useState(30);
  const [scenarios, setScenarios] = useState(10);
  const [selectedScenario, setSelectedScenario] = useState('base');
  
  // Mock data for the stress test results
  const mockResults = {
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
  };
  
  // Calculate color based on difference
  const getDifferenceColor = (diff) => {
    if (diff >= -1) return theme.palette.success.main;
    if (diff >= -5) return theme.palette.warning.main;
    return theme.palette.error.main;
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle running the stress test
  const handleRunStressTest = () => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };
  
  // Format data for the sensitivity charts
  const formatSensitivityData = (dataKey) => {
    return mockResults.sensitivityAnalysis[dataKey].map(item => ({
      value: item.value,
      modeled: item.modeled,
      realized: item.realized,
      difference: item.realized - item.modeled
    }));
  };
  
  // Format combined scenarios data for scatter plot
  const formatScatterData = () => {
    return mockResults.combinedScenarios.map(item => ({
      x: item.npl, // NPL rate for X axis
      y: item.prepayment, // Prepayment rate for Y axis
      z: Math.abs(item.realized - item.modeled) * 10, // Difference size for bubble size (scaled)
      npl: item.npl,
      prepayment: item.prepayment,
      reinvest: item.reinvest,
      modeled: item.modeled,
      realized: item.realized,
      difference: (item.realized - item.modeled).toFixed(2)
    }));
  };

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
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          }}
        >
          Export Results
        </Button>
      </Box>
      
      <Grid container spacing={4}>
        {/* Parameters Panel */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={2}
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${theme.palette.background.paper})`,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TuneIcon sx={{ mr: 1, color: theme.palette.primary.light }} />
              Stress Test Parameters
            </Typography>
            
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
            
            <Box sx={{ mt: 2 }}>
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
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                <AttachMoneyIcon sx={{ fontSize: 20, mr: 1, color: theme.palette.secondary.light }} />
                Reinvestment Rate Shift (±%)
                <Tooltip title="Deviation from the base reinvestment rate in percentage points" sx={{ ml: 1 }}>
                  <IconButton size="small">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Box sx={{ px: 1, pt: 1, pb: 2 }}>
                <StyledSlider
                  value={reinvestmentRange}
                  onChange={(e, value) => setReinvestmentRange(value)}
                  valueLabelDisplay="auto"
                  min={-20}
                  max={20}
                  step={1}
                  marks={[
                    { value: -20, label: '-20%' },
                    { value: 0, label: '0%' },
                    { value: 20, label: '+20%' }
                  ]}
                />
              </Box>
            </Box>
            
            <Box sx={{ mt: 3 }}>
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
                sx={{ mb: 2 }}
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
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
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
                disabled={isLoading}
                sx={{
                  py: 1.2,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
                    background: `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`
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
            elevation={2}
            sx={{ 
              borderRadius: 2,
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              background: theme.palette.background.paper,
            }}
          >
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              background: `linear-gradient(to right, ${alpha(theme.palette.primary.dark, 0.05)}, ${alpha(theme.palette.primary.main, 0.1)})`,
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
                  label="Reinvestment Effect" 
                  icon={<AttachMoneyIcon />} 
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
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${theme.palette.background.paper})`,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4
                    }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Modeled Coupon Rate</Typography>
                        <Typography variant="h3" color="primary.main" sx={{ mt: 0.5 }}>
                          {mockResults.classBCouponRate.modeled.toFixed(1)}%
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">Realized Coupon Rate</Typography>
                        <Typography 
                          variant="h3" 
                          sx={{ 
                            mt: 0.5, 
                            color: getDifferenceColor(mockResults.classBCouponRate.difference)
                          }}
                        >
                          {mockResults.classBCouponRate.realized.toFixed(1)}%
                        </Typography>
                      </Box>
                      
                      <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                        <Typography variant="body2" color="text.secondary">Difference</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 1 }}>
                          <Chip 
                            label={`${mockResults.classBCouponRate.difference > 0 ? '+' : ''}${mockResults.classBCouponRate.difference.toFixed(1)}%`}
                            color={
                              mockResults.classBCouponRate.difference >= -1 ? "success" :
                              mockResults.classBCouponRate.difference >= -5 ? "warning" : "error"
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
                    <Typography variant="h6" gutterBottom>
                      Scenario Comparison
                    </Typography>
                    <Box sx={{ height: 380 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={mockResults.scenarioResults}
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
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
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend />
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
                  
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Deviation Analysis
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={mockResults.scenarioResults}
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
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
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend />
                          <ReferenceLine y={0} stroke={theme.palette.error.main} />
                          <Area 
                            type="monotone" 
                            dataKey="difference" 
                            name="Rate Difference" 
                            stroke={theme.palette.error.main}
                            fill={alpha(theme.palette.error.main, 0.2)}
                          />
                        </AreaChart>
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
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                      <XAxis 
                        dataKey="value"
                        label={{ value: 'NPL Rate (%)', position: 'insideBottomRight', offset: -5 }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        label={{ value: 'Coupon Rate (%)', angle: -90, position: 'insideLeft' }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
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
                
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={formatSensitivityData('npl')}
                      margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                      <XAxis 
                        dataKey="value"
                        label={{ value: 'NPL Rate (%)', position: 'insideBottomRight', offset: -5 }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        label={{ value: 'Difference (%)', angle: -90, position: 'insideLeft' }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke={theme.palette.warning.main} />
                      <Area 
                        type="monotone" 
                        dataKey="difference" 
                        name="Rate Difference" 
                        stroke={theme.palette.error.main}
                        fill={alpha(theme.palette.error.main, 0.2)}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
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
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                      <XAxis 
                        dataKey="value"
                        label={{ value: 'Prepayment Rate (%)', position: 'insideBottomRight', offset: -5 }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        label={{ value: 'Coupon Rate (%)', angle: -90, position: 'insideLeft' }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
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
                
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={formatSensitivityData('prepayment')}
                      margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                      <XAxis 
                        dataKey="value"
                        label={{ value: 'Prepayment Rate (%)', position: 'insideBottomRight', offset: -5 }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        label={{ value: 'Difference (%)', angle: -90, position: 'insideLeft' }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke={theme.palette.warning.main} />
                      <Area 
                        type="monotone" 
                        dataKey="difference" 
                        name="Rate Difference" 
                        stroke={theme.palette.error.main}
                        fill={alpha(theme.palette.error.main, 0.2)}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
            
            {/* Reinvestment Effect Tab */}
            {tabValue === 3 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Class B Coupon Rate vs. Reinvestment Rate Shifts
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This analysis shows how changes in reinvestment rates affect Class B coupon performance. Positive shifts indicate higher than expected reinvestment rates.
                </Typography>
                
                <Box sx={{ height: 400, mb: 4 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={formatSensitivityData('reinvestment')}
                      margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                      <XAxis 
                        dataKey="value"
                        label={{ value: 'Reinvestment Rate Shift (%)', position: 'insideBottomRight', offset: -5 }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        label={{ value: 'Coupon Rate (%)', angle: -90, position: 'insideLeft' }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <ReferenceLine x={0} stroke={theme.palette.warning.main} />
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
                
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={formatSensitivityData('reinvestment')}
                      margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                      <XAxis 
                        dataKey="value"
                        label={{ value: 'Reinvestment Rate Shift (%)', position: 'insideBottomRight', offset: -5 }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        label={{ value: 'Difference (%)', angle: -90, position: 'insideLeft' }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke={theme.palette.warning.main} />
                      <Area 
                        type="monotone" 
                        dataKey="difference" 
                        name="Rate Difference" 
                        stroke={theme.palette.success.main}
                        fill={alpha(theme.palette.success.main, 0.2)}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
            
            {/* Combined Analysis Tab */}
            {tabValue === 4 && (
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
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.1)} />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="NPL Rate" 
                        unit="%" 
                        domain={[0, 20]}
                        label={{ value: 'NPL Rate (%)', position: 'insideBottomRight', offset: -5 }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Prepayment Rate" 
                        unit="%"
                        domain={[0, 30]}
                        label={{ value: 'Prepayment Rate (%)', angle: -90, position: 'insideLeft' }}
                        tick={{ fill: theme.palette.text.secondary }}
                      />
                      <ZAxis type="number" range={[60, 350]} />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <Paper
                                elevation={3}
                                sx={{
                                  p: 2,
                                  borderRadius: 1,
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
                                      color={getDifferenceColor(data.difference)}>
                                      {data.difference}%
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Paper>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Scatter 
                        name="Rate Deviation" 
                        data={formatScatterData()} 
                        fill={theme.palette.error.main}
                        fillOpacity={0.6}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                  Risk Heatmap Interpretation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Larger bubbles indicate greater deviation between modeled and realized coupon rates. 
                  The upper right quadrant (high NPL, high prepayment) represents the most severe stress conditions.
                  Scenarios with high NPL rates and high prepayment rates tend to result in the largest deviations in Class B coupon performance.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default StressTestingPage;

// Helper components for import
const TuneIcon = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 22v-3.92a2.43 2.43 0 0 1 .76-1.76L10 10.08m3 1.92-6.24-6.24A2.43 2.43 0 0 1 6 4.08V2"></path>
      <path d="M14 22v-3.92a2.43 2.43 0 0 0-.76-1.76L7 10.08m10 3.92 6.24-6.24A2.43 2.43 0 0 0 24 6V2"></path>
    </svg>
  );
};