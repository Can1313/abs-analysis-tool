// frontend/src/services/apiService.js
import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Ortak axios istemcisi
 */
const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // 5 dakika (300 000 ms) – optimizasyon işlemleri uzun sürebilir
  timeout: 300_000,
});

/* --------------------------------------------------------------------- */
/*                               UPLOAD                                  */
/* --------------------------------------------------------------------- */

/**
 * Excel dosyası yükle
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
 * Hesaplama servisi.
 * 2. parametre olarak optimizasyon çıktısı gönderilirse
 * Class B nominali otomatik eklenir.
 *
 * @param {Object} params   – CalculationRequest gövdesi
 * @param {Object|null} optResult – OptimizationResult (opsiyonel)
 * @returns {Promise<Object>}
 */
const calculateResults = async (params, optResult = null) => {
  try {
    // İsteğe bağlı Class B nominal entegrasyonu
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
 * Yapı optimizasyonu (classic | genetic)
 *
 * @param {Object} params – OptimizationRequest gövdesi
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

    // İptal edilebilir istek oluştur
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    // 5 dakikada zaman aşımı
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
 * Sunucudan optimizasyon ilerlemesini sorgula
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
 * Run stress test on a structure with given parameters
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
 * Run enhanced stress test with advanced cash flow modeling
 * @param {Object} params - EnhancedStressTestRequest body
 * @returns {Promise<Object>}
 */
const runEnhancedStressTest = async (params) => {
  try {
    console.log('Running enhanced stress test with params:', params);
    
    const response = await apiClient.post('/enhanced-stress-test/', params);
    
    console.log('Enhanced stress test successful');
    return response.data;
  } catch (error) {
    console.error('Error running enhanced stress test:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
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
  runStressTest,
  runEnhancedStressTest
};