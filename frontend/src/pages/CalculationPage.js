import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import CompareIcon from '@mui/icons-material/Compare';
import ReplayIcon from '@mui/icons-material/Replay';

import { useData } from '../contexts/DataContext';
import { calculateResults } from '../services/apiService';

import GeneralSettingsForm from '../components/calculation/GeneralSettingsForm';
import TrancheAForm from '../components/calculation/TrancheAForm';
import TrancheBForm from '../components/calculation/TrancheBForm';
import ClassBCouponAdjuster from '../components/calculation/ClassBCouponAdjuster';
import CalculationResults from './CalculationResults';
import InterestRatesTable from '../components/calculation/InterestRatesTable';

import { useNavigate } from 'react-router-dom';

const CalculationPage = () => {
  const navigate = useNavigate();
  const {
    cashFlowData,
    calculationResults,
    setCalculationResults,
    isLoading,
    setIsLoading,
    error,
    setError,
    createCalculationRequest,
    previousCalculationResults,
    resetToDefaults,
    multipleComparisonResults,
    setMultipleComparisonResults,
  } = useData();

  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [optimizationData, setOptimizationData] = useState(null);

  /* ------------- Auto‑calculate after optimization ------------- */
  useEffect(() => {
    const stored = sessionStorage.getItem('optimizationData');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOptimizationData(parsed);
        handleCalculate(parsed); // pass optimization data
      } catch (e) {
        console.error('Cannot parse optimizationData:', e);
      } finally {
        sessionStorage.removeItem('optimizationData');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------- Handlers ---------------------- */
  const handleTabChange = (_, nv) => setTabValue(nv);

  const handleCalculate = async (optData = optimizationData) => {
    try {
      setIsLoading(true);
      setError(null);

      const req = createCalculationRequest();

      /* pass optimization meta (optional) */
      if (optData) {
        req.is_optimized = true;
        req.optimization_method = optData.optimization_method;
      }

      console.log('Calculation request:', req);

      const res = await calculateResults(req, optData); // 2. parametre opsiyonel!
      console.log('Calculation response:', res);

      /* label & metadata */
      if (!res.is_optimized) {
        res.label = 'Manual Calculation';
        res.method_type = 'manual';
      } else {
        const map = {
          classic: 'Standard Optimization',
          genetic: 'Evolutionary Algorithm',
          equal: 'Equal Distribution',
          increasing: 'Increasing by Maturity',
          decreasing: 'Decreasing by Maturity',
          middle_weighted: 'Middle Weighted',
        };
        const mName = res.optimization_method || 'optimized';
        res.label = `${map[mName] || mName} Optimization`;
        res.method_type = mName === 'genetic' ? 'genetic' : 'standard';
      }
      res.timestamp = new Date().toISOString();

      setCalculationResults(res);
      setTabValue(1);

      /* comparison buffer (max 5) */
      setMultipleComparisonResults((prev) => {
        const up = prev ? [...prev] : [];
        const idx = up.findIndex((r) => r.method_type === res.method_type);
        if (idx >= 0) up[idx] = { ...res };
        else {
          if (up.length >= 5) up.shift();
          up.push({ ...res });
        }
        return up;
      });

      setSnackbar({
        open: true,
        message: 'Calculation completed successfully!',
        severity: 'success',
      });
    } catch (e) {
      setError('Calculation failed. Please check parameters and try again.');
      console.error(e);
      setSnackbar({
        open: true,
        message: 'Calculation failed. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goToComparison = () => navigate('/comparison');

  const handleReset = () => {
    if (resetToDefaults()) {
      setSnackbar({
        open: true,
        message: 'Reset to original values.',
        severity: 'success',
      });
    }
  };

  const handleSnackClose = (_, r) => {
    if (r === 'clickaway') return;
    setSnackbar((s) => ({ ...s, open: false }));
  };

  /* -------------------- RENDER -------------------- */
  if (!cashFlowData) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            Please upload cash‑flow data first
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">ABS Calculation</Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {calculationResults && previousCalculationResults && (
            <Button
              variant="outlined"
              color="primary"
              onClick={goToComparison}
              startIcon={<CompareIcon />}
            >
              View Comparisons
            </Button>
          )}

          <Tooltip title="Reset to original values">
            <IconButton color="primary" onClick={handleReset} size="small">
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Input Parameters" />
            <Tab label="Results" disabled={!calculationResults} />
            <Tab label="Interest Rates" disabled={!calculationResults} />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <>
              <GeneralSettingsForm />
              <TrancheAForm />
              <TrancheBForm />
              
              {/* Add the new ClassBCouponAdjuster component */}
              {calculationResults && <ClassBCouponAdjuster />}

              <Divider sx={{ my: 3 }} />

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => handleCalculate()}
                  disabled={isLoading}
                  startIcon={
                    isLoading ? <CircularProgress size={24} /> : <CalculateIcon />
                  }
                >
                  {isLoading ? 'Calculating…' : 'Calculate Results'}
                </Button>

                {calculationResults && previousCalculationResults && (
                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    onClick={goToComparison}
                    startIcon={<CompareIcon />}
                  >
                    Compare Results
                  </Button>
                )}
              </Box>
            </>
          )}

          {tabValue === 1 && calculationResults && (
            <CalculationResults results={calculationResults} />
          )}

          {tabValue === 2 && calculationResults && (
            <InterestRatesTable results={calculationResults} />
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default CalculationPage;