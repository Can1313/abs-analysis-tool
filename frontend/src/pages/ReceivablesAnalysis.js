// src/pages/ReceivablesAnalysis.js
import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid,
  Breadcrumbs,
  Link,
  useTheme,
  alpha,
  Divider
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import BarChartIcon from '@mui/icons-material/BarChart';
import { Link as RouterLink } from 'react-router-dom';
import ReceivablesDashboard from '../components/receivables/ReceivablesDashboard';

function ReceivablesAnalysis() {
  const theme = useTheme();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      {/* Breadcrumbs navigation */}
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link 
          component={RouterLink} 
          to="/"
          color="inherit"
          underline="hover"
        >
          Dashboard
        </Link>
        <Typography color="text.primary">Receivables Analytics</Typography>
      </Breadcrumbs>
      
      {/* Page Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 3,
          pb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
        }}
      >
        <BarChartIcon 
          sx={{ 
            fontSize: 36, 
            color: theme.palette.primary.main,
            mr: 2 
          }} 
        />
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 1 }}>
            Receivables Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive analysis of trade receivables for securitization
          </Typography>
        </Box>
      </Box>
      
      {/* Dashboard Context */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 4,
          background: 'linear-gradient(145deg, rgba(78, 123, 234, 0.05) 0%, rgba(14, 23, 42, 0) 100%)'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="body1" paragraph>
              This dashboard provides detailed analysis of the receivables portfolio for securitization assessment. All maturity analyses are calculated from April 28, 2025.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The analysis includes customer concentration risk evaluation, maturity distribution, document type analysis, and other key metrics to help in structuring optimal securitization strategies.
            </Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box 
              sx={{ 
                p: 2, 
                backgroundColor: alpha(theme.palette.background.default, 0.7),
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              <Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, fontWeight: 600, mb: 1 }}>
                Analysis Highlights
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                • Total portfolio value: ₺249,901,429
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                • Top 3 customers represent 90.12% of portfolio
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                • Average remaining maturity: 83 days
              </Typography>
              <Typography variant="body2">
                • 64.52% of receivables with maturity beyond 90 days
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Main Dashboard */}
      <ReceivablesDashboard />
    </Container>
  );
}

export default ReceivablesAnalysis;