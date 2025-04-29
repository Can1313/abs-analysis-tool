/* -----------------------------------------------------------
 *  Global state & helpers (React Context)
 * --------------------------------------------------------- */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

/* localStorage parse – "undefined" vb. hataları engeller */
const safeParse = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

/* -----------------------------------------------------------
 *              DEFAULT SETTINGS
 * --------------------------------------------------------- */
const DEFAULT_SETTINGS = {
  previous: {
    generalSettings: {
      start_date: new Date(2025, 1, 13),
      operational_expenses: 7_928_640,
      min_buffer: 5,
    },
    tranchesA: [
      { maturity_days: 61, base_rate: 45.6, spread: 0, reinvest_rate: 40, nominal: 480_000_000 },
      { maturity_days: 120, base_rate: 44.5, spread: 0, reinvest_rate: 37.25, nominal: 460_000_000 },
      { maturity_days: 182, base_rate: 43.3, spread: 0, reinvest_rate: 32.5, nominal: 425_000_000 },
      { maturity_days: 274, base_rate: 42.5, spread: 0, reinvest_rate: 30, nominal: 400_000_000 },
    ],
    trancheB: {
      maturity_days: 300,
      base_rate: 0,
      spread: 0,
      reinvest_rate: 25.5,
      /* nominal boş – optimizasyon gelince dolacak */
    }
  },
  new: {
    generalSettings: {
      start_date: new Date(2025, 3, 16), // April 16, 2025
      operational_expenses: 10_000_000,
      min_buffer: 5,
    },
    tranchesA: [
      { maturity_days: 59, base_rate: 45.5, spread: 0, reinvest_rate: 41.0, nominal: 980_000_000 },
      { maturity_days: 94, base_rate: 45.5, spread: 0, reinvest_rate: 38.5, nominal: 600_000_000 },
      { maturity_days: 150, base_rate: 45.5, spread: 0, reinvest_rate: 35.0, nominal: 590_000_000 },
      { maturity_days: 189, base_rate: 45.5, spread: 0, reinvest_rate: 33.5, nominal: 420_000_000 },
      { maturity_days: 275, base_rate: 45.5, spread: 0, reinvest_rate: 31.5, nominal: 579_600_000 },
    ],
    trancheB: {
      maturity_days: 346,
      base_rate: 0,
      spread: 0,
      reinvest_rate: 30.0,
      // For new default settings, Class B percentage should be 10%
      class_b_percent: 10 // Will be used to calculate nominal dynamically
    }
  }
};

/* -----------------------------------------------------------
 *              <DataProvider>
 * --------------------------------------------------------- */
