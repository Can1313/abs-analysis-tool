// frontend/src/pages/HomePage.js
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
  useTheme
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import OptimizeIcon from '@mui/icons-material/Speed';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import CompareIcon from '@mui/icons-material/Compare';
import { useData } from '../contexts/DataContext';
import FileUploader from '../components/FileUploader';

const HomePage = () => {
  const { cashFlowData } = useData();
  const theme = useTheme();

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
        <BusinessIcon sx={{ fontSize: 56, mb: 2, color: alpha('#fff', 0.9) }} />
        <Typography variant="h3" component="h1" gutterBottom fontWeight="500">
          Advanced ABS Design
        </Typography>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 400, opacity: 0.9 }}>
          Professional cash flow analysis and optimization for asset-backed securities
        </Typography>
        <Divider sx={{ 
          width: '100px', 
          mx: 'auto', 
          mb: 3, 
          borderColor: 'rgba(255,255,255,0.25)' 
        }} />
        <Typography variant="body1" sx={{ maxWidth: '800px', mx: 'auto', opacity: 0.9 }}>
          Upload your Excel data file to begin analyzing your cash flows, 
          calculate securitization structures, and optimize your tranches for maximum returns.
        </Typography>
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
              Upload Your Cash Flow Data
            </Typography>
            <FileUploader />
          </Paper>
        </Grid>

        {cashFlowData && (
          <>
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
                    Calculate Results
                  </Typography>
                </Box>
                
                <Typography paragraph sx={{ color: 'text.secondary', mb: 3 }}>
                  Configure tranche parameters and calculate detailed results for your
                  ABS structure. Analyze cash flows, interest rates, and buffer ratios to
                  ensure your securitization meets all requirements.
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
                    Start Calculation
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
                    Optimize Structure
                  </Typography>
                </Box>
                
                <Typography paragraph sx={{ color: 'text.secondary', mb: 3 }}>
                  Find the optimal ABS structure to maximize total principal
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
                    Run Optimization
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
                        Compare Results
                      </Typography>
                    </Box>
                    
                    <Typography paragraph sx={{ color: 'text.secondary' }}>
                      Compare different optimization strategies and manual configurations side by side. 
                      Analyze the differences in principal distribution, interest rates, and buffer ratios 
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