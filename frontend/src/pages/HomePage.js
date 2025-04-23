// src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Grid, 
  Paper, 
  alpha,
  Divider,
  useTheme,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import OptimizeIcon from '@mui/icons-material/Speed';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CompareIcon from '@mui/icons-material/Compare';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import RestoreIcon from '@mui/icons-material/Restore';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useData } from '../contexts/DataContext';
import FileUploader from '../components/FileUploader';

const HomePage = () => {
  const { cashFlowData, selectedDefaults, setSelectedDefaults } = useData();
  const theme = useTheme();

  // Define the default settings info
  const defaultSettingsInfo = {
    previous: {
      label: "Standard Model",
      description: "February 13, 2025 start date with 4 senior tranches (61-274 days)",
      icon: <RestoreIcon sx={{ color: theme.palette.primary.main }} />,
      color: theme.palette.primary.main,
      details: [
        { label: "Start Date", value: "13 February 2025" },
        { label: "Senior Tranches", value: "4" },
        { label: "Senior Maturity Range", value: "61-274 days" },
        { label: "Subordinated Maturity", value: "300 days" },
        { label: "Subordinated Percentage", value: "Default calculation" },
      ]
    },
    new: {
      label: "Enhanced Model",
      description: "April 16, 2025 start date with 5 senior tranches (59-275 days)",
      icon: <NewReleasesIcon sx={{ color: theme.palette.secondary.main }} />,
      color: theme.palette.secondary.main,
      details: [
        { label: "Start Date", value: "16 April 2025" },
        { label: "Senior Tranches", value: "5" },
        { label: "Senior Maturity Range", value: "59-275 days" },
        { label: "Subordinated Maturity", value: "346 days" },
        { label: "Subordinated Percentage", value: "Fixed 10% of total", highlight: true },
      ]
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          py: 7,
          px: { xs: 3, md: 6 },
          mb: 5,
          textAlign: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)}, ${alpha(theme.palette.secondary.dark, 0.8)})`,
          borderRadius: 3,
          color: 'white',
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.dark, 0.4)}`,
        }}
      >
        <ReceiptLongIcon sx={{ fontSize: 56, mb: 2, color: alpha('#fff', 0.9) }} />
        <Typography variant="h3" component="h1" gutterBottom fontWeight="500">
          Receivables Securitization Platform
        </Typography>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 400, opacity: 0.9 }}>
          Professional cash flow analysis and optimization for commercial receivables securitization
        </Typography>
        <Divider sx={{ 
          width: '100px', 
          mx: 'auto', 
          mb: 3, 
          borderColor: 'rgba(255,255,255,0.25)' 
        }} />
        <Typography variant="body1" sx={{ maxWidth: '800px', mx: 'auto', opacity: 0.9 }}>
          Upload your receivables data to analyze cash flows, 
          calculate securitization structures, and optimize your tranches for maximum returns and risk protection.
        </Typography>
        
        {/* Key Features Badge Section */}
        <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
          <Chip 
            icon={<BusinessIcon />} 
            label="Commercial Receivables" 
            sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff', fontWeight: 500, px: 1 }}
          />
          <Chip 
            icon={<AccountBalanceIcon />} 
            label="Securitization" 
            sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff', fontWeight: 500, px: 1 }}
          />
          <Chip 
            icon={<PaymentsIcon />} 
            label="Cash Flow Analytics" 
            sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff', fontWeight: 500, px: 1 }}
          />
          <Chip 
            icon={<AssignmentIcon />} 
            label="Risk Management" 
            sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff', fontWeight: 500, px: 1 }}
          />
        </Box>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Paper
            elevation={2}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              background: `linear-gradient(to right, ${alpha(theme.palette.background.paper, 0.9)}, ${theme.palette.background.paper})`,
              boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.3)}`,
            }}
          >
            <Typography variant="h5" gutterBottom fontWeight="medium" sx={{ mb: 3 }}>
              Upload Your Receivables Data
            </Typography>
            <FileUploader />
          </Paper>
        </Grid>

        {cashFlowData && (
          <>
            {/* Default Settings Selection */}
            <Grid item xs={12}>
              <Paper
                elevation={2}
                sx={{
                  p: 4,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  background: `linear-gradient(to right, ${alpha(theme.palette.background.paper, 0.9)}, ${theme.palette.background.paper})`,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.3)}`,
                }}
              >
                <Typography variant="h5" gutterBottom fontWeight="medium" sx={{ mb: 3, color: theme.palette.info.main }}>
                  Securitization Structure Models
                </Typography>
                
                <Typography variant="body1" paragraph sx={{ color: 'text.secondary' }}>
                  Choose from our predefined securitization structure models to begin your analysis.
                  Each model contains pre-configured tranches optimized for different receivables profiles.
                </Typography>
                
                <Grid container spacing={3}>
                  {Object.entries(defaultSettingsInfo).map(([key, info]) => (
                    <Grid item xs={12} md={6} key={key}>
                      <Card 
                        elevation={2} 
                        sx={{
                          height: '100%',
                          borderRadius: 2,
                          transition: 'all 0.3s',
                          border: `1px solid ${alpha(info.color, selectedDefaults === key ? 0.6 : 0.2)}`,
                          backgroundColor: alpha(info.color, selectedDefaults === key ? 0.05 : 0.02),
                          '&:hover': {
                            boxShadow: `0 8px 20px ${alpha(info.color, 0.2)}`,
                            transform: 'translateY(-4px)',
                          }
                        }}
                        onClick={() => setSelectedDefaults(key)}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {info.icon}
                              <Typography variant="h6" fontWeight="medium" color={info.color}>
                                {info.label}
                              </Typography>
                            </Box>
                            {selectedDefaults === key && (
                              <Chip 
                                label="Selected" 
                                size="small" 
                                color="primary" 
                                sx={{ 
                                  backgroundColor: info.color,
                                  fontWeight: 'medium'
                                }} 
                              />
                            )}
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {info.description}
                          </Typography>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Grid container spacing={1}>
                            {info.details.map((detail, index) => (
                              <Grid item xs={6} key={index}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {detail.label}
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    fontWeight="medium"
                                    color={detail.highlight ? info.color : "inherit"}
                                    sx={detail.highlight ? {
                                      display: 'flex',
                                      alignItems: 'center',
                                      '&::before': {
                                        content: '""',
                                        display: 'inline-block',
                                        width: 8,
                                        height: 8,
                                        bgcolor: info.color,
                                        borderRadius: '50%',
                                        mr: 1
                                      }
                                    } : {}}
                                  >
                                    {detail.value}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                          
                          <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Button
                              variant={selectedDefaults === key ? "contained" : "outlined"}
                              color={selectedDefaults === key ? "primary" : "secondary"}
                              component={Link}
                              to="/calculation"
                              size="medium"
                              endIcon={<ArrowForwardIcon />}
                              sx={{ 
                                borderRadius: 2,
                                borderColor: info.color,
                                backgroundColor: selectedDefaults === key ? info.color : 'transparent',
                              }}
                            >
                              {selectedDefaults === key ? "Continue with Selection" : "Use This Model"}
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                elevation={2}
                sx={{
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  transition: 'all 0.3s',
                  background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${theme.palette.background.paper})`,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  },
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2.5
                }}>
                  <Box sx={{ 
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.light, 0.8)})`,
                    borderRadius: '50%', 
                    p: 1.5, 
                    mr: 2,
                    boxShadow: `0 4px 8px ${alpha(theme.palette.primary.main, 0.4)}`
                  }}>
                    <CalculateIcon sx={{ fontSize: 30, color: theme.palette.common.white }} />
                  </Box>
                  <Typography variant="h5" fontWeight="medium" color="primary.main">
                    Receivables Analysis
                  </Typography>
                </Box>
                
                <Typography paragraph sx={{ color: 'text.secondary', mb: 3 }}>
                  Configure tranche parameters and calculate detailed results for your
                  receivables-backed securitization. Analyze cash flows, interest rates, and buffer ratios 
                  to ensure your structure meets all requirements.
                </Typography>
                
                <Box sx={{ mt: 'auto', textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to="/calculation"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ 
                      mt: 2, 
                      py: 1.2, 
                      px: 3.5,
                      fontWeight: 500,
                      borderRadius: 2,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      '&:hover': {
                        boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
                        background: `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`
                      }
                    }}
                  >
                    Analyze Receivables
                  </Button>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                elevation={2}
                sx={{
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                  transition: 'all 0.3s',
                  background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${theme.palette.background.paper})`,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 20px ${alpha(theme.palette.secondary.main, 0.25)}`,
                    borderColor: alpha(theme.palette.secondary.main, 0.3),
                  },
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2.5
                }}>
                  <Box sx={{ 
                    background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${alpha(theme.palette.secondary.light, 0.8)})`,
                    borderRadius: '50%', 
                    p: 1.5, 
                    mr: 2,
                    boxShadow: `0 4px 8px ${alpha(theme.palette.secondary.main, 0.4)}`
                  }}>
                    <OptimizeIcon sx={{ fontSize: 30, color: theme.palette.common.white }} />
                  </Box>
                  <Typography variant="h5" fontWeight="medium" color="secondary.main">
                    Portfolio Optimizer
                  </Typography>
                </Box>
                
                <Typography paragraph sx={{ color: 'text.secondary', mb: 3 }}>
                  Optimize your receivables securitization structure to maximize returns
                  while maintaining minimum buffer requirements. Our advanced optimization
                  algorithms explore multiple strategies to find the best tranche configuration.
                </Typography>
                
                <Box sx={{ mt: 'auto', textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    component={Link}
                    to="/optimization"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ 
                      mt: 2, 
                      py: 1.2, 
                      px: 3.5,
                      fontWeight: 500,
                      borderRadius: 2,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                      '&:hover': {
                        boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
                        background: `linear-gradient(45deg, ${theme.palette.secondary.light}, ${theme.palette.secondary.main})`
                      }
                    }}
                  >
                    Optimize Portfolio
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            {/* Add Compare section */}
            <Grid item xs={12}>
              <Paper
                elevation={2}
                sx={{
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${theme.palette.background.paper})`,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 20px ${alpha(theme.palette.info.main, 0.25)}`,
                    borderColor: alpha(theme.palette.info.main, 0.3),
                  },
                }}
              >
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 2
                    }}>
                      <Box sx={{ 
                        background: `linear-gradient(45deg, ${theme.palette.info.main}, ${alpha(theme.palette.info.light, 0.8)})`,
                        borderRadius: '50%', 
                        p: 1.5, 
                        mr: 2,
                        boxShadow: `0 4px 8px ${alpha(theme.palette.info.main, 0.4)}`
                      }}>
                        <CompareIcon sx={{ fontSize: 30, color: theme.palette.common.white }} />
                      </Box>
                      <Typography variant="h5" fontWeight="medium" color="info.main">
                        Compare Structures
                      </Typography>
                    </Box>
                    
                    <Typography paragraph sx={{ color: 'text.secondary' }}>
                      Compare different optimization strategies and manual configurations side by side. 
                      Analyze differences in receivables distribution, interest rates, and buffer ratios 
                      to make informed decisions about your securitization structure.
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                    <Button
                      variant="contained"
                      color="info"
                      component={Link}
                      to="/comparison"
                      size="large"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ 
                        py: 1.2, 
                        px: 3.5,
                        fontWeight: 500,
                        borderRadius: 2,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        background: `linear-gradient(45deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
                        '&:hover': {
                          boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
                          background: `linear-gradient(45deg, ${theme.palette.info.light}, ${theme.palette.info.main})`
                        }
                      }}
                    >
                      View Comparisons
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>
    </Container>
  );
};

export default HomePage;