// src/components/calculation/DefaultSettingsSelector.js
import React from 'react';
import { 
  Box, 
  Typography, 
  ToggleButtonGroup, 
  ToggleButton, 
  Tooltip, 
  Paper,
  alpha,
  useTheme
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import RestoreIcon from '@mui/icons-material/Restore';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useData } from '../../contexts/DataContext';

const DefaultSettingsSelector = () => {
  const theme = useTheme();
  const { selectedDefaults, setSelectedDefaults } = useData();

  const handleChange = (event, newValue) => {
    if (newValue !== null) {
      setSelectedDefaults(newValue);
    }
  };

  const settingsInfo = {
    previous: {
      label: "Previous Model",
      description: "February 13, 2025 start date, 4 Class A tranches",
      icon: <RestoreIcon />,
      details: {
        startDate: "13 February 2025",
        classA: "4 tranches (61-274 days)",
        trancheB: "300 days maturity",
        classBPercentage: "Default calculation"
      },
    },
    new: {
      label: "New Model",
      description: "April 16, 2025 start date, 5 Class A tranches",
      icon: <NewReleasesIcon />,
      details: {
        startDate: "16 April 2025",
        classA: "5 tranches (59-275 days)",
        trancheB: "346 days maturity",
        classBPercentage: "Fixed 10% of total"
      },
    },
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        backgroundColor: alpha(theme.palette.info.main, 0.03),
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SettingsIcon sx={{ mr: 1, color: theme.palette.info.main }} />
        <Typography variant="h6" color="info.main" fontWeight="medium">
          Default Settings Selection
        </Typography>
        <Tooltip 
          title="Choose between previous and new default settings for tranches structure" 
          placement="top"
          sx={{ ml: 1 }}
        >
          <InfoOutlinedIcon fontSize="small" color="info" />
        </Tooltip>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select which default settings to use for your calculation. This will reset your current configuration.
        </Typography>
      </Box>

      <ToggleButtonGroup
        value={selectedDefaults}
        exclusive
        onChange={handleChange}
        aria-label="default settings selection"
        sx={{ 
          display: 'flex', 
          width: '100%',
          '& .MuiToggleButton-root': {
            flex: 1,
            py: 1.5,
            borderRadius: 2,
            "&.Mui-selected": {
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              borderColor: alpha(theme.palette.info.main, 0.5),
              "&:hover": {
                backgroundColor: alpha(theme.palette.info.main, 0.15),
              }
            }
          }
        }}
      >
        {Object.entries(settingsInfo).map(([key, info]) => (
          <ToggleButton 
            key={key} 
            value={key}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              textTransform: 'none',
              p: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {info.icon}
              <Typography variant="subtitle1" fontWeight="medium">
                {info.label}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {info.description}
            </Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Details about selected settings */}
      <Box 
        sx={{ 
          mt: 2, 
          p: 2, 
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          borderRadius: 1,
          border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {settingsInfo[selectedDefaults].label} Details:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Start Date</Typography>
            <Typography variant="body1" fontWeight="medium">
              {settingsInfo[selectedDefaults].details.startDate}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Class A Structure</Typography>
            <Typography variant="body1" fontWeight="medium">
              {settingsInfo[selectedDefaults].details.classA}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Class B Structure</Typography>
            <Typography variant="body1" fontWeight="medium">
              {settingsInfo[selectedDefaults].details.trancheB}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Class B Percentage</Typography>
            <Typography variant="body1" fontWeight="medium" color={selectedDefaults === 'new' ? 'primary.main' : 'text.primary'}>
              {settingsInfo[selectedDefaults].details.classBPercentage}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default DefaultSettingsSelector;