// src/pages/ReportsPage.js
import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  alpha,
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Assessment, NavigateNext } from "@mui/icons-material";
import ReportsModule from "../components/reports/ReportsModule";
import ManagementReportCard from "../components/reports/ManagementReportCard";
import RegulatoryReportCard from "../components/reports/RegulatoryReportCard";
import InvestorReportCard from "../components/reports/InvestorReportCard";

const ReportsPage = () => {
  const theme = useTheme();
  const [activeReport, setActiveReport] = useState(null);

  // Report category definitions
  const reportCategories = {
    regulatory: {
      id: "regulatory",
      title: "Regulatory Report",
      color: "#1976d2", // Blue
    },
    investor: {
      id: "investor",
      title: "Investor Report",
      color: "#2e7d32", // Green
    },
    management: {
      id: "management",
      title: "Management Report",
      color: "#ed6c02", // Orange
    },
  };

  // Handle back to reports list
  const handleBackToReports = () => {
    setActiveReport(null);
  };

  // Render the appropriate report card based on selection
  const renderReportCard = () => {
    if (!activeReport) return null;

    const category = reportCategories[activeReport];

    switch (activeReport) {
      case "regulatory":
        return (
          <RegulatoryReportCard
            onBack={handleBackToReports}
            category={category}
          />
        );
      case "investor":
        return (
          <InvestorReportCard onBack={handleBackToReports} category={category} />
        );
      case "management":
        return (
          <ManagementReportCard
            onBack={handleBackToReports}
            category={category}
          />
        );
      default:
        return null;
    }
  };

  // Function to handle report selection from the module
  const handleReportSelect = (reportId) => {
    setActiveReport(reportId);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page header with breadcrumbs */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Assessment
            sx={{
              mr: 1.5,
              color: theme.palette.primary.main,
              fontSize: 32,
            }}
          />
          <Typography variant="h4" component="h1" fontWeight="500">
            Reports
          </Typography>
        </Box>

        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ color: "text.secondary" }}
        >
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            color="inherit"
            sx={{ display: "flex", alignItems: "center" }}
          >
            Dashboard
          </Link>
          <Typography color="text.primary">Reports</Typography>
          {activeReport && (
            <Typography color="text.primary">
              {reportCategories[activeReport]?.title || ""}
            </Typography>
          )}
        </Breadcrumbs>
      </Box>

      {/* Page content */}
      <Paper
        elevation={0}
        sx={{
          p: 0,
          borderRadius: 2,
          overflow: "hidden",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        {activeReport ? (
          renderReportCard()
        ) : (
          <ReportsModule onSelectReport={handleReportSelect} />
        )}
      </Paper>
    </Container>
  );
};

export default ReportsPage;