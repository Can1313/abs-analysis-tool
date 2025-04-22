// src/services/apiService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Shared axios client
 */
const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // 5 minutes (300,000 ms) - optimization processes can take long
  timeout: 300_000,
});

/* --------------------------------------------------------------------- */
/*                               UPLOAD                                  */
/* --------------------------------------------------------------------- */

/**
 * Upload Excel file
 * @param {File} file
 * @returns {Promise<Object>}
 */
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    console.log('Uploading file:', file.name);

    const response = await axios.post(
      `${API_URL}/upload-excel/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    console.log('File upload successful');
    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/* --------------------------------------------------------------------- */
/*                             CALCULATION                               */
/* --------------------------------------------------------------------- */

/**
 * Calculation service.
 * If optimization output is sent as 2nd parameter,
 * Class B nominal is automatically added.
 *
 * @param {Object} params - CalculationRequest body
 * @param {Object|null} optResult - OptimizationResult (optional)
 * @returns {Promise<Object>}
 */
const calculateResults = async (params, optResult = null) => {
  try {
    // Optional Class B nominal integration
    const finalParams = { ...params };

    if (
      optResult &&
      optResult.class_b_nominal &&
      Number(optResult.class_b_nominal) > 0
    ) {
      finalParams.tranche_b = {
        ...(finalParams.tranche_b || {}),
        nominal: optResult.class_b_nominal,
      };
    }

    console.log('Calculating results with params:', finalParams);

    const response = await apiClient.post('/calculate/', finalParams);

    console.log('Calculation successful');
    return response.data;
  } catch (error) {
    console.error('Error calculating results:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/* --------------------------------------------------------------------- */
/*                             OPTIMIZATION                              */
/* --------------------------------------------------------------------- */

/**
 * Structure optimization (classic | genetic)
 *
 * @param {Object} params - OptimizationRequest body
 * @param {'classic'|'genetic'} [method='classic']
 * @returns {Promise<Object>}
 */
const optimizeStructure = async (params, method = 'classic') => {
  try {
    console.log(`Starting optimization with method: ${method}`);
    console.log(
      'Optimization params:',
      JSON.stringify(params, null, 2)
    );

    // Create cancellable request
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    // 5 minute timeout
    const timeout = setTimeout(() => {
      source.cancel(
        'Operation timeout: The optimization process took too long'
      );
    }, 300_000);

    const response = await apiClient.post(
      `/optimize/${method}/`,
      params,
      { cancelToken: source.token }
    );

    clearTimeout(timeout);

    console.log(`${method} optimization completed successfully`);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} optimization:`, error);

    if (axios.isCancel(error)) {
      console.log('Request canceled:', error.message);
      throw new Error(
        'Optimization process was canceled: ' + error.message
      );
    }

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);

      const status = error.response.status;
      let message = 'Optimization failed';

      switch (status) {
        case 400:
          message =
            'Invalid optimization parameters: ' +
            (error.response.data.detail ||
              'Please check your parameters');
          break;
        case 500:
          message =
            'Server error during optimization. The calculation may be too complex.';
          break;
        case 504:
          message =
            'Optimization timed out. Try again with simpler parameters.';
          break;
        default:
          message =
            `Optimization error (${status}): ` +
            (error.response.data.detail || error.message);
      }

      throw new Error(message);
    }

    throw error;
  }
};

/* --------------------------------------------------------------------- */
/*                           PROGRESS POLLING                            */
/* --------------------------------------------------------------------- */

/**
 * Poll optimization progress from server
 * @returns {Promise<Object>}
 */
const pollOptimizationProgress = async () => {
  try {
    const response = await apiClient.get('/optimize/progress/');
    return response.data;
  } catch (error) {
    console.error('Error polling optimization progress:', error);
    return {
      progress: 0,
      phase: 'Error',
      message: 'Failed to get progress information',
      error: true,
    };
  }
};

/* --------------------------------------------------------------------- */
/*                            STRESS TESTING                             */
/* --------------------------------------------------------------------- */

/**
 * Format structure for stress test API
 * @param {Object} savedStructure - Saved structure from context
 * @returns {Object} - Formatted structure for API
 */
