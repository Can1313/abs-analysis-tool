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
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const InterestRatesTable = ({ results }) => {
  const theme = useTheme();
  
  // Format value function (handles '-' or number)
  const formatValue = (value) => {
    if (value === '-') return value;
    return `${parseFloat(value).toFixed(2)}%`;
  };

  // Prepare data for rates chart
  const chartData = results.interest_rate_conversions
    .filter(rate => rate.Tranche.includes('Class A'))
    .map(rate => ({
      name: rate.Tranche,
      rate: rate['Simple Annual Interest (%)'] === '-' ? 0 : rate['Simple Annual Interest (%)'],
    }))
    .concat(
      results.interest_rate_conversions
        .filter(rate => rate.Tranche.includes('Class B'))
        .map(rate => ({
          name: rate.Tranche,
          rate: rate['Effective Coupon Rate (%)'] === '-' ? 0 : rate['Effective Coupon Rate (%)'],
        }))
    );

  return (
    <Box>
      {/* Class B Coupon Information */}
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
        
        <TableContainer sx={{ 
          backgroundColor: 'background.paper', 
          borderRadius: 1,
          boxShadow: `0 1px 3px ${alpha('#000', 0.08)}`
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
                    <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {`Maturity: ${rate['Maturity Days']} days`}
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>

        {/* Helper component to explain the rates */}
        <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            About Coupon Rates
          </Typography>
          <Typography variant="body2">
            <strong>Direct Coupon Rate:</strong> The simple percentage of coupon payment relative to principal (non-annualized).
          </Typography>
          <Typography variant="body2">
            <strong>Effective Coupon Rate:</strong> The annualized coupon rate, calculated as direct rate × (365 ÷ maturity days).
          </Typography>
        </Box>

        {/* Debug information in development mode */}
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption">Debug Information:</Typography>
            <pre style={{ fontSize: '0.7rem', overflowX: 'auto' }}>
              {JSON.stringify(results.interest_rate_conversions
                .filter(rate => rate.Tranche.includes('Class B')), null, 2)}
            </pre>
          </Box>
        )}
      </Paper>
      
      {/* Interest Rates Chart */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          borderRadius: 2
        }}
      >
        <Typography variant="h6" gutterBottom fontWeight="medium">
          Interest Rates by Tranche
        </Typography>
        
        <Box sx={{ height: 400, mt: 3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
              <XAxis dataKey="name" />
              <YAxis unit="%" />
              <Tooltip 
                formatter={(value) => `${value.toFixed(2)}%`}
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              />
              <Legend />
              <Bar 
                dataKey="rate" 
                name="Rate" 
                fill={theme.palette.primary.main}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      
      {/* Interest Rate Conversions Table */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          borderRadius: 2
        }}
      >
        <Typography variant="h6" gutterBottom fontWeight="medium">
          Interest Rate Conversions
        </Typography>
        
        <TableContainer sx={{ 
          maxHeight: 440, 
          mt: 2,
          borderRadius: 1,
          boxShadow: `0 1px 3px ${alpha('#000', 0.08)}`
        }}>
          <Table stickyHeader>
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
                  <TableCell>{formatValue(rate['Coupon Rate (%)'])}</TableCell>
                  <TableCell>{formatValue(rate['Effective Coupon Rate (%)'])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default InterestRatesTable;