// src/components/receivables/ReceivablesDashboard.js
import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

// Static analysis data from the receivables file
const staticData = {
  "totalAmount": 249901428.52999964,
  "customerSummary": [
    {
      "name": "MEDIA MARKT",
      "fullName": "MEDIA MARKT TURKEY LTD",
      "amount": 84582455.81999995,
      "count": 657,
      "percentage": 33.84632745700618
    },
    {
      "name": "MIGROS",
      "fullName": "MIGROS TRADE INC",
      "amount": 72901705.11999997,
      "count": 140,
      "percentage": 29.17218422833002
    },
    {
      "name": "TEKNOSA",
      "fullName": "TEKNOSA DOMESTIC & FOREIGN TRADE INC",
      "amount": 67716613.89999999,
      "count": 16,
      "percentage": 27.0973296544685
    },
    {
      "name": "SOK MARKETS",
      "fullName": "SOK MARKETS TRADE INC",
      "amount": 21196966.36000001,
      "count": 240,
      "percentage": 8.482130928457417
    },
    {
      "name": "BIM",
      "fullName": "BIM UNITED STORES INC",
      "amount": 3503687.33,
      "count": 19,
      "percentage": 1.4020277317379948
    }
  ],
  "monthlyData": [
    {
      "name": "2025-4",
      "amount": 20622871.949999996,
      "count": 34
    },
    {
      "name": "2025-5",
      "amount": 5799954.800000002,
      "count": 33
    },
    {
      "name": "2025-6",
      "amount": 32786688.37000001,
      "count": 285
    },
    {
      "name": "2025-7",
      "amount": 73738076.94000004,
      "count": 220
    },
    {
      "name": "2025-8",
      "amount": 102611323.45999981,
      "count": 486
    },
    {
      "name": "2025-9",
      "amount": 14342513.010000002,
      "count": 14
    }
  ],
  "documentTypeSummary": [
    {
      "name": "RV",
      "fullName": "Receivable Voucher (Standard Invoices)",
      "amount": 249814616.51999962,
      "count": 1067,
      "percentage": 99.96526149909958
    },
    {
      "name": "AB",
      "fullName": "Adjustment Booking (Account Corrections)",
      "amount": 3912.88,
      "count": 1,
      "percentage": 0.0015657693607502826
    },
    {
      "name": "DG",
      "fullName": "Debit Generation (Additional Fees)",
      "amount": 82899.13,
      "count": 4,
      "percentage": 0.033172731539647164
    }
  ],
  "dueDateDistribution": [
    {
      "name": "Overdue",
      "count": 0,
      "amount": 0,
      "percentage": 0,
      "amountPercentage": 0
    },
    {
      "name": "0-30 days",
      "count": 45,
      "amount": 21236883.899999995,
      "percentage": 4.197761194029851,
      "amountPercentage": 8.4981042425096
    },
    {
      "name": "31-60 days",
      "count": 303,
      "amount": 37889732.09000001,
      "percentage": 28.264925373134332,
      "amountPercentage": 15.161870947629058
    },
    {
      "name": "61-90 days",
      "count": 11,
      "amount": 29529598.290000007,
      "percentage": 1.0261194029850746,
      "amountPercentage": 11.816498394468
    },
    {
      "name": "91+ days",
      "count": 713,
      "amount": 161245214.24999985,
      "percentage": 66.51119402985076,
      "amountPercentage": 64.52352641539343
    }
  ],
  "avgDueDate": 82.83208955223881
};

// Custom colors for charts
const COLORS = ['#4e7bea', '#9c27b0', '#f44336', '#ff9800', '#29b6f6', '#4caf50', '#ff5722', '#673ab7'];

