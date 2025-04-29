// src/components/Sidebar.js
import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import OptimizeIcon from '@mui/icons-material/Speed';
import CompareIcon from '@mui/icons-material/Compare';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { alpha } from '@mui/material/styles';

// Drawer width
const drawerWidth = 260;

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const location = useLocation();
  const theme = useTheme();
  
  // Menu items with reordered and renamed items
  const menuItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: <HomeIcon />
    },
    {
      path: '/receivables-analysis',
      label: 'Receivables Analytics',
      icon: <BarChartIcon />
    },
    {
      path: '/calculation',
      label: 'ABS Design',
      icon: <AccountBalanceIcon />
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
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: <AssignmentIcon />
    }
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          height: 64,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }}
      >
        <ReceiptLongIcon
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
          Securitization
        </Typography>
      </Box>
      
      <List sx={{ px: 1, py: 2, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 1,
                py: 1.2,
                backgroundColor: location.pathname === item.path
                  ? alpha(theme.palette.primary.main, 0.15)
                  : 'transparent',
                '&:hover': {
                  backgroundColor: location.pathname === item.path
                    ? alpha(theme.palette.primary.main, 0.25)
                    : alpha(theme.palette.primary.main, 0.1),
                },
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.25),
                  }
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 42,
                  color: location.pathname === item.path
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 600 : 400
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ mx: 2, opacity: 0.3 }} />
      
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Securitization Platform v1.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            backgroundColor: theme.palette.background.default,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            backgroundColor: theme.palette.background.default,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;