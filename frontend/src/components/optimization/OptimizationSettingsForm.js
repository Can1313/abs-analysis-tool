// src/components/optimization/OptimizationSettingsForm.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Slider, 
  TextField, 
  InputAdornment,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  IconButton,
  alpha,
  useTheme,
  Divider,
  Grid,
  Card,
  CardContent,
  Switch,
  FormGroup,
  Checkbox
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import TuneIcon from '@mui/icons-material/Tune';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BalanceIcon from '@mui/icons-material/Balance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import SpeedIcon from '@mui/icons-material/Speed';
import GridOnIcon from '@mui/icons-material/GridOn';

const OptimizationSettingsForm = ({ values, onChange }) => {
  const theme = useTheme();
  const [optimizationMethod, setOptimizationMethod] = useState(values.optimization_method || 'classic');
  const [selectedStrategies, setSelectedStrategies] = useState(values.selected_strategies || ['equal', 'increasing', 'decreasing', 'middle_weighted']);

  // Koyu mavi tema için renkler
  const darkBlueColors = {
    // Ana renkler - koyu mavi tema için daha parlak ve canlı
    primary: '#64B5F6', // Daha açık mavi
    primaryLight: '#90CAF9',
    primaryDark: '#42A5F5',
    secondary: '#FF9800', // Turuncu - mavi ile kontrast
    secondaryLight: '#FFB74D',
    secondaryDark: '#F57C00',
    
    // İşlevsel renkler - daha canlı
    success: '#4CAF50',
    error: '#FF5252',
    info: '#29B6F6',
    warning: '#FFC107',
    
    // Arka plan ve metin renkleri
    paper: '#1A2035', // Daha koyu mavi-gri kağıt rengi
    background: '#111827', // Çok koyu mavi arka plan
    textPrimary: '#FFFFFF', // Beyaz metin
    textSecondary: '#B0BEC5', // Soluk mavi-gri ikincil metin
    
    // Panel ve kart arka planları
    cardBackground: '#1E293B', // Koyu mavi-gri kart arka planı
    inputBackground: '#283147', // Biraz daha açık giriş alanı arka planı
    
    // Sınır ve ayırıcı
    divider: '#2A3958', // Koyu mavi-gri ayırıcı
    border: '#3A486B'  // Daha açık sınır rengi
  };

  useEffect(() => {
    // Initialize selected strategies from props if available
    if (values.selected_strategies && values.selected_strategies.length > 0) {
      setSelectedStrategies(values.selected_strategies);
    }
  }, [values.selected_strategies]);

  const handleOptimizationMethodChange = (event) => {
    const newMethod = event.target.value;
    setOptimizationMethod(newMethod);
    onChange({ 
      ...values, 
      optimization_method: newMethod 
    });
  };

  const handleStrategiesChange = (event, newStrategies) => {
    // Ensure at least one strategy is selected
    if (newStrategies.length === 0) return;
    
    setSelectedStrategies(newStrategies);
    onChange({ 
      ...values, 
      selected_strategies: newStrategies 
    });
  };

  const handleSliderChange = (field) => (event, newValue) => {
    onChange({ ...values, [field]: newValue });
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.type === 'number' 
      ? parseFloat(event.target.value) 
      : event.target.value;
    onChange({ ...values, [field]: value });
  };

  // Method info details
  const methodInfo = {
    classic: {
      title: "Grid Algorithm",
      icon: <GridOnIcon sx={{ fontSize: 36, color: darkBlueColors.primary }} />,
      description: "Systematically evaluates various parameter combinations using a grid search approach",
      color: darkBlueColors.primary
    },
    genetic: {
      title: "Evolutionary Algorithm",
      icon: <AccountTreeIcon sx={{ fontSize: 36, color: darkBlueColors.secondary }} />,
      description: "Uses advanced genetic algorithms to intelligently search for optimal structures",
      color: darkBlueColors.secondary
    }
  };

  // Strategy info
  const strategyInfo = {
    equal: {
      title: "Equal Distribution",
      icon: <BalanceIcon />,
      description: "Allocates equal nominal amounts across all tranches",
      color: darkBlueColors.primary
    },
    increasing: {
      title: "Increasing by Maturity",
      icon: <TrendingUpIcon />,
      description: "Higher allocations for longer maturity tranches",
      color: darkBlueColors.success
    },
    decreasing: {
      title: "Decreasing by Maturity",
      icon: <TrendingDownIcon />,
      description: "Higher allocations for shorter maturity tranches",
      color: darkBlueColors.error
    },
    middle_weighted: {
      title: "Middle-Weighted",
      icon: <EqualizerIcon />,
      description: "Higher allocations for middle maturity tranches",
      color: darkBlueColors.info
    }
  };

  return (
    <Box>
      <Typography 
        variant="subtitle1" 
        gutterBottom 
        fontWeight="medium" 
        sx={{ 
          mb: 3, 
          color: darkBlueColors.textPrimary,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        Select an optimization method and configure parameters to find the optimal structure for your asset-backed securities
      </Typography>
      
      {/* Method Selection */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.keys(methodInfo).map((method) => (
          <Grid item xs={12} sm={6} key={method}>
            <Card 
              elevation={3}
              sx={{ 
                borderRadius: 2,
                border: `1px solid ${optimizationMethod === method 
                  ? alpha(methodInfo[method].color, 0.7) 
                  : alpha(darkBlueColors.border, 0.5)}`,
                backgroundColor: optimizationMethod === method 
                  ? alpha(methodInfo[method].color, 0.15)
                  : darkBlueColors.cardBackground,
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                height: '100%',
                '&:hover': {
                  borderColor: alpha(methodInfo[method].color, 0.8),
                  backgroundColor: alpha(methodInfo[method].color, 0.1),
                  boxShadow: `0 0 10px ${alpha(methodInfo[method].color, 0.3)}`
                }
              }}
              onClick={() => {
                setOptimizationMethod(method);
                onChange({ ...values, optimization_method: method });
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <FormControlLabel
                  value={method}
                  control={
                    <Radio 
                      checked={optimizationMethod === method}
                      onChange={() => {}}
                      sx={{
                        color: alpha(darkBlueColors.textSecondary, 0.7),
                        '&.Mui-checked': {
                          color: methodInfo[method].color,
                        },
                      }}
                    />
                  }
                  label={
                    <Box sx={{ ml: 0.5 }}>
                      {methodInfo[method].icon}
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          mt: 1.5, 
                          fontWeight: 500, 
                          color: optimizationMethod === method 
                            ? methodInfo[method].color 
                            : darkBlueColors.textPrimary
                        }}
                      >
                        {methodInfo[method].title}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, minHeight: 60, color: darkBlueColors.textSecondary }}>
                        {methodInfo[method].description}
                      </Typography>
                    </Box>
                  }
                  sx={{ 
                    mx: 0, 
                    alignItems: 'flex-start', 
                    '& .MuiFormControlLabel-label': { width: '100%' } 
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Strategy Selection for Classic Method */}
      {optimizationMethod === 'classic' && (
        <Box sx={{ 
          mb: 4, 
          p: 3, 
          backgroundColor: alpha(darkBlueColors.primary, 0.08), 
          borderRadius: 2, 
          border: `1px solid ${alpha(darkBlueColors.primary, 0.3)}`,
          boxShadow: `0 2px 8px ${alpha(darkBlueColors.background, 0.5)}`
        }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 2, 
              color: darkBlueColors.primary,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}
          >
            <GridOnIcon sx={{ mr: 1 }} /> Select Distribution Strategies
            <Tooltip title="Select one or more strategies to include in the grid search process. The system will determine which strategy produces the best results." sx={{ ml: 1 }}>
              <IconButton size="small" sx={{ color: alpha(darkBlueColors.textPrimary, 0.7) }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2, color: darkBlueColors.textSecondary }}>
            Select the strategies you want to include in the grid search. The system will evaluate all selected strategies across the parameter space and identify the combination that produces the best results.
          </Typography>
          
          <Grid container spacing={2}>
            {Object.keys(strategyInfo).map((strategy) => (
              <Grid item xs={12} sm={6} md={3} key={strategy}>
                <Paper 
                  elevation={2}
                  sx={{
                    p: 2,
                    border: `1px solid ${selectedStrategies.includes(strategy) 
                      ? alpha(strategyInfo[strategy].color, 0.7) 
                      : alpha(darkBlueColors.border, 0.3)}`,
                    backgroundColor: selectedStrategies.includes(strategy) 
                      ? alpha(strategyInfo[strategy].color, 0.15)
                      : darkBlueColors.cardBackground,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    '&:hover': {
                      borderColor: alpha(strategyInfo[strategy].color, 0.8),
                      backgroundColor: alpha(strategyInfo[strategy].color, 0.1),
                      boxShadow: `0 0 8px ${alpha(strategyInfo[strategy].color, 0.2)}`
                    }
                  }}
                  onClick={() => {
                    const newSelection = selectedStrategies.includes(strategy)
                      ? selectedStrategies.filter(s => s !== strategy)
                      : [...selectedStrategies, strategy];
                    
                    if (newSelection.length > 0) {
                      handleStrategiesChange(null, newSelection);
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Checkbox 
                      checked={selectedStrategies.includes(strategy)}
                      size="small"
                      sx={{ 
                        p: 0.5, 
                        mr: 1,
                        color: alpha(darkBlueColors.textSecondary, 0.5),
                        '&.Mui-checked': {
                          color: strategyInfo[strategy].color,
                        }, 
                      }}
                    />
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      color: selectedStrategies.includes(strategy) 
                        ? strategyInfo[strategy].color 
                        : darkBlueColors.textPrimary
                    }}>
                      {React.cloneElement(strategyInfo[strategy].icon, { 
                        sx: { 
                          mr: 1,
                          color: selectedStrategies.includes(strategy) 
                            ? strategyInfo[strategy].color 
                            : alpha(darkBlueColors.textSecondary, 0.7)
                        } 
                      })}
                      <Typography 
                        variant="subtitle2" 
                        fontWeight={500}
                        sx={{ 
                          color: selectedStrategies.includes(strategy) 
                            ? strategyInfo[strategy].color 
                            : darkBlueColors.textPrimary
                        }}
                      >
                        {strategyInfo[strategy].title}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem', color: darkBlueColors.textSecondary }}>
                    {strategyInfo[strategy].description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Divider sx={{ my: 3, borderColor: alpha(darkBlueColors.divider, 0.7) }} />
      
      <Box sx={{ 
        backgroundColor: darkBlueColors.cardBackground, 
        p: 3, 
        borderRadius: 2,
        border: `1px solid ${alpha(darkBlueColors.border, 0.3)}`,
        boxShadow: `0 2px 10px ${alpha(darkBlueColors.background, 0.8)}`
      }}>
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            color: methodInfo[optimizationMethod].color,
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}
        >
          {methodInfo[optimizationMethod].title} Configuration
        </Typography>
        
        {/* Method-specific settings */}
        {optimizationMethod === 'classic' && (
          <Box sx={{ mt: 3 }}>
            <Typography 
              variant="subtitle2" 
              gutterBottom 
              fontWeight="medium" 
              sx={{ color: darkBlueColors.textPrimary }}
            >
              Grid Search Parameters
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 4 }}>
              <FormLabel sx={{ color: darkBlueColors.textPrimary }}>Class A Tranches Range</FormLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ color: darkBlueColors.textPrimary }}>{values.a_tranches_range[0]}</Typography>
                <Slider
                  value={values.a_tranches_range}
                  onChange={handleSliderChange('a_tranches_range')}
                  min={1}
                  max={10}
                  step={1}
                  valueLabelDisplay="auto"
                  aria-labelledby="a-tranches-range-slider"
                  sx={{ 
                    mx: 2,
                    color: darkBlueColors.primary,
                    '& .MuiSlider-thumb': {
                      boxShadow: `0 0 0 2px ${darkBlueColors.cardBackground}, 0 0 0 4px ${alpha(darkBlueColors.primary, 0.8)}`,
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: alpha(darkBlueColors.textSecondary, 0.3),
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: darkBlueColors.primary,
                    },
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: darkBlueColors.primary,
                    },
                  }}
                />
                <Typography sx={{ color: darkBlueColors.textPrimary }}>{values.a_tranches_range[1]}</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: darkBlueColors.textSecondary }}>
                Number of Class A tranches to consider in the grid search
              </Typography>
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 4 }}>
              <FormLabel sx={{ color: darkBlueColors.textPrimary }}>Maturity Range (days)</FormLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ color: darkBlueColors.textPrimary }}>{values.maturity_range[0]}</Typography>
                <Slider
                  value={values.maturity_range}
                  onChange={handleSliderChange('maturity_range')}
                  min={30}
                  max={365}
                  step={5}
                  valueLabelDisplay="auto"
                  aria-labelledby="maturity-range-slider"
                  sx={{ 
                    mx: 2,
                    color: darkBlueColors.primary,
                    '& .MuiSlider-thumb': {
                      boxShadow: `0 0 0 2px ${darkBlueColors.cardBackground}, 0 0 0 4px ${alpha(darkBlueColors.primary, 0.8)}`,
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: alpha(darkBlueColors.textSecondary, 0.3),
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: darkBlueColors.primary,
                    },
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: darkBlueColors.primary,
                    },
                  }}
                />
                <Typography sx={{ color: darkBlueColors.textPrimary }}>{values.maturity_range[1]}</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: darkBlueColors.textSecondary }}>
                Range of maturity periods to evaluate in the grid (in days)
              </Typography>
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 4 }}>
              <FormLabel sx={{ color: darkBlueColors.textPrimary }}>Maturity Step</FormLabel>
              <Slider
                value={values.maturity_step}
                onChange={handleSliderChange('maturity_step')}
                min={5}
                max={30}
                step={5}
                valueLabelDisplay="auto"
                aria-labelledby="maturity-step-slider"
                marks={[
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 15, label: '15' },
                  { value: 20, label: '20' },
                  { value: 25, label: '25' },
                  { value: 30, label: '30' },
                ]}
                sx={{ 
                  color: darkBlueColors.primary,
                  '& .MuiSlider-markLabel': {
                    color: darkBlueColors.textSecondary,
                  },
                  '& .MuiSlider-thumb': {
                    boxShadow: `0 0 0 2px ${darkBlueColors.cardBackground}, 0 0 0 4px ${alpha(darkBlueColors.primary, 0.8)}`,
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: alpha(darkBlueColors.textSecondary, 0.3),
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: darkBlueColors.primary,
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: darkBlueColors.primary,
                  },
                }}
              />
              <Typography variant="body2" sx={{ color: darkBlueColors.textSecondary }}>
                Grid resolution for maturity values (smaller steps = more thorough search)
              </Typography>
            </FormControl>
          </Box>
        )}
        
        {optimizationMethod === 'genetic' && (
          <Box sx={{ mt: 3 }}>
            <Typography 
              variant="subtitle2" 
              gutterBottom 
              fontWeight="medium" 
              sx={{ color: darkBlueColors.textPrimary }}
            >
              Evolutionary Algorithm Settings
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <FormLabel sx={{ color: darkBlueColors.textPrimary }}>Population Size</FormLabel>
              <Slider
                value={values.population_size || 50}
                onChange={(e, newValue) => onChange({ ...values, population_size: newValue })}
                min={10}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                marks={[
                  { value: 10, label: '10' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                ]}
                sx={{ 
                  color: darkBlueColors.secondary,
                  '& .MuiSlider-markLabel': {
                    color: darkBlueColors.textSecondary,
                  },
                  '& .MuiSlider-thumb': {
                    boxShadow: `0 0 0 2px ${darkBlueColors.cardBackground}, 0 0 0 4px ${alpha(darkBlueColors.secondary, 0.8)}`,
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: alpha(darkBlueColors.textSecondary, 0.3),
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: darkBlueColors.secondary,
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: darkBlueColors.secondary,
                  },
                }}
              />
              <Typography variant="body2" sx={{ color: darkBlueColors.textSecondary }}>
                Number of individuals in each generation - larger populations can find better solutions but take longer
              </Typography>
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 4 }}>
              <FormLabel sx={{ color: darkBlueColors.textPrimary }}>Number of Generations</FormLabel>
              <Slider
                value={values.num_generations || 40}
                onChange={(e, newValue) => onChange({ ...values, num_generations: newValue })}
                min={10}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                marks={[
                  { value: 10, label: '10' },
                  { value: 40, label: '40' },
                  { value: 100, label: '100' },
                ]}
                sx={{ 
                  color: darkBlueColors.secondary,
                  '& .MuiSlider-markLabel': {
                    color: darkBlueColors.textSecondary,
                  },
                  '& .MuiSlider-thumb': {
                    boxShadow: `0 0 0 2px ${darkBlueColors.cardBackground}, 0 0 0 4px ${alpha(darkBlueColors.secondary, 0.8)}`,
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: alpha(darkBlueColors.textSecondary, 0.3),
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: darkBlueColors.secondary,
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: darkBlueColors.secondary,
                  },
                }}
              />
              <Typography variant="body2" sx={{ color: darkBlueColors.textSecondary }}>
                Number of evolutionary cycles to run - more generations improve results but take longer
              </Typography>
            </FormControl>
          </Box>
        )}
        
        <Divider sx={{ my: 3, borderColor: alpha(darkBlueColors.divider, 0.7) }} />
        
        {/* Common settings for all optimization methods - İsteğe göre metin değişiklikleri burada yapıldı */}
        <Typography 
          variant="subtitle2" 
          gutterBottom 
          fontWeight="medium" 
          sx={{ color: darkBlueColors.textPrimary }}
        >
          Common Optimization Parameters
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth sx={{ mb: 4 }}>
              <FormLabel sx={{ color: darkBlueColors.textPrimary }}>Class B Oranı</FormLabel>
              <TextField
                value={values.min_class_b_percent}
                onChange={handleInputChange('min_class_b_percent')}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end" sx={{ color: darkBlueColors.textSecondary }}>%</InputAdornment>,
                  inputProps: { min: 5, max: 30, step: 0.5 },
                }}
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: darkBlueColors.inputBackground,
                    color: darkBlueColors.textPrimary,
                    '& fieldset': {
                      borderColor: alpha(darkBlueColors.border, 0.5),
                    },
                    '&:hover fieldset': {
                      borderColor: darkBlueColors.primary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: darkBlueColors.primary,
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: darkBlueColors.textPrimary,
                  },
                }}
              />
              <Typography variant="body2" sx={{ color: darkBlueColors.textSecondary, mt: 1 }}>
                Minimum percentage of total nominal to allocate to Class B
              </Typography>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth sx={{ mb: 4 }}>
              <FormLabel sx={{ color: darkBlueColors.textPrimary }}>Effective Coupon Rate</FormLabel>
              <TextField
                value={values.target_class_b_coupon_rate}
                onChange={handleInputChange('target_class_b_coupon_rate')}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end" sx={{ color: darkBlueColors.textSecondary }}>%</InputAdornment>,
                  inputProps: { min: 10, max: 100, step: 0.5 },
                }}
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: darkBlueColors.inputBackground,
                    color: darkBlueColors.textPrimary,
                    '& fieldset': {
                      borderColor: alpha(darkBlueColors.border, 0.5),
                    },
                    '&:hover fieldset': {
                      borderColor: darkBlueColors.primary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: darkBlueColors.primary,
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: darkBlueColors.textPrimary,
                  },
                }}
              />
              <Typography variant="body2" sx={{ color: darkBlueColors.textSecondary, mt: 1 }}>
                Target annual coupon rate for Class B tranche
              </Typography>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth sx={{ mb: 4 }}>
              <FormLabel sx={{ color: darkBlueColors.textPrimary }}>Additional Days for Class B</FormLabel>
              <TextField
                value={values.additional_days_for_class_b}
                onChange={handleInputChange('additional_days_for_class_b')}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end" sx={{ color: darkBlueColors.textSecondary }}>days</InputAdornment>,
                  inputProps: { min: 1, max: 180, step: 1 },
                }}
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: darkBlueColors.inputBackground,
                    color: darkBlueColors.textPrimary,
                    '& fieldset': {
                      borderColor: alpha(darkBlueColors.border, 0.5),
                    },
                    '&:hover fieldset': {
                      borderColor: darkBlueColors.primary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: darkBlueColors.primary,
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: darkBlueColors.textPrimary,
                  },
                }}
              />
              <Typography variant="body2" sx={{ color: darkBlueColors.textSecondary, mt: 1 }}>
                Additional days to add to the last cash flow date for Class B maturity
              </Typography>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default OptimizationSettingsForm;