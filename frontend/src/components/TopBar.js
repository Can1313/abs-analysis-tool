// frontend/src/components/TopBar.js
import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Container, 
  useTheme 
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import OptimizeIcon from '@mui/icons-material/Speed';
import HomeIcon from '@mui/icons-material/Home';
import CompareIcon from '@mui/icons-material/Compare';
import BusinessIcon from '@mui/icons-material/Business';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { alpha } from '@mui/material/styles';

const TopBar = () => {
  const location = useLocation();
  const theme = useTheme();
  
  // Menu items with updated professional names
  const menuItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: <HomeIcon />
    },
    {
      path: '/calculation',
      label: 'Structure Analysis',
      icon: <CalculateIcon />
    },
    {
      path: '/optimization',
      label: 'Portfolio Optimizer',
      icon: <OptimizeIcon />
    },
    {
      path: '/comparison',
      label: 'Performance Metrics',
      icon: <CompareIcon />
    },
    {
      path: '/stress-testing',
      label: 'Stress Testing',
      icon: <AssessmentIcon />
    }
  ];
  
  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
        borderBottom: '1px solid rgba(78, 123, 234, 0.15)'
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexGrow: 1,
            }}
          >
            <BusinessIcon 
              sx={{ 
                fontSize: 28, 
                color: theme.palette.primary.main,
                mr: 1.5 
              }} 
            />
            <Typography
              variant="h6"
              component={RouterLink}
              to="/"
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              Advanced ABS Design
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {menuItems.map((item) => (
              <Button 
                key={item.path}
                color="inherit" 
                component={RouterLink} 
                to={item.path}
                startIcon={item.icon}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  backgroundColor: location.pathname === item.path 
                    ? alpha(theme.palette.primary.main, 0.15) 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: location.pathname === item.path 
                      ? alpha(theme.palette.primary.main, 0.25) 
                      : alpha(theme.palette.primary.main, 0.1),
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default TopBar;