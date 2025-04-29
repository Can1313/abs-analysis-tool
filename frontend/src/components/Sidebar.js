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
  useTheme,
  IconButton,
  useMediaQuery,
  Tooltip,
  Collapse
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import CalculationIcon from '@mui/icons-material/AccountBalance';
import OptimizationIcon from '@mui/icons-material/Speed';
import ComparisonIcon from '@mui/icons-material/Compare';
import StressTestingIcon from '@mui/icons-material/Assessment';
import ReceivablesIcon from '@mui/icons-material/ReceiptLong';
import ReportsIcon from '@mui/icons-material/Assignment';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { alpha } from '@mui/material/styles';

// Drawer widths for expanded and collapsed states
const drawerWidth = 260;
const collapsedDrawerWidth = 68;

const Sidebar = ({ mobileOpen, handleDrawerToggle, isExpanded, handleDesktopDrawerToggle }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Navigation items with professional financial terminology
  const navigationItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: <HomeIcon />,
      description: 'Overview & Key Metrics'
    },
    {
      path: '/calculation',
      label: 'Structuring & Modeling',
      icon: <CalculationIcon />,
      description: 'Design financial product structures'
    },
    {
      path: '/optimization',
      label: 'Yield Enhancement',
      icon: <OptimizationIcon />,
      description: 'Optimize for maximum returns'
    },
    {
      path: '/comparison',
      label: 'Comparative Analysis',
      icon: <ComparisonIcon />,
      description: 'Compare multiple product variants'
    },
    {
      path: '/stress-testing',
      label: 'Risk Assessment',
      icon: <StressTestingIcon />,
      description: 'Evaluate market risk scenarios'
    },
    {
      path: '/receivables-analysis',
      label: 'Receivables Analysis',
      icon: <ReceivablesIcon />,
      description: 'Analyze receivables portfolio'
    },
    {
      path: '/reports',
      label: 'Financial Reporting',
      icon: <ReportsIcon />,
      description: 'Generate comprehensive reports'
    }
  ];

  const navigationPanel = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header with logo and toggle button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'space-between' : 'center',
          p: isExpanded ? 2 : 1,
          minHeight: 64,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`
        }}
      >
        {isExpanded && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ReceivablesIcon
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
                whiteSpace: 'nowrap'
              }}
            >
              Securitization
            </Typography>
          </Box>
        )}
        
        {!isExpanded && (
          <Tooltip title="Securitization Platform" placement="right">
            <ReceivablesIcon
              sx={{
                fontSize: 28,
                color: theme.palette.primary.main
              }}
            />
          </Tooltip>
        )}
        
        {!isMobile && (
          <IconButton 
            onClick={handleDesktopDrawerToggle}
            sx={{ 
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1)
              }
            }}
          >
            {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
      </Box>
      
      {/* Navigation items */}
      <List sx={{ 
        px: isExpanded ? 1 : 0.5, 
        py: 2, 
        flexGrow: 1,
        overflow: 'auto'
      }}>
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
              <Tooltip title={!isExpanded ? item.label : ''} placement="right">
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  selected={isActive}
                  sx={{
                    borderRadius: 1,
                    py: 1.2,
                    minHeight: 48,
                    justifyContent: isExpanded ? 'initial' : 'center',
                    px: isExpanded ? 2 : 2.5,
                    position: 'relative',
                    backgroundColor: isActive
                      ? alpha(theme.palette.primary.main, 0.15)
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive
                        ? alpha(theme.palette.primary.main, 0.25)
                        : alpha(theme.palette.primary.main, 0.1),
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.25),
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '25%',
                        height: '50%',
                        width: 3,
                        borderRadius: '0 2px 2px 0',
                        backgroundColor: theme.palette.primary.main
                      }
                    },
                    transition: theme.transitions.create(['background-color'], {
                      easing: theme.transitions.easing.sharp,
                      duration: theme.transitions.duration.standard,
                    }),
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: isExpanded ? 42 : 0,
                      mr: isExpanded ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isActive
                        ? theme.palette.primary.main
                        : theme.palette.text.secondary
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  
                  <Collapse 
                    in={isExpanded} 
                    orientation="horizontal" 
                    timeout="auto"
                    sx={{ overflow: 'hidden' }}
                  >
                    <Box>
                      <ListItemText 
                        primary={item.label} 
                        secondary={isActive ? item.description : null}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '0.95rem',
                          whiteSpace: 'nowrap'
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          maxWidth: 180
                        }}
                      />
                    </Box>
                  </Collapse>
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
      
      <Divider sx={{ mx: isExpanded ? 2 : 0.5, opacity: 0.3 }} />
      
      <Box sx={{ p: isExpanded ? 2 : 1, display: 'flex', justifyContent: isExpanded ? 'flex-start' : 'center' }}>
        {isExpanded ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            Securitization Platform v1.0
          </Typography>
        ) : (
          <Tooltip title="Securitization Platform v1.0" placement="right">
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              v1.0
            </Typography>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  // Calculate drawer width based on expansion state
  const currentDrawerWidth = !isMobile && !isExpanded ? collapsedDrawerWidth : drawerWidth;

  return (
    <Box
      component="nav"
      sx={{ 
        width: { md: currentDrawerWidth }, 
        flexShrink: { md: 0 },
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        })
      }}
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
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          },
        }}
      >
        {navigationPanel}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: currentDrawerWidth,
          flexShrink: 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: currentDrawerWidth,
            overflowX: 'hidden',
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
        open
      >
        {navigationPanel}
      </Drawer>
    </Box>
  );
};

export default Sidebar;