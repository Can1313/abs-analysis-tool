// src/components/reports/ReportsModule.js
import {
    ArrowForwardIos,
    Description,
    DocumentScanner,
    InsertDriveFile,
    NavigateNext,
    ReceiptLong,
  } from "@mui/icons-material";
  import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Typography,
    alpha,
    useTheme,
    Snackbar,
  } from "@mui/material";
  import React, { useEffect, useState } from "react";
  
  // Report card configuration
  const reportCards = [
    {
      id: "regulatory",
      title: "Regulatory Report",
      description: "Generate compliance reports for regulatory authorities",
      icon: <DocumentScanner />,
      color: "#1976d2", // Blue
      options: [
        { value: "spk", label: "SPK Report" },
        { value: "bddk", label: "BDDK Report" },
      ],
    },
    {
      id: "investor",
      title: "Investor Report",
      description: "Create detailed performance reports for investors",
      icon: <InsertDriveFile />,
      color: "#2e7d32", // Green
      options: [
        { value: "monthly", label: "Monthly Performance" },
        { value: "quarterly", label: "Quarterly Overview" },
      ],
    },
    {
      id: "management",
      title: "Management Report",
      description: "Comprehensive analytics for management decisions",
      icon: <ReceiptLong />,
      color: "#ed6c02", // Orange
      options: [
        { value: "executive", label: "Executive Summary" },
        { value: "financial", label: "Financial Analysis" },
      ],
    },
  ];
  
  // Mock data for cash flows (replace with your actual data fetching)
  const mockCashFlows = [
    { method_code: "cf001", name: "Cash Flow 1" },
    { method_code: "cf002", name: "Cash Flow 2" },
    { method_code: "cf003", name: "Cash Flow 3" },
  ];
  
  const ReportsModule = ({ onSelectReport }) => {
    const theme = useTheme();
    const [selectedReport, setSelectedReport] = useState(null);
    const [cashFlowId, setCashFlowId] = useState("");
    const [reportType, setReportType] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingExport, setLoadingExport] = useState(false);
    const [cashFlows, setCashFlows] = useState(mockCashFlows);
    const [snackbar, setSnackbar] = useState({
      open: false,
      message: "",
      severity: "info"
    });
  
    // Simulate fetch cash flows when component mounts
    useEffect(() => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setCashFlows(mockCashFlows);
        setLoading(false);
      }, 500);
    }, []);
  
    const handleReportSelect = (reportId) => {
      // If onSelectReport prop exists (used in ReportsPage), call it
      if (onSelectReport) {
        onSelectReport(reportId);
        return;
      }
      
      // Otherwise use internal state (for backwards compatibility)
      setSelectedReport(reportId);
      setCashFlowId("");
      setReportType("");
    };
  
    const handleBack = () => {
      setSelectedReport(null);
      setCashFlowId("");
      setReportType("");
    };
  
    const handleSnackbarClose = () => {
      setSnackbar({...snackbar, open: false});
    };
  
    const showSnackbar = (message, severity = "info") => {
      setSnackbar({
        open: true,
        message,
        severity
      });
    };
  
    const handleDownload = () => {
      if (!cashFlowId || !reportType) {
        showSnackbar("Please select both a Cash Flow and Report Type", "warning");
        return;
      }
  
      const selectedCard = reportCards.find((card) => card.id === selectedReport);
      const reportName = selectedCard?.title || "Report";
      const reportTypeLabel = selectedCard?.options.find(
        (opt) => opt.value === reportType
      )?.label;
  
      // Simulate download
      setLoadingExport(true);
      setTimeout(() => {
        setLoadingExport(false);
        showSnackbar(`${reportName} (${reportTypeLabel}) has been downloaded`, "success");
      }, 1500);
    };
  
    // Render content based on selection
    const renderContent = () => {
      if (selectedReport) {
        // If a report type is selected, render the report form
        const selectedCard = reportCards.find(
          (card) => card.id === selectedReport
        );
  
        return (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              {React.cloneElement(selectedCard.icon, {
                sx: { mr: 2, color: selectedCard.color, fontSize: 30 },
              })}
              <Typography variant="h5" component="h2" fontWeight="500">
                {selectedCard.title}
              </Typography>
            </Box>
  
            <Typography variant="body1" color="text.secondary" paragraph>
              {selectedCard.description}
            </Typography>
  
            <Alert severity="info" sx={{ mb: 3 }}>
              Select a Cash Flow and Report Type to generate your report
            </Alert>
  
            <Grid container spacing={3}>
              <Grid item xs={12} md={5}>
                <FormControl fullWidth>
                  <InputLabel id="cash-flow-select-label">
                    Select Cash Flow
                  </InputLabel>
                  <Select
                    labelId="cash-flow-select-label"
                    id="cash-flow-select"
                    value={cashFlowId}
                    onChange={(e) => setCashFlowId(e.target.value)}
                    label="Select Cash Flow"
                    disabled={loading}
                  >
                    <MenuItem value="">
                      <em>Select a Cash Flow</em>
                    </MenuItem>
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
                </FormControl>
              </Grid>
              <Grid item xs={12} md={5}>
                <FormControl fullWidth>
                  <InputLabel id="report-type-select-label">
                    Report Type
                  </InputLabel>
                  <Select
                    labelId="report-type-select-label"
                    id="report-type-select"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    label="Report Type"
                  >
                    <MenuItem value="">
                      <em>Select a Report Type</em>
                    </MenuItem>
                    {selectedCard.options.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2} display={"flex"}>
                <Button
                  variant="contained"
                  onClick={handleDownload}
                  startIcon={<Description />}
                  disabled={!cashFlowId || !reportType || loadingExport}
                  sx={{
                    width: "100%",
                    bgcolor: selectedCard.color,
                    "&:hover": {
                      bgcolor: alpha(selectedCard.color, 0.8),
                    },
                  }}
                >
                  {loadingExport ? "Generating..." : "Generate Report"}
                </Button>
              </Grid>
              <Grid item xs={12} sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  startIcon={
                    <ArrowForwardIos sx={{ transform: "rotate(180deg)" }} />
                  }
                >
                  Back
                </Button>
              </Grid>
            </Grid>
          </Box>
        );
      } else {
        // If no report is selected, render the report cards
        return (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <Description
                sx={{ mr: 2, color: theme.palette.primary.main, fontSize: 30 }}
              />
              <Typography variant="h5" component="h2" fontWeight="500">
                Available Reports
              </Typography>
            </Box>
  
            <Typography variant="body1" color="text.secondary" paragraph>
              Select a report type to generate and download formatted documents
              for compliance, investor relations, or management decision-making.
            </Typography>
  
            <Grid container spacing={3}>
              {reportCards.map((card) => (
                <Grid item xs={12} sm={6} md={4} key={card.id}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: theme.shadows[2],
                      transition: "all 0.3s ease-in-out",
                      "&:hover": {
                        boxShadow: theme.shadows[8],
                        transform: "translateY(-5px)",
                      },
                      border: `1px solid ${alpha(card.color, 0.3)}`,
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleReportSelect(card.id)}
                      sx={{ height: "100%" }}
                    >
                      <CardContent sx={{ p: 3, height: "100%" }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 2,
                            pb: 1.5,
                            borderBottom: `1px solid ${alpha(
                              theme.palette.divider,
                              0.5
                            )}`,
                          }}
                        >
                          {React.cloneElement(card.icon, {
                            sx: {
                              mr: 1.5,
                              color: card.color,
                              backgroundColor: alpha(card.color, 0.1),
                              p: 0.7,
                              borderRadius: "50%",
                            },
                          })}
                          <Typography variant="h6" component="h3">
                            {card.title}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {card.description}
                        </Typography>
                        <Box
                          sx={{
                            mt: 2,
                            pt: 1.5,
                            borderTop: `1px solid ${alpha(
                              theme.palette.divider,
                              0.3
                            )}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {card.options.length} report{" "}
                            {card.options.length !== 1 ? "types" : "type"}
                          </Typography>
                          <NavigateNext fontSize="small" color="action" />
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      }
    };
  
    return (
      <Box sx={{ position: "relative" }}>
        {/* Main content area */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            boxShadow: theme.shadows[1],
            border: selectedReport
              ? `1px solid ${alpha(
                reportCards.find((card) => card.id === selectedReport)?.color ||
                theme.palette.primary.main,
                0.2
              )}`
              : `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          {renderContent()}
        </Paper>
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbar.severity} 
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  };
  
  export default ReportsModule;