export const DataProvider = ({ children }) => {
  /* ------------------- Core flags ------------------ */
  const [cashFlowData, setCashFlowData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDefaults, setSelectedDefaults] = useState(() => 
    localStorage.getItem('selectedDefaults') || 'previous'
  );

  /* ---------------- Form defaults ------------------ */
  const [generalSettings, setGeneralSettings] = useState(() => 
    safeParse('generalSettings', DEFAULT_SETTINGS[selectedDefaults].generalSettings)
  );
  
  const [tranchesA, setTranchesA] = useState(() => 
    safeParse('tranchesA', DEFAULT_SETTINGS[selectedDefaults].tranchesA)
  );
  
  const [trancheB, setTrancheB] = useState(() => 
    safeParse('trancheB', DEFAULT_SETTINGS[selectedDefaults].trancheB)
  );

  const [npvSettings, setNpvSettings] = useState({
    method: 'weighted_avg_rate',
    custom_rate: 40,
  });

  /* ---------------- Optimization defaults ------------------ */
  const [optimizationSettings, setOptimizationSettings] = useState({
    optimization_method: 'classic',
    a_tranches_range: [2, 6],
    maturity_range: [32, 365],
    maturity_step: 10,
    min_class_b_percent: 10,
    target_class_b_coupon_rate: 30,
    additional_days_for_class_b: 10,
    population_size: 50,
    num_generations: 40,
  });

  /* -------------- originals for <Reset> -------------- */
  const [origA, setOrigA] = useState(null);
  const [origB, setOrigB] = useState(null);
  useEffect(() => {
    if (!origA) setOrigA(JSON.parse(JSON.stringify(tranchesA)));
    if (!origB) setOrigB(JSON.parse(JSON.stringify(trancheB)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------ Stored results ---------------- */
  const [calculationResults, setCalculationResults] = useState(() =>
    safeParse('calculationResults', null),
  );
  const [optimizationResults, setOptimizationResults] = useState(() =>
    safeParse('optimizationResults', null),
  );
  const [previousCalculationResults, setPreviousCalc] = useState(() =>
    safeParse('previousCalculationResults', null),
  );
  const [savedResults, setSavedResults] = useState(() =>
    safeParse('savedResults', []),
  );
  const [multipleComparisonResults, setMultiResults] = useState(() =>
    safeParse('multipleComparisonResults', []),
  );

  /* -------------- Default settings selection -------------- */
  // Update everything when default settings change
  useEffect(() => {
    localStorage.setItem('selectedDefaults', selectedDefaults);
    setGeneralSettings(DEFAULT_SETTINGS[selectedDefaults].generalSettings);
    setTranchesA(DEFAULT_SETTINGS[selectedDefaults].tranchesA);
    
    // Make a deep copy of the tranche B
    const newTrancheB = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[selectedDefaults].trancheB));
    
    // If it's the new model, calculate and set Class B nominal based on percentage
    if (selectedDefaults === 'new' && newTrancheB.class_b_percent) {
      // Calculate total Class A nominal
      const totalClassANominal = DEFAULT_SETTINGS[selectedDefaults].tranchesA.reduce(
        (sum, tranche) => sum + tranche.nominal, 0
      );
      
      // Calculate Class B nominal using the formula:
      // class_b_nominal = totalClassANominal * (classBPercent / (100 - classBPercent))
      const classBPercent = newTrancheB.class_b_percent;
      const b_percent = classBPercent / 100;
      let b_nominal = (totalClassANominal * b_percent) / (1 - b_percent);
      
      // Round to nearest 1000
      b_nominal = Math.round(b_nominal / 1000) * 1000;
      
      // Set the calculated nominal
      newTrancheB.nominal = b_nominal;
      
      console.log(`Using new model with 10% Class B. Total Class A: ${totalClassANominal}, Class B nominal: ${b_nominal}`);
    }
    
    setTrancheB(newTrancheB);
    
    // Update originals for reset functionality
    setOrigA(JSON.parse(JSON.stringify(DEFAULT_SETTINGS[selectedDefaults].tranchesA)));
    setOrigB(JSON.parse(JSON.stringify(newTrancheB)));
  }, [selectedDefaults]);

  /* -------------- localStorage wrappers -------------- */
  const wrapLocal = (setter, key) => (val) => {
    setter(val);
    if (val && (Array.isArray(val) ? val.length : true))
      localStorage.setItem(key, JSON.stringify(val));
    else localStorage.removeItem(key);
  };

  const setCalcResLS   = wrapLocal(setCalculationResults, 'calculationResults');
  const setOptResLS    = wrapLocal(setOptimizationResults, 'optimizationResults');
  const setPrevCalcLS  = wrapLocal(setPreviousCalc, 'previousCalculationResults');
  const setSavedResLS  = wrapLocal(setSavedResults, 'savedResults');
  const setMultiResLS  = wrapLocal(setMultiResults, 'multipleComparisonResults');

  /* ---------------------- helpers -------------------- */
  const saveResult = (result, name, methodType) => {
    if (!result) return false;
    const stamped = {
      ...result,
      id: Date.now().toString(),
      savedName: name,
      timestamp: new Date().toISOString(),
      methodType: methodType || result.method_type || 'manual',
    };
    setSavedResLS([...savedResults, stamped]);
    return true;
  };
  const deleteSavedResult  = (id) => setSavedResLS(savedResults.filter(r => r.id !== id));
  const clearSavedResults  = () => setSavedResLS([]);
  const clearComparisonData = () => setMultiResLS([]);

  const resetToDefaults = () => {
    if (origA && origB) {
      setTranchesA(JSON.parse(JSON.stringify(origA)));
      setTrancheB(JSON.parse(JSON.stringify(origB)));
      return true;
    }
    return false;
  };

  const clearData = () => {
    setCashFlowData(null);
    setCalcResLS(null);
    setOptResLS(null);
    setError(null);
  };

  /* ---------- request constructors ---------- */
  const createCalculationRequest = () => {
    // Check if we're using the new default settings with Class B percentage
    const isNewDefault = selectedDefaults === 'new';
    const classBPercent = isNewDefault && trancheB.class_b_percent ? trancheB.class_b_percent : null;
    
    // Calculate Class B nominal if percentage is provided
    let modifiedTrancheB = { ...trancheB };
    
    if (classBPercent) {
      // Calculate total Class A nominal
      const totalClassANominal = tranchesA.reduce((sum, tranche) => sum + tranche.nominal, 0);
      
      // Calculate Class B nominal using the formula:
      // class_b_nominal = totalClassANominal * (classBPercent / (100 - classBPercent))
      const b_percent = classBPercent / 100;
      let b_nominal = (totalClassANominal * b_percent) / (1 - b_percent);
      
      // Round to nearest 1000
      b_nominal = Math.round(b_nominal / 1000) * 1000;
      
      // Set the calculated nominal
      modifiedTrancheB.nominal = b_nominal;
    }
    
    return {
      general_settings: {
        start_date: generalSettings.start_date.toISOString().split('T')[0],
        operational_expenses: generalSettings.operational_expenses,
        min_buffer: generalSettings.min_buffer,
      },
      tranches_a: tranchesA,
      tranche_b: modifiedTrancheB,
      npv_settings: npvSettings,
    };
  };

  const createOptimizationRequest = () => ({
    optimization_settings: optimizationSettings,
    general_settings: {
      start_date: generalSettings.start_date.toISOString().split('T')[0],
      operational_expenses: generalSettings.operational_expenses,
      min_buffer: generalSettings.min_buffer,
    },
    selected_default_model: selectedDefaults // Added this line to pass the selected model
  });

  /* ---------------- context value ------------------- */
  const value = {
    /* raw data */
    cashFlowData,
    setCashFlowData,
    isLoading,
    setIsLoading,
    error,
    setError,

    /* form state */
    generalSettings,
    setGeneralSettings,
    tranchesA,
    setTranchesA,
    trancheB,
    setTrancheB,
    npvSettings,
    setNpvSettings,

    /* default settings selection */
    selectedDefaults,
    setSelectedDefaults,
    defaultOptions: Object.keys(DEFAULT_SETTINGS),

    /* optimization settings */
    optimizationSettings,
    setOptimizationSettings,

    /* results */
    calculationResults,
    setCalculationResults: setCalcResLS,
    optimizationResults,
    setOptimizationResults: setOptResLS,
    previousCalculationResults,
    setPreviousCalculationResults: setPrevCalcLS,

    /* saved / comparison */
    savedResults,
    setSavedResults: setSavedResLS,
    saveResult,
    deleteSavedResult,
    clearSavedResults,
    multipleComparisonResults,
    setMultipleComparisonResults: setMultiResLS,
    clearComparisonData,

    /* misc helpers */
    resetToDefaults,
    clearData,
    createCalculationRequest,
    createOptimizationRequest,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};