const formatStructureForStressTest = (savedStructure) => {
  console.log('Formatting structure for stress test:', savedStructure);
  
  // Create a_tranches array from tranchesA
  const a_tranches = [];
  
  // Check if tranches_a exists in the saved structure
  const tranchesArray = savedStructure.tranches_a || savedStructure.tranchesA || [];
  console.log('Found tranches array:', tranchesArray);
  
  if (Array.isArray(tranchesArray) && tranchesArray.length > 0) {
    for (const tranche of tranchesArray) {
      console.log('Processing tranche:', tranche);
      a_tranches.push({
        maturity_days: Number(tranche.maturity_days),
        base_rate: Number(tranche.base_rate),
        spread: Number(tranche.spread),
        reinvest_rate: Number(tranche.reinvest_rate),
        nominal: Number(tranche.nominal)
      });
    }
  } else {
    console.warn('No tranches_a found in the structure');
  }
  
  // Format tranche_b
  const trancheB = savedStructure.tranche_b || savedStructure.trancheB || {};
  console.log('Found tranche B:', trancheB);
  
  const b_tranche = {
    maturity_days: Number(trancheB.maturity_days || 180),
    base_rate: Number(trancheB.base_rate || 0),
    spread: Number(trancheB.spread || 0),
    reinvest_rate: Number(trancheB.reinvest_rate || 0),
    nominal: Number(trancheB.nominal || 0)
  };
  
  // If no nominal is provided, calculate it as 10% of total structure
  if (!b_tranche.nominal || b_tranche.nominal <= 0) {
    const total_a_nominal = a_tranches.reduce((sum, t) => sum + t.nominal, 0);
    // Calculate using the percentage formula (10% / 90%)
    const percent_b = 10;
    b_tranche.nominal = (total_a_nominal * percent_b) / (100 - percent_b);
    b_tranche.nominal = Math.round(b_tranche.nominal / 1000) * 1000;
    console.log('Calculated B nominal:', b_tranche.nominal);
  }
  
  // Format date
  let start_date = savedStructure.start_date || 
                   savedStructure.general_settings?.start_date || 
                   new Date().toISOString().split('T')[0];
  
  console.log('Start date before formatting:', start_date);
  
  // If it's a Date object, convert to ISO format
  if (start_date instanceof Date) {
    start_date = start_date.toISOString().split('T')[0];
  }
  
  console.log('Start date after formatting:', start_date);
  
  // Return formatted structure for API
  const formattedStructure = {
    start_date: start_date,
    a_maturities: a_tranches.map(t => t.maturity_days),
    a_base_rates: a_tranches.map(t => t.base_rate),
    a_spreads: a_tranches.map(t => t.spread),
    a_reinvest_rates: a_tranches.map(t => t.reinvest_rate),
    a_nominals: a_tranches.map(t => t.nominal),
    b_maturity: b_tranche.maturity_days,
    b_base_rate: b_tranche.base_rate,
    b_spread: b_tranche.spread,
    b_reinvest_rate: b_tranche.reinvest_rate,
    b_nominal: b_tranche.nominal,
    ops_expenses: Number(savedStructure.general_settings?.operational_expenses || 0)
  };
  
  console.log('Final formatted structure:', formattedStructure);
  return formattedStructure;
};

/**
 * Run a basic stress test on a structure
 * @param {Object} params - StressTestRequest body
 * @returns {Promise<Object>}
 */
const runStressTest = async (params) => {
  try {
    console.log('Running stress test with params:', params);
    
    const response = await apiClient.post('/stress-test/', params);
    
    console.log('Stress test successful');
    return response.data;
  } catch (error) {
    console.error('Error running stress test:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Run enhanced stress test with detailed cash flow modeling
 * @param {Object} params - EnhancedStressTestRequest body
 * @returns {Promise<Object>}
 */
const runEnhancedStressTest = async (params) => {
  try {
    console.log('Running enhanced stress test with params:', params);
    
    // Log structure details
    console.log('Structure details:', JSON.stringify(params.structure, null, 2));
    console.log('Scenario details:', JSON.stringify(params.scenario, null, 2));
    
    // Log specific fields to debug date issues
    console.log('Start date:', params.structure.start_date);
    console.log('Start date type:', typeof params.structure.start_date);
    
    const response = await apiClient.post('/enhanced-stress-test/', params);
    
    console.log('Enhanced stress test successful');
    return response.data;
  } catch (error) {
    console.error('Error running enhanced stress test:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
      
      // Extract specific validation errors
      if (error.response.data && error.response.data.detail) {
        console.error('Validation errors:', error.response.data.detail);
      }
    }
    throw error;
  }
};

/* --------------------------------------------------------------------- */
/*                                EXPORT                                 */
/* --------------------------------------------------------------------- */

export {
  uploadFile,
  calculateResults,
  optimizeStructure,
  pollOptimizationProgress,
  formatStructureForStressTest,
  runStressTest,
  runEnhancedStressTest
};