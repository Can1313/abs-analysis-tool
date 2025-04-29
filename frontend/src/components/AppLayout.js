// src/components/AppLayout.js
import React, { useState } from 'react';
import { Box, CssBaseline, AppBar, Toolbar, IconButton, Typography, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { alpha } from '@mui/material/styles';
import Sidebar from './Sidebar';

// Drawer widths for expanded and collapsed states
const drawerWidth = 260;
const collapsedDrawerWidth = 68;

const AppLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // State for desktop drawer expanded/collapsed
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Handle mobile drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // Handle desktop drawer expansion toggle
  const handleDesktopDrawerToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* App Bar - adjusted for both mobile and desktop */}
      <AppBar
        position="fixed"
        sx={{
          width: { 
            xs: '100%', 
            md: `calc(100% - ${isExpanded ? drawerWidth : collapsedDrawerWidth}px)` 
          },
          ml: { 
            xs: 0, 
            md: isExpanded ? `${drawerWidth}px` : `${collapsedDrawerWidth}px` 
          },
          background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          zIndex: theme.zIndex.drawer - 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Securitization Platform
          </Typography>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar with expandable/collapsible functionality */}
      <Sidebar 
        mobileOpen={mobileOpen} 
        handleDrawerToggle={handleDrawerToggle}
        isExpanded={isExpanded}
        handleDesktopDrawerToggle={handleDesktopDrawerToggle}
      />
      
      {/* Main Content - adjusts based on sidebar state */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { 
            xs: '100%',
            md: `calc(100% - ${isExpanded ? drawerWidth : collapsedDrawerWidth}px)` 
          },
          p: 3,
          pt: { xs: 9, md: 9 }, // Padding top for AppBar on both mobile and desktop
          backgroundColor: theme.palette.background.default,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          // Improved scrolling
          height: '100vh',
          overflow: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#6b6b6b #2b2b2b',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#2b2b2b',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#6b6b6b',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#959595',
          }
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;