const ReceivablesDashboard = () => {
  const theme = useTheme();
  
  // Format functions
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const formatMonth = (month) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <Box>
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(78, 123, 234, 0.1) 0%, rgba(14, 23, 42, 0) 100%)',
              borderLeft: `4px solid ${theme.palette.primary.main}`
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Receivables Amount
            </Typography>
            <Typography variant="h4" color="primary" gutterBottom>
              {formatCurrency(staticData.totalAmount)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(14, 23, 42, 0) 100%)',
              borderLeft: `4px solid ${theme.palette.secondary.main}`
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Average Remaining Maturity
            </Typography>
            <Typography variant="h4" color="secondary" gutterBottom>
              {Math.round(staticData.avgDueDate)} days
            </Typography>
            <Typography variant="caption" color="text.secondary">
              From April 28, 2025
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(14, 23, 42, 0) 100%)',
              borderLeft: `4px solid ${theme.palette.success.main}`
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Number of Customers
            </Typography>
            <Typography variant="h4" sx={{ color: theme.palette.success.main }} gutterBottom>
              {staticData.customerSummary.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Customer Distribution and Maturity Distribution */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Customer Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Customer Distribution (Top 5)
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={staticData.customerSummary}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    nameKey="name"
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    labelLine={false}
                  >
                    {staticData.customerSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staticData.customerSummary.map((customer, index) => (
                    <TableRow key={index}>
                      <TableCell component="th" scope="row">{customer.fullName}</TableCell>
                      <TableCell align="right">{formatCurrency(customer.amount)}</TableCell>
                      <TableCell align="right">{formatPercentage(customer.percentage)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Maturity Date Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Maturity Date Distribution
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={staticData.monthlyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickFormatter={formatMonth} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={formatMonth}
                  />
                  <Legend />
                  <Bar dataKey="amount" name="Amount" fill={theme.palette.primary.main} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Transaction Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staticData.monthlyData.map((month, index) => (
                    <TableRow key={index}>
                      <TableCell component="th" scope="row">{formatMonth(month.name)}</TableCell>
                      <TableCell align="right">{formatCurrency(month.amount)}</TableCell>
                      <TableCell align="right">{month.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Document Type and Maturity Period */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Document Type Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Document Type Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              RV: Receivable Voucher (Standard Invoices) | AB: Adjustment Booking (Account Corrections) | DG: Debit Generation (Additional Fees)
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Document Type</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Count</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Percentage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {staticData.documentTypeSummary.map((type, index) => (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row">{type.fullName || type.name}</TableCell>
                          <TableCell align="right">{type.count}</TableCell>
                          <TableCell align="right">{formatCurrency(type.amount)}</TableCell>
                          <TableCell align="right">
                            <Box display="flex" alignItems="center" justifyContent="flex-end">
                              <Box sx={{ 
                                width: `${Math.max(type.percentage * 0.8, 2)}%`, 
                                height: 16, 
                                backgroundColor: COLORS[index % COLORS.length],
                                borderRadius: 1,
                                mr: 1
                              }} />
                              {formatPercentage(type.percentage)}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ height: 200, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={staticData.documentTypeSummary}
                      margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip formatter={(value) => `${value.toFixed(4)}%`} />
                      <Legend />
                      <Bar dataKey="percentage" name="Percentage" fill={theme.palette.primary.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Maturity Period Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Maturity Period Distribution (as of April 28, 2025)
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={staticData.dueDateDistribution}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'amount' ? formatCurrency(value) : value,
                    name === 'amount' ? 'Amount' : 'Transaction Count'
                  ]} />
                  <Legend />
                  <Bar dataKey="amount" name="Amount" fill={theme.palette.primary.main} />
                  <Bar dataKey="count" name="Transaction Count" fill={theme.palette.secondary.main} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Remaining Maturity Range</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                    <TableCell align="right">Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staticData.dueDateDistribution.map((range, index) => (
                    <TableRow key={index}>
                      <TableCell component="th" scope="row">{range.name}</TableCell>
                      <TableCell align="right">{formatCurrency(range.amount)}</TableCell>
                      <TableCell align="right">{formatPercentage(range.amountPercentage)}</TableCell>
                      <TableCell align="right">{range.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Securitization Risk Analysis */}
      <Paper 
        sx={{ 
          p: 3,
          background: 'linear-gradient(180deg, rgba(14, 23, 42, 0.7) 0%, rgba(14, 23, 42, 0.9) 100%)',
          borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
          Securitization Risk Analysis
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper 
              sx={{ 
                p: 3, 
                bgcolor: theme.palette.background.default,
                borderLeft: `4px solid ${theme.palette.error.main}`
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Concentration Risk
              </Typography>
              <Typography variant="h5" color="error.main" gutterBottom>
                {formatPercentage(staticData.customerSummary[0]?.percentage || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Share of the largest customer in total receivables
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper 
              sx={{ 
                p: 3, 
                bgcolor: theme.palette.background.default,
                borderLeft: `4px solid ${theme.palette.primary.main}`
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Maturity Profile
              </Typography>
              <Typography variant="h5" color="primary.main" gutterBottom>
                {formatPercentage(staticData.dueDateDistribution.find(d => d.name === "91+ days")?.amountPercentage || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Portion of receivables with 91+ days maturity (from April 28, 2025)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper 
              sx={{ 
                p: 3, 
                bgcolor: theme.palette.background.default,
                borderLeft: `4px solid ${theme.palette.success.main}`
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Document Type Diversity
              </Typography>
              <Typography variant="h5" color="success.main" gutterBottom>
                {staticData.documentTypeSummary.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Number of different document types
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ReceivablesDashboard;