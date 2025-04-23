// frontend/src/components/calculation/InterestRatesTable.js
import React from 'react';
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
  alpha,
  Chip,
  Grid,
  Divider,
  useTheme
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

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

const InterestRatesTable = ({ results }) => {
  const theme = useTheme();
  
  // Format value function (handles '-' or number)
  const formatValue = (value) => {
    if (value === '-') return value;
    return `${parseFloat(value).toFixed(2)}%`;
  };

  // Format value for charts (returns number)
  const getNumericValue = (value) => {
    if (value === '-' || value === undefined || value === null) return 0;
    return parseFloat(value);
  };

  // Prepare data for analysis
  const classAData = results.interest_rate_conversions
    .filter(rate => rate.Tranche.includes('Class A'))
    .map(rate => ({
      name: rate.Tranche,
      rate: getNumericValue(rate['Simple Annual Interest (%)']),
      maturity: rate['Maturity Days'],
      class: 'A'
    }));
    
  const classBData = results.interest_rate_conversions
    .filter(rate => rate.Tranche.includes('Class B'))
    .map(rate => ({
      name: rate.Tranche,
      rate: getNumericValue(rate['Effective Coupon Rate (%)']),
      directRate: getNumericValue(rate['Coupon Rate (%)']),
      maturity: rate['Maturity Days'],
      class: 'B'
    }));
  
  
  // Color helper function
  const getClassColor = (classType, variant = 'main') => {
    return classType === 'A' ? theme.palette.primary[variant] : theme.palette.secondary[variant];
  };
  
  return (
    <Box>
      {/* Class B Coupon Information with enhanced styling */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
          backgroundColor: alpha(theme.palette.secondary.main, 0.05),
          borderRadius: 2
        }}
      >
        <Typography variant="h6" gutterBottom color="secondary.main" fontWeight="medium">
          Class B Coupon Information
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          Detailed breakdown of coupon rates for Class B tranches, showing direct rates and effective rates after calculations
        </Typography>
        
        <TableContainer sx={{ 
          backgroundColor: 'background.paper', 
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[1]
        }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.secondary.main, 0.04) }}>Tranche</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.secondary.main, 0.04) }}>Direct Coupon Rate (%)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.secondary.main, 0.04) }}>Effective Coupon Rate (%)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.secondary.main, 0.04) }}>Maturity Info</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.interest_rate_conversions
                .filter(rate => rate.Tranche.includes('Class B'))
                .map((rate, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          component="span" 
                          sx={{ 
                            display: 'inline-block', 
                            width: 10, 
                            height: 10, 
                            borderRadius: '50%', 
                            bgcolor: theme.palette.secondary.main,
                            mr: 1 
                          }} 
                        />
                        {rate.Tranche}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        size="small" 
                        label={formatValue(rate['Coupon Rate (%)'])}
                        sx={{ 
                          bgcolor: alpha(theme.palette.secondary.main, 0.1),
                          color: theme.palette.secondary.main,
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        size="small" 
                        label={formatValue(rate['Effective Coupon Rate (%)'])}
                        sx={{ 
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {`${rate['Maturity Days']} days`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rate['Maturity Date'] || 'Date not specified'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Interest Rate Analysis with detailed view */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          borderRadius: 2
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom fontWeight="medium">
            Interest Rate Analysis
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Comprehensive breakdown showing all interest rate details and conversion calculations
          </Typography>
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: 1
              }}
            >
              <Typography variant="subtitle2" color="primary.main" gutterBottom>
                Class A Interest Rates
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Class A tranches use simple annual interest rates based on the maturity period.
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {classAData.map((item, idx) => (
                  <Chip 
                    key={idx}
                    label={`${item.name}: ${item.rate.toFixed(2)}%`}
                    size="small"
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main
                    }}
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                bgcolor: alpha(theme.palette.secondary.main, 0.03),
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                borderRadius: 1
              }}
            >
              <Typography variant="subtitle2" color="secondary.main" gutterBottom>
                Class B Coupon Rates
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Class B tranches have an effective coupon rate which is calculated based on multiple factors.
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {classBData.map((item, idx) => (
                  <Chip 
                    key={idx}
                    label={`${item.name}: ${item.rate.toFixed(2)}%`}
                    size="small"
                    sx={{ 
                      bgcolor: alpha(theme.palette.secondary.main, 0.1),
                      color: theme.palette.secondary.main
                    }}
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        <Divider sx={{ mb: 3 }} />
        
        <TableContainer sx={{ 
          maxHeight: 440,
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[1]
        }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Tranche</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Maturity Days</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Simple Annual Interest (%)</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Compound Interest for Period (%)</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Reinvest Simple Annual (%)</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Reinvest O/N Compound (%)</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Coupon Rate (%)</TableCell>
                <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Effective Coupon Rate (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.interest_rate_conversions.map((rate, index) => (
                <TableRow 
                  key={index}
                  sx={{ 
                    backgroundColor: rate.Tranche.includes('Class A') 
                      ? alpha(theme.palette.primary.main, 0.03)
                      : alpha(theme.palette.secondary.main, 0.03),
                    '&:hover': {
                      backgroundColor: rate.Tranche.includes('Class A') 
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
                          bgcolor: rate.Tranche.includes('Class A') 
                            ? theme.palette.primary.main 
                            : theme.palette.secondary.main,
                          mr: 1 
                        }} 
                      />
                      {rate.Tranche}
                    </Box>
                  </TableCell>
                  <TableCell>{rate['Maturity Days']}</TableCell>
                  <TableCell>{formatValue(rate['Simple Annual Interest (%)'])}</TableCell>
                  <TableCell>{formatValue(rate['Compound Interest for Period (%)'])}</TableCell>
                  <TableCell>{formatValue(rate['Reinvest Simple Annual (%)'])}</TableCell>
                  <TableCell>{formatValue(rate['Reinvest O/N Compound (%)'])}</TableCell>
                  <TableCell>
                    {rate.Tranche.includes('Class B') ? (
                      <Chip 
                        size="small" 
                        label={formatValue(rate['Coupon Rate (%)'])}
                        sx={{ 
                          bgcolor: alpha(theme.palette.secondary.main, 0.1),
                          color: theme.palette.secondary.main,
                          fontWeight: 500,
                          fontSize: '0.7rem'
                        }}
                      />
                    ) : (
                      formatValue(rate['Coupon Rate (%)'])
                    )}
                  </TableCell>
                  <TableCell>
                    {rate.Tranche.includes('Class B') ? (
                      <Chip 
                        size="small" 
                        label={formatValue(rate['Effective Coupon Rate (%)'])}
                        sx={{ 
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                          fontWeight: 500,
                          fontSize: '0.7rem'
                        }}
                      />
                    ) : (
                      formatValue(rate['Effective Coupon Rate (%)'])
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Only in development mode */}
      {/* Debug section removed as requested */}
    </Box>
  );
};

export default InterestRatesTable;