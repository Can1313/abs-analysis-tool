// src/components/reports/InvestorReportCard.js
import {
    ArrowBack,
    CloudDownload,
    InfoOutlined,
    PieChartOutline,
  } from "@mui/icons-material";
  import {
    Box,
    Button,
    FormControl,
    FormHelperText,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Typography,
    alpha,
    useTheme,
    Snackbar,
    Alert,
  } from "@mui/material";
  import React, { useState } from "react";
  
  const reportPeriodOptions = [
    { id: "monthly", label: "Monthly Report" },
    { id: "quarterly", label: "Quarterly Report" },
    { id: "annual", label: "Annual Report" },
  ];
  
  // Mock data for cash flows
  const mockCashFlows = [
    { method_code: "cf001", name: "Cash Flow 1" },
    { method_code: "cf002", name: "Cash Flow 2" },
    { method_code: "cf003", name: "Cash Flow 3" },
  ];
  
  const InvestorReportCard = ({ onBack, category }) => {
    const theme = useTheme();
  
    // Component state
    const [selectedCashFlow, setSelectedCashFlow] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [cashFlows, setCashFlows] = useState(mockCashFlows);
    const [snackbar, setSnackbar] = useState({
      open: false,
      message: "",
      severity: "info",
    });
  
    // Simulate fetch cash flows on component mount
    React.useEffect(() => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setCashFlows(mockCashFlows);
        setLoading(false);
      }, 500);
    }, []);
  
    // Handle cash flow selection
    const handleCashFlowChange = (event) => {
      setSelectedCashFlow(event.target.value);
      if (formErrors.cashFlow) {
        setFormErrors({ ...formErrors, cashFlow: "" });
      }
    };
  
    // Handle period selection
    const handlePeriodChange = (event) => {
      setSelectedPeriod(event.target.value);
      if (formErrors.period) {
        setFormErrors({ ...formErrors, period: "" });
      }
    };
  
    // Handle snackbar close
    const handleSnackbarClose = () => {
      setSnackbar({ ...snackbar, open: false });
    };
  
    // Show snackbar
    const showSnackbar = (message, severity = "info") => {
      setSnackbar({
        open: true,
        message,
        severity,
      });
    };
  
    // Handle form submission (download report)
    const handleDownloadReport = () => {
      // Validate form
      const errors = {};
      if (!selectedCashFlow) {
        errors.cashFlow = "Please select a cash flow";
      }
      if (!selectedPeriod) {
        errors.period = "Please select a reporting period";
      }
  
      // If there are errors, update state and return
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
  
      // This is a placeholder - in a real implementation, we would dispatch an action to download the report
      showSnackbar(
        `Feature in development: Investor ${selectedPeriod} report for ${selectedCashFlow} will be available soon.`,
        "info"
      );
    };
  
    return (
      <div style={{ opacity: 1, transition: 'opacity 0.3s' }}>
        <Box>
          {/* Header with back button */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={onBack}
              style={{
                color: category.color,
                borderColor: category.color,
                marginRight: 16,
              }}
            >
              Back
            </Button>
  
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <PieChartOutline
                sx={{
                  mr: 2,
                  color: category.color,
                  fontSize: 28,
                }}
              />
              <Typography variant="h5" component="h2" fontWeight="500">
                Investor Reports
              </Typography>
            </Box>
          </Box>
  
          {/* Form Area */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              mb: 3,
              border: `1px solid ${alpha(category.color, 0.2)}`,
              bgcolor: alpha(category.color, 0.03),
            }}
          >
            <Typography variant="body1" paragraph>
              Generate comprehensive investor reports with key performance metrics
              and tranche analytics.
            </Typography>
  
            <Grid container spacing={3}>
              {/* Cash Flow Selection */}
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  error={!!formErrors.cashFlow}
                  disabled={loading}
                >
                  <InputLabel id="cash-flow-select-label">Cash Flow</InputLabel>
                  <Select
                    labelId="cash-flow-select-label"
                    id="cash-flow-select"
                    value={selectedCashFlow}
                    label="Cash Flow"
                    onChange={handleCashFlowChange}
                  >
                    {loading ? (
                      <MenuItem disabled>Loading cash flows...</MenuItem>
                    ) : cashFlows.length === 0 ? (
                      <MenuItem disabled>No cash flows available</MenuItem>
                    ) : (
                      cashFlows.map((cf) => (
                        <MenuItem key={cf.method_code} value={cf.method_code}>
                          {cf.name || cf.method_code}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {formErrors.cashFlow && (
                    <FormHelperText>{formErrors.cashFlow}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
  
              {/* Report Period Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.period}>
                  <InputLabel id="period-select-label">
                    Reporting Period
                  </InputLabel>
                  <Select
                    labelId="period-select-label"
                    id="period-select"
                    value={selectedPeriod}
                    label="Reporting Period"
                    onChange={handlePeriodChange}
                  >
                    {reportPeriodOptions.map((period) => (
                      <MenuItem key={period.id} value={period.id}>
                        {period.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.period && (
                    <FormHelperText>{formErrors.period}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            </Grid>
  
            {/* Download Button */}
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<CloudDownload />}
                onClick={handleDownloadReport}
                disabled={loading}
                sx={{
                  bgcolor: category.color,
                  color: "#fff",
                  px: 4,
                  py: 1.5,
                  "&:hover": {
                    bgcolor: alpha(category.color, 0.8),
                  },
                }}
              >
                Generate Investor Report
              </Button>
            </Box>
          </Paper>
  
          {/* Information Section */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
              <InfoOutlined sx={{ mr: 1, color: theme.palette.info.main, mt: 0.5 }} />
              <Typography variant="subtitle1">About Investor Reports</Typography>
            </Box>
  
            <Typography variant="body2" color="text.secondary" paragraph>
              Investor reports provide comprehensive information on ABS
              performance, tranche distributions, and key metrics for investors to
              assess their investments.
            </Typography>
  
            <Typography variant="body2" color="text.secondary" paragraph>
              These reports include key performance indicators, cash flow
              allocations, payment distributions, and relevant risk metrics across
              different time periods.
            </Typography>
  
            <Typography variant="body2" color="text.secondary">
              Reporting periods can be adjusted to match investor communication
              requirements and internal portfolio review schedules.
            </Typography>
          </Paper>
        </Box>
  
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    );
  };
  
  export default InvestorReportCard;