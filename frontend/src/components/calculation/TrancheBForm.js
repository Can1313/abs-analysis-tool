// src/components/calculation/TrancheBForm.js
import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Paper, 
  Grid, 
  Tooltip,
  alpha,
  useTheme,
  InfoOutlined
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useData } from '../../contexts/DataContext';

const TrancheBForm = () => {
  const { trancheB, setTrancheB } = useData();
  const theme = useTheme();

  const handleChange = (field, value) => {
    setTrancheB({
      ...trancheB,
      [field]: value,
    });
  };

  return (
    <Paper sx={{ 
      p: 3, 
      mb: 3,
      border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
      backgroundColor: alpha(theme.palette.secondary.main, 0.03),
      borderRadius: 2
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="secondary.main" fontWeight="medium">
          Subordinated Tranche
        </Typography>
        <Tooltip title="Configure the subordinated (junior) tranche which absorbs first losses but offers higher yields" sx={{ ml: 1 }}>
          <InfoOutlinedIcon fontSize="small" color="secondary" />
        </Tooltip>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Define the characteristics of the subordinated tranche that provides credit enhancement to senior tranches.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Maturity Days"
            type="number"
            value={trancheB.maturity_days}
            onChange={(e) => handleChange('maturity_days', parseInt(e.target.value) || 0)}
            InputProps={{
              inputProps: { min: 0 }
            }}
            helperText="Number of days until maturity"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Base Rate (%)"
            type="number"
            value={trancheB.base_rate}
            onChange={(e) => handleChange('base_rate', parseFloat(e.target.value) || 0)}
            InputProps={{
              inputProps: { min: 0, step: 0.1 }
            }}
            helperText="Base interest rate for this tranche"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Spread (bps)"
            type="number"
            value={trancheB.spread}
            onChange={(e) => handleChange('spread', parseFloat(e.target.value) || 0)}
            InputProps={{
              inputProps: { min: 0, step: 0.1 }
            }}
            helperText="Additional spread in basis points"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Reinvest Rate (%)"
            type="number"
            value={trancheB.reinvest_rate}
            onChange={(e) => handleChange('reinvest_rate', parseFloat(e.target.value) || 0)}
            InputProps={{
              inputProps: { min: 0, step: 0.1 }
            }}
            helperText="Rate at which cash flows are reinvested"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nominal Amount ($)"
            type="number"
            value={trancheB.nominal}
            onChange={(e) => handleChange('nominal', parseInt(e.target.value) || 0)}
            InputProps={{
              inputProps: { min: 0, step: 100000 }
            }}
            helperText="Principal amount for this tranche"
          />
        </Grid>
      </Grid>
      
      <Box sx={{ 
        mt: 3, 
        p: 2, 
        borderRadius: 1, 
        backgroundColor: alpha(theme.palette.info.main, 0.1),
        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
      }}>
        <Typography variant="subtitle2" color="info.main" gutterBottom>
          Subordinated Tranche Information
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The subordinated tranche represents the first-loss position in the receivables securitization structure.
          It provides credit enhancement to the senior tranches by absorbing initial defaults,
          and typically offers higher returns to compensate for the increased risk.
        </Typography>
      </Box>
    </Paper>
  );
};

export default TrancheBForm;