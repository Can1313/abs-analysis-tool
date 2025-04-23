// src/components/calculation/CalculationResults.js
import React from "react";
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
  useTheme
} from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

const CalculationResults = ({ results }) => {
  const theme = useTheme();
  
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
    if (value === undefined || value === null) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  };
  
  // Format percentage values with null check
  const formatPercent = (value) => {
    if (value === undefined || value === null) return "0.00%";
    return `${value.toFixed(2)}%`;
  };

  // Extract color values from theme
  const seniorColor = theme.palette.primary.main;
  const subordinatedColor = theme.palette.secondary.main;
  
  // Prepare data for tranche comparison chart
  const chartData = [
    {
      name: "Senior",
      principal: results.class_a_principal || 0,
      interest: results.class_a_interest || 0,
      total: results.class_a_total || 0,
    },
    {
      name: "Subordinated",
      principal: results.class_b_principal || 0,
      coupon: results.class_b_coupon || 0,
      total: results.class_b_total || 0,
    },
  ];

  // Calculate totals with null checks
  const totalSenior = results.class_a_total || 0;
  const totalSubordinated = results.class_b_total || 0;
  const totalAll = totalSenior + totalSubordinated;
  
  // Check if minimum buffer requirement is met
  const minBufferTarget = 5.0;
  const isBufferMet = (results.min_buffer_actual || 0) >= minBufferTarget;

  return (
    <Box>
      {/* Summary Section */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          backgroundColor: alpha(theme.palette.primary.main, 0.03)
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ReceiptLongIcon sx={{ fontSize: 24, color: theme.palette.primary.main, mr: 1.5 }} />
          <Typography variant="h6" color="primary.main" gutterBottom fontWeight="medium">
            Securitization Results Summary
          </Typography>
        </Box>
        
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mt: 2 }}>
          <Box sx={{ 
            flex: "1 0 300px", 
            bgcolor: 'background.paper', 
            p: 2, 
            borderRadius: 1,
            boxShadow: `0 1px 3px ${alpha('#000', 0.08)}`
          }}>
            <Typography variant="subtitle1" gutterBottom color="text.secondary">
              Payment Totals
            </Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ pl: 0, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>Senior Total</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>{formatCurrency(totalSenior)}</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                      <Chip 
                        size="small" 
                        label={formatPercent(totalAll > 0 ? (totalSenior / totalAll * 100) : 0)}
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
                    <TableCell sx={{ pl: 0, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>Subordinated Total</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>{formatCurrency(totalSubordinated)}</TableCell>
                    <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                      <Chip 
                        size="small" 
                        label={formatPercent(totalAll > 0 ? (totalSubordinated / totalAll * 100) : 0)}
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
            borderRadius: 1,
            boxShadow: `0 1px 3px ${alpha('#000', 0.08)}`
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
                            bgcolor: seniorColor,
                            mr: 1 
                          }} 
                        />
                        Senior
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
                            bgcolor: subordinatedColor,
                            mr: 1 
                          }} 
                        />
                        Subordinated
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
          borderRadius: 1
        }}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Minimum Credit Enhancement Requirement
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {formatPercent(minBufferTarget)}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Actual Credit Enhancement (Senior)
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
      
      {/* Financing Cost Analysis */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          backgroundColor: alpha(theme.palette.info.main, 0.03)
        }}
      >
        <Typography variant="h6" color="info.main" gutterBottom fontWeight="medium">
          Financing Cost Analysis
        </Typography>
        
        <TableContainer sx={{ 
          mt: 2,
          bgcolor: 'background.paper', 
          borderRadius: 1,
          boxShadow: `0 1px 3px ${alpha('#000', 0.08)}`
        }}>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell sx={{ pl: 2, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>Total Principal Paid to Originator:</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, pr: 2, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                  {formatCurrency(results.total_principal_paid)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ pl: 2, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>Total Receivables Principal:</TableCell>
                <TableCell align="right" sx={{ pr: 2, borderBottom: `1px solid ${alpha('#000', 0.08)}` }}>
                  {formatCurrency(results.total_loan_principal)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ pl: 2, fontWeight: 600 }}>
                  Financing {(results.financing_cost || 0) > 0 ? "Profit" : "Loss"}:
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
      </Paper>
      
      {/* Tranche Results Chart */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          backgroundColor: 'background.paper'
        }}
      >
        <Typography variant="h6" gutterBottom fontWeight="medium">
          Tranche Comparison
        </Typography>
        
        <Box sx={{ height: 400, mt: 3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.07)} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
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
                fill={theme.palette.primary.light}
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="coupon" 
                name="Yield" 
                stackId="a" 
                fill={theme.palette.secondary.main}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      
      {/* Detailed Results Table */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          backgroundColor: 'background.paper'
        }}
      >
        <Typography variant="h6" gutterBottom fontWeight="medium">
          Detailed Tranche Results
        </Typography>
        
        {results.tranche_results && results.tranche_results.length > 0 ? (
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
                  <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Maturity Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Principal</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Interest / Yield</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Total Payment</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>Credit Enhancement (%)</TableCell>
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
                            bgcolor: tranche["Is Class A"] ? seniorColor : subordinatedColor,
                            mr: 1 
                          }} 
                        />
                        {tranche["Tranche"].replace("Class A", "Senior ").replace("Class B", "Subordinated ")}
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
  );
};

export default CalculationResults;