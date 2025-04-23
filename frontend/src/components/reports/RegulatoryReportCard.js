// src/components/reports/RegulatoryReportCard.js
import {
  ArrowBack,
  AssignmentOutlined,
  CloudDownload,
  InfoOutlined,
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
  Stack,
  Typography,
  Alert,
  alpha,
  useTheme,
  Snackbar,
  Select,
} from "@mui/material";
import React, { useState } from "react";

const reportTypeOptions = [
  {
    id: "spk",
    label: "SPK Report",
    description: "Banking Regulation & Supervision Agency Report",
  },
  {
    id: "bddk",
    label: "BDDK Report",
    description: "Capital Markets Board Regulatory Report",
  },
];

// Mock data for cash flows
const mockCashFlows = [
  { method_code: "cf001", name: "Cash Flow 1" },
  { method_code: "cf002", name: "Cash Flow 2" },
  { method_code: "cf003", name: "Cash Flow 3" },
];

const RegulatoryReportCard = ({ onBack, category }) => {
  const theme = useTheme();

  // Component state
  const [selectedCashFlow, setSelectedCashFlow] = useState("");
  const [selectedReportType, setSelectedReportType] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
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

  // Function to download PDF file
  const downloadPdf = () => {
    // Path to the PDF file in public folder
    const pdfUrl = "/assets/reports/Arzum BSS report.pdf";
    
    // Create a link element to trigger download
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = "Arzum BSS Report.pdf"; // Set the download filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

    // Simulate download
    setLoadingExport(true);
    setTimeout(() => {
      downloadPdf();
      setLoadingExport(false);
      showSnackbar(
        `Regulatory ${selectedReportType.toUpperCase()} report downloaded successfully`,
        "success"
      );
    }, 1500);
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
            <AssignmentOutlined
              sx={{
                mr: 2,
                color: category.color,
                fontSize: 28,
              }}
            />
            <Typography variant="h5" component="h2" fontWeight="500">
              Regulatory Reports
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
            Generate standardized regulatory reports for compliance submissions
            based on selected cash flow data.
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

          {/* Selected Report Type Description */}
          {selectedReportTypeObj && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.info.main, 0.07),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              <InfoOutlined sx={{ mr: 1, color: theme.palette.info.main }} />
              <Typography variant="body2" color="text.secondary">
                <strong>{selectedReportTypeObj.label}:</strong>{" "}
                {selectedReportTypeObj.description}
              </Typography>
            </Box>
          )}

          {/* Download Button */}
          <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudDownload />}
              onClick={handleDownloadReport}
              disabled={loading || loadingExport}
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
              {loadingExport ? "Generating Report..." : "Download Report"}
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
            About Regulatory Reports
          </Typography>

          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Regulatory reports provide standardized information to regulatory
              bodies in compliance with financial regulations and transparency
              requirements.
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>SPK Reports:</strong> Designed for Banking Regulation &
              Supervision Agency submissions, these reports focus on liquidity
              metrics, asset quality, and risk exposure.
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>BDDK Reports:</strong> Created for Capital Markets Board
              regulatory compliance, these reports emphasize investor protection
              metrics, pricing transparency, and market stability factors.
            </Typography>
          </Stack>
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

export default RegulatoryReportCard;