// src/components/calculation/ClassBCouponAdjuster.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Paper, 
  Button, 
  CircularProgress,
  Alert,
  Divider,
  Chip,
  useTheme,
  alpha,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import TargetIcon from '@mui/icons-material/TrackChanges';
import TuneIcon from '@mui/icons-material/Tune';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useData } from '../../contexts/DataContext';
import { calculateResults } from '../../services/apiService';

const ClassBCouponAdjuster = () => {
  const theme = useTheme();
  const { 
    trancheB, 
    setTrancheB, 
    calculationResults, 
    setCalculationResults, 
    createCalculationRequest, 
    isLoading, 
    setIsLoading, 
    setError
  } = useData();
  
  const [targetRate, setTargetRate] = useState(42.0);
  const [currentRate, setCurrentRate] = useState(0);
  const [currentDirectRate, setCurrentDirectRate] = useState(0);
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);
  const [adjustmentMessage, setAdjustmentMessage] = useState('');
  const [adjustmentSuccess, setAdjustmentSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Initialize from calculation results
  useEffect(() => {
    if (calculationResults) {
      // Find Class B tranche in interest_rate_conversions
      const classBTranche = calculationResults.interest_rate_conversions?.find(
        rate => rate.Tranche.includes('Class B')
      );
      
      if (classBTranche) {
        const effectiveRate = 
          classBTranche['Effective Coupon Rate (%)'] === '-' 
            ? 0 
            : parseFloat(classBTranche['Effective Coupon Rate (%)']);
            
        const directRate = 
          classBTranche['Coupon Rate (%)'] === '-' 
            ? 0 
            : parseFloat(classBTranche['Coupon Rate (%)']);
        
        setCurrentRate(effectiveRate);
        setCurrentDirectRate(directRate);
        
        // Initialize target rate to 42.0 (or another default)
        if (targetRate === 0) {
          setTargetRate(42.0);
        }
      }
    }
  }, [calculationResults]);
  
  // Manual adjustment with 1M increments
  const adjustNominal = async (direction) => {
    // Get current nominal
    const currentNominal = trancheB.nominal || 0;
    
    // Determine adjustment amount - changed to 1 million
    const increaseAmount = 1000000; // 1 million increase
    
    // Calculate new nominal
    let newNominal;
    if (direction === 'increase') {
      // Increase nominal to decrease rate
      newNominal = currentNominal + increaseAmount;
    } else {
      // Decrease nominal to increase rate
      newNominal = Math.max(1000000, currentNominal - increaseAmount);
    }
    
    // Update state
    setAdjustmentMessage(`Adjusting nominal to ${newNominal.toLocaleString()}...`);
    
    // Create updated tranche
    const updatedTrancheB = {
      ...trancheB,
      nominal: newNominal
    };
    
    // Update tranche B
    setTrancheB(updatedTrancheB);
    
    // Recalculate
    try {
      setIsLoading(true);
      
      // Create request
      const request = createCalculationRequest();
      
      // Calculate results
      const result = await calculateResults(request);
      
      // Update results
      setCalculationResults(result);
      
      // Extract new rates
      const classBTranche = result.interest_rate_conversions?.find(
        rate => rate.Tranche.includes('Class B')
      );
      
      if (classBTranche) {
        const newEffectiveRate = 
          classBTranche['Effective Coupon Rate (%)'] === '-' 
            ? 0 
            : parseFloat(classBTranche['Effective Coupon Rate (%)']);
            
        const newDirectRate = 
          classBTranche['Coupon Rate (%)'] === '-' 
            ? 0 
            : parseFloat(classBTranche['Coupon Rate (%)']);
        
        // Update state
        setCurrentRate(newEffectiveRate);
        setCurrentDirectRate(newDirectRate);
        
        // Check if we're close to target
        const diff = Math.abs(newEffectiveRate - targetRate);
        const isClose = diff <= 0.5; // Within 0.5%
        
        // Set message
        setAdjustmentMessage(
          isClose 
            ? `Target rate achieved! Current rate: ${newEffectiveRate.toFixed(2)}% (target: ${targetRate.toFixed(2)}%)`
            : `New effective rate: ${newEffectiveRate.toFixed(2)}% (target: ${targetRate.toFixed(2)}%). Continue adjusting.`
        );
        
        setAdjustmentSuccess(isClose);
        
        // Add to history
        setAdjustmentHistory(prev => [
          ...prev,
          {
            nominal: newNominal,
            effectiveRate: newEffectiveRate,
            directRate: newDirectRate,
            difference: diff
          }
        ]);
        
        // Give suggestion for next step
        if (newEffectiveRate > targetRate) {
          setAdjustmentMessage(prev => `${prev} Try increasing nominal to lower the rate.`);
        } else if (newEffectiveRate < targetRate) {
          setAdjustmentMessage(prev => `${prev} Try decreasing nominal to increase the rate.`);
        }
      }
    } catch (error) {
      console.error("Error calculating with new nominal:", error);
      setAdjustmentMessage(`Error: ${error.message}`);
      setError(`Calculation error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatNominal = (nominal) => {
    return new Intl.NumberFormat('tr-TR').format(nominal);
  };
  
  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3,
        border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
        backgroundColor: alpha(theme.palette.secondary.main, 0.03)
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TargetIcon sx={{ color: theme.palette.secondary.main, mr: 1 }} />
        <Typography variant="h6" color="secondary.main" fontWeight="medium">
          Class B Coupon Rate Adjuster
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Fine-tune the Class B nominal amount to achieve your target effective coupon rate.
        Use the buttons below to adjust in 1 million increments.
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 4, 
        alignItems: 'center',
        mb: 3
      }}>
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Current Effective Coupon Rate
          </Typography>
          <Typography variant="h5" color={
            Math.abs(currentRate - targetRate) <= 0.5 ? 'success.main' : 'text.primary'
          }>
            {currentRate.toFixed(2)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Direct Coupon Rate: {currentDirectRate.toFixed(2)}%
          </Typography>
        </Box>
        
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Target Effective Coupon Rate
          </Typography>
          <TextField
            size="small"
            value={targetRate}
            onChange={(e) => setTargetRate(parseFloat(e.target.value) || 0)}
            InputProps={{
              endAdornment: '%',
              inputProps: { min: 0, step: 0.1 }
            }}
            disabled={isLoading}
            type="number"
          />
        </Box>
        
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Current Class B Nominal
          </Typography>
          <Typography variant="h5">
            {formatNominal(trancheB.nominal || 0)}
          </Typography>
        </Box>
      </Box>
      
      {adjustmentMessage && (
        <Alert 
          severity={adjustmentSuccess ? "success" : "info"} 
          sx={{ mb: 3 }}
        >
          {adjustmentMessage}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => adjustNominal('increase')}
          disabled={isLoading}
          startIcon={<ExpandMoreIcon />}
        >
          Increase Nominal (+1M) → Lower Rate
        </Button>
        
        <Button
          variant="contained"
          color="error"
          onClick={() => adjustNominal('decrease')}
          disabled={isLoading}
          startIcon={<ExpandLessIcon />}
        >
          Decrease Nominal (-1M) → Higher Rate
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide' : 'Show'} Adjustment History
        </Button>
      </Box>
      
      {/* Quick reference */}
      <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.info.main, 0.05), mb: 3, border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
        <Typography variant="subtitle2" gutterBottom color="info.main">Quick Reference:</Typography>
        <Typography variant="body2">
          • To <strong>decrease</strong> the effective coupon rate: <strong>increase</strong> the nominal amount<br />
          • To <strong>increase</strong> the effective coupon rate: <strong>decrease</strong> the nominal amount
        </Typography>
      </Paper>
      
      {showHistory && adjustmentHistory.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TuneIcon sx={{ mr: 1, fontSize: 20 }} />
              Adjustment History
            </Typography>
            
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell align="right">Nominal</TableCell>
                    <TableCell align="right">Effective Rate</TableCell>
                    <TableCell align="right">Direct Rate</TableCell>
                    <TableCell align="right">Difference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adjustmentHistory.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell align="right">{formatNominal(entry.nominal)}</TableCell>
                      <TableCell align="right">{entry.effectiveRate.toFixed(2)}%</TableCell>
                      <TableCell align="right">{entry.directRate.toFixed(2)}%</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${entry.difference.toFixed(2)}%`}
                          color={entry.difference <= 0.5 ? "success" : "default"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default ClassBCouponAdjuster;