import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Divider,
  alpha,
  Chip,
  Stepper,
  Step,
  StepLabel,
  useTheme,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import OptimizationSettingsForm from '../components/optimization/OptimizationSettingsForm';
import OptimizationResults from '../components/optimization/OptimizationResults';
import OptimizationProgress from '../components/optimization/OptimizationProgress';
import { useData } from '../contexts/DataContext';
import { optimizeStructure } from '../services/apiService';

const OptimizationPage = () => {
  const theme = useTheme();
  const {
    cashFlowData,
    optimizationResults,
    setOptimizationResults,
    isLoading,
    setIsLoading,
    error,
    setError,
    optimizationSettings,
    setOptimizationSettings,
    generalSettings,
  } = useData();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const methodName = (m) =>
    ({ classic: 'Standard Optimization', genetic: 'Evolutionary Algorithm' }[m] ||
    m);

  /* --------------------- Form change -------------------- */
  const handleFormChange = (vals) => setOptimizationSettings(vals);

  /* --------------------- Optimize ----------------------- */
  const handleOptimize = async () => {
    if (!cashFlowData) return;

    try {
      setIsLoading(true);
      setError(null);
      setIsOptimizing(true);
      setOptimizationResults(null);
      setActiveStep(1);

      const method = optimizationSettings.optimization_method;
      console.log(`Starting ${method} optimization…`);

      const body = {
        optimization_settings: optimizationSettings,
        general_settings: {
          start_date: generalSettings.start_date.toISOString().split('T')[0],
          operational_expenses: generalSettings.operational_expenses,
          min_buffer: generalSettings.min_buffer,
        },
      };

      if (method === 'classic' && optimizationSettings.selected_strategies) {
        console.log(
          `Selected strategies: ${optimizationSettings.selected_strategies.join(', ')}`,
        );
      }

      const res = await optimizeStructure(body, method);
      console.log('Optimization successful:', res);
      setOptimizationResults(res);
      setActiveStep(2);
    } catch (e) {
      setError(
        `Optimization failed. Please check your parameters and try again. Error: ${e.message}`,
      );
      console.error('Optimization error:', e);
      setIsOptimizing(false);
      setActiveStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimizationComplete = () => setIsOptimizing(false);

  const handleReset = () => {
    setOptimizationResults(null);
    setIsOptimizing(false);
    setActiveStep(0);
    setError(null);
    window.scrollTo(0, 0);
  };

  /* progress to results */
  useEffect(() => {
    if (optimizationResults && !isOptimizing) setActiveStep(2);
  }, [optimizationResults, isOptimizing]);

  /* ----------------------- RENDER ----------------------- */
  if (!cashFlowData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 6, mb: 8 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            backgroundColor: alpha(theme.palette.warning.main, 0.05),
          }}
        >
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.warning.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <SpeedIcon
              sx={{ fontSize: 32, color: theme.palette.warning.main }}
            />
          </Box>
          <Typography variant="h5" color="warning.main" gutterBottom>
            Cash Flow Data Required
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please upload your cash‑flow data on the Home page before starting
            the optimization process.
          </Typography>
          <Button variant="outlined" color="warning" href="/" sx={{ mt: 3 }}>
            Go to Home Page
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ my: 4 }}>
      {/* ---------------- Header ---------------- */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.secondary.main,
            0.05,
          )} 0%, ${alpha(theme.palette.primary.main, 0.07)} 100%)`,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon
              sx={{ fontSize: 28, color: theme.palette.secondary.main, mr: 1.5 }}
            />
            <Typography variant="h4" fontWeight={500}>
              ABS Structure Optimization
            </Typography>
          </Box>

          {(activeStep > 0 || optimizationResults) && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={isLoading || isOptimizing}
              sx={{ fontWeight: 500 }}
            >
              Start Over
            </Button>
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          Optimize your asset‑backed‑securities structure to maximise principal
          while maintaining buffer requirements.
        </Typography>
      </Paper>

      {/* ---------------- Alerts ---------------- */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* ---------------- Stepper ---------------- */}
      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {['Configure Settings', 'Run Optimization', 'Review Results'].map(
            (label) => (
              <Step key={label}>
                <StepLabel
                  StepIconProps={{
                    sx: { '& .MuiStepIcon-text': { fontWeight: 'bold' } },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ),
          )}
        </Stepper>
      </Box>

      {/* ------------- Progress Component -------- */}
      {isOptimizing && (
        <OptimizationProgress
          isOptimizing={isOptimizing}
          onComplete={handleOptimizationComplete}
        />
      )}

      {/* ------------- Settings Form ------------- */}
      {(activeStep === 0 || (!isOptimizing && !optimizationResults)) && (
        <Paper
          elevation={0}
          sx={{
            p: 0,
            mb: 4,
            overflow: 'hidden',
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
            }}
          >
            <SettingsIcon sx={{ color: 'text.secondary', mr: 1.5 }} />
            <Typography variant="h6" fontWeight="medium">
              Optimization Settings
            </Typography>

            <Chip
              label={methodName(optimizationSettings.optimization_method)}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ ml: 'auto' }}
            />
          </Box>

          <Box sx={{ p: 3 }}>
            <OptimizationSettingsForm
              values={optimizationSettings}
              onChange={handleFormChange}
            />
          </Box>

          <Divider />

          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleOptimize}
              disabled={isLoading || isOptimizing}
              startIcon={
                isLoading || isOptimizing ? (
                  <CircularProgress size={20} />
                ) : (
                  <PlayArrowIcon />
                )
              }
              sx={{ py: 1.2, px: 4, borderRadius: 2, fontWeight: 500 }}
            >
              {isLoading || isOptimizing ? 'Optimizing…' : 'Run Optimization'}
            </Button>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2 }}
            >
              This may take several minutes depending on data size and
              parameters.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* ------------- Results -------------------- */}
      {optimizationResults && !isOptimizing && (
        <OptimizationResults results={optimizationResults} />
      )}
    </Container>
  );
};

export default OptimizationPage;
