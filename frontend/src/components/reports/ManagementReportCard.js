// src/components/reports/ManagementReportCard.js
import {
    ArrowBack,
    CloudDownload,
    DescriptionOutlined,
    HelpOutline,
  } from "@mui/icons-material";
  import {
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    Typography,
    alpha,
    useTheme,
    Snackbar,
    Alert,
  } from "@mui/material";
  import React, { useState } from "react";
  
  const reportTypeOptions = [
    {
      id: "executive",
      label: "Executive Summary",
      description: "High-level overview for executive team",
    },
    {
      id: "detailed",
      label: "Detailed Analysis",
      description: "Comprehensive analysis with detailed metrics",
    },
    {
      id: "risk",
      label: "Risk Assessment",
      description: "Focus on risk factors and stress testing",
    },
  ];
  
  // Mock data for cash flows
  const mockCashFlows = [
    { method_code: "cf001", name: "Cash Flow 1" },
    { method_code: "cf002", name: "Cash Flow 2" },
    { method_code: "cf003", name: "Cash Flow 3" },
  ];
  
  const ManagementReportCard = ({ onBack, category }) => {
    const theme = useTheme();
  
    // Component state
    const [selectedCashFlow, setSelectedCashFlow] = useState("");
    const [selectedReportType, setSelectedReportType] = useState("");
    const [includeCharts, setIncludeCharts] = useState(true);
    const [includeTables, setIncludeTables] = useState(true);
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
  
    // Handle report type selection
    const handleReportTypeChange = (event) => {
      setSelectedReportType(event.target.value);
      if (formErrors.reportType) {
        setFormErrors({ ...formErrors, reportType: "" });
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
      if (!selectedReportType) {
        errors.reportType = "Please select a report type";
      }
  
      // If there are errors, update state and return
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
  
      // This is a placeholder - in a real implementation, we would dispatch an action to download the report
      showSnackbar(
        `Feature in development: Management ${selectedReportType} report for ${selectedCashFlow} will be available soon.`,
        "info"
      );
    };
  
    // Get the selected report type object for display
    const selectedReportTypeObj = reportTypeOptions.find(
      (type) => type.id === selectedReportType
    );
  
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
              <DescriptionOutlined
                sx={{
                  mr: 2,
                  color: category.color,
                  fontSize: 28,
                }}
              />
              <Typography variant="h5" component="h2" fontWeight="500">
                Management Reports
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
              Generate customized management reports with in-depth analysis and
              decision-support metrics.
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
  
              {/* Report Type Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.reportType}>
                  <InputLabel id="report-type-select-label">
                    Report Type
                  </InputLabel>
                  <Select
                    labelId="report-type-select-label"
                    id="report-type-select"
                    value={selectedReportType}
                    label="Report Type"
                    onChange={handleReportTypeChange}
                  >
                    {reportTypeOptions.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.reportType && (
                    <FormHelperText>{formErrors.reportType}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            </Grid>
  
            {/* Report Options */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Report Options
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <FormGroup>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={includeCharts}
                            onChange={(e) => setIncludeCharts(e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Include Charts & Visualizations"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={includeTables}
                            onChange={(e) => setIncludeTables(e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Include Data Tables"
                      />
                    </Grid>
                  </Grid>
                </FormGroup>
              </Paper>
            </Box>
  
            {/* Selected Report Type Description */}
            {selectedReportTypeObj && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: alpha(category.color, 0.1),
                  border: `1px solid ${alpha(category.color, 0.2)}`,
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                <HelpOutline sx={{ mr: 1, color: category.color, mt: 0.5 }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ color: category.color }}>
                    {selectedReportTypeObj.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedReportTypeObj.description}
                  </Typography>
                </Box>
              </Box>
            )}
  
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
                Generate Management Report
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
            <Typography variant="h6" sx={{ mb: 2 }}>
              Available Report Types
            </Typography>
  
            <Box sx={{ mb: 3 }}>
              {reportTypeOptions.map((type, index) => (
                <React.Fragment key={type.id}>
                  <Box sx={{ display: "flex", py: 1.5 }}>
                    <Box sx={{ minWidth: 120 }}>
                      <Chip
                        label={type.label}
                        size="small"
                        sx={{
                          bgcolor: alpha(category.color, 0.1),
                          color: category.color,
                          fontWeight: 500,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Box>
                  {index < reportTypeOptions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Box>
  
            <Typography variant="body2" color="text.secondary">
              Management reports provide customized analysis for internal
              decision-making, strategy development, and performance assessment.
              These reports can be tailored to specific needs with various
              visualization options and data granularity levels.
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
  
  export default ManagementReportCard;