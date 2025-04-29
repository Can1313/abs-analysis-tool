// src/components/calculation/TrancheAForm.js
import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TextField,
  IconButton,
  Tooltip,
  alpha,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useData } from '../../contexts/DataContext';

const TrancheAForm = () => {
  const { tranchesA, setTranchesA } = useData();
  const theme = useTheme();

  const handleChange = (index, field, value) => {
    const newTranches = [...tranchesA];
    newTranches[index][field] = value;
    setTranchesA(newTranches);
  };

  const handleAddTranche = () => {
    const newTranche = {
      maturity_days: 0,
      base_rate: 0.0,
      spread: 0.0,
      reinvest_rate: 0.0,
      nominal: 0
    };
    
    setTranchesA([...tranchesA, newTranche]);
  };

  const handleDeleteTranche = (index) => {
    const newTranches = tranchesA.filter((_, i) => i !== index);
    setTranchesA(newTranches);
  };

  return (
    <Paper sx={{ 
      p: 3, 
      mb: 3,
      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      backgroundColor: alpha(theme.palette.primary.main, 0.03),
      borderRadius: 2
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" color="primary.main" fontWeight="medium">
            Senior Tranches
          </Typography>
          <Tooltip title="Configure senior tranches of the receivables securitization. Senior tranches have higher payment priority and lower risk." sx={{ ml: 1 }}>
            <InfoOutlinedIcon fontSize="small" color="primary" />
          </Tooltip>
        </Box>
        <IconButton 
          color="primary" 
          onClick={handleAddTranche}
          disabled={tranchesA.length >= 10}
        >
          <AddIcon />
        </IconButton>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Define the characteristics of each senior tranche including maturity, interest rates, and principal amounts.
      </Typography>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tranche</TableCell>
              <TableCell>Maturity Days</TableCell>
              <TableCell>Base Rate (%)</TableCell>
              <TableCell>Spread (bps)</TableCell>
              <TableCell>Reinvest Rate (%)</TableCell>
              <TableCell>Nominal ($)</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tranchesA.map((tranche, index) => (
              <TableRow key={index}>
                <TableCell>{`Senior ${index + 1}`}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={tranche.maturity_days}
                    onChange={(e) => handleChange(index, 'maturity_days', parseInt(e.target.value) || 0)}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={tranche.base_rate}
                    onChange={(e) => handleChange(index, 'base_rate', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      inputProps: { min: 0, step: 0.1 }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={tranche.spread}
                    onChange={(e) => handleChange(index, 'spread', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      inputProps: { min: 0, step: 0.1 }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={tranche.reinvest_rate}
                    onChange={(e) => handleChange(index, 'reinvest_rate', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      inputProps: { min: 0, step: 0.1 }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={tranche.nominal}
                    onChange={(e) => handleChange(index, 'nominal', parseInt(e.target.value) || 0)}
                    InputProps={{
                      inputProps: { min: 0, step: 1000000 }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    color="error" 
                    onClick={() => handleDeleteTranche(index)}
                    disabled={tranchesA.length <= 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TrancheAForm;