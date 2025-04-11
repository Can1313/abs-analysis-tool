// frontend/src/components/optimization/OptimizationResults.js
import React from 'react';
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
  Divider,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  BarChart, Bar, 
  PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Scatter, ScatterChart, ZAxis
} from 'recharts';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';

// Strategy name mapping
const strategyNames = {
  equal: "Equal Distribution",
  increasing: "Increasing by Maturity",
  decreasing: "Decreasing by Maturity",
  middle_weighted: "Middle Tranches Weighted"
};

const OptimizationResults = ({ results }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setTranchesA, setTrancheB, calculationResults, setPreviousCalculationResults } = useData();
  
  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };
  
  // Format percentage values
  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };
  
  // Prepare data for pie chart
  const pieData = [
    ...results.class_a_nominals.map((nominal, index) => ({
      name: `Class A${index + 1}`,
      value: nominal,
      color: theme.palette.primary.main
    })),
    { 
      name: 'Class B1', 
      value: results.class_b_nominal,
      color: theme.palette.secondary.main
    }
  ];
  
  // Prepare data for maturity distribution chart
  const maturityData = [
    ...results.class_a_maturities.map((maturity, index) => ({
      name: `Class A${index + 1}`,
      maturity,
      nominal: results.class_a_nominals[index],
      type: 'Class A'
    })),
    {
      name: 'Class B1',
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
    name: strategyNames[strategy],
    totalPrincipal: data.total_principal,
    classBCouponRate: data.class_b_coupon_rate,
    minBufferActual: data.min_buffer_actual,
    isBest: strategy === results.best_strategy
  }));
  
  // Apply the best strategy configuration to the forms
  const applyConfiguration = () => {
    // Store the current calculation results for comparison before we change the configuration
    if (calculationResults) {
      setPreviousCalculationResults(calculationResults);
    }
    
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
      reinvest_rate: results.class_b_reinvest
    };
    
    setTranchesA(a_tranches);
    setTrancheB(b_tranche);
    
    // Show a success message with option to compare
    const goToCompare = window.confirm('Configuration applied! Would you like to go to Comparison page to compare with previous results?');
    if (goToCompare) {
      navigate('/comparison');  // window.location.href yerine navigate kullanıyoruz
    } else {
      navigate('/calculation');  // window.location.href yerine navigate kullanıyoruz
    }
  };

  return (
    <Box>
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
            label={strategyNames[results.best_strategy]} 
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
              Class B Coupon Rate
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
        
        <Button 
          variant="contained" 
          color="secondary"
          size="large"
          onClick={applyConfiguration}
        >
          Apply This Configuration
        </Button>
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
                <TableCell align="right">Class B Coupon Rate</TableCell>
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
                  <TableCell align="right">{formatPercent(row.classBCouponRate)}</TableCell>
                  <TableCell align="right">{formatPercent(row.minBufferActual)}</TableCell>
                  <TableCell align="right">
                    {results.results_by_strategy[Object.keys(strategyNames).find(key => strategyNames[key] === row.name)]?.num_a_tranches || '-'}
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
                dataKey="classBCouponRate" 
                name="Class B Coupon Rate" 
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
                  <TableCell>Class A{index + 1}</TableCell>
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
                <TableCell align="right">Coupon Rate (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Class B1</TableCell>
                <TableCell align="right">{results.class_b_maturity}</TableCell>
                <TableCell align="right">{results.class_b_rate.toFixed(2)}</TableCell>
                <TableCell align="right">{results.class_b_reinvest.toFixed(2)}</TableCell>
                <TableCell align="right">{formatCurrency(results.class_b_nominal)}</TableCell>
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
    </Box>
  );
};

export default OptimizationResults;