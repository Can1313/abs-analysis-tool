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

/* localStorage parse – prevents "undefined" errors */
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
      start_date: new Date(2025, 3, 28),
      operational_expenses: 3_355_345,
      min_buffer: 5,
    },
    tranchesA: [
      { maturity_days: 88, base_rate: 51, spread: 0, reinvest_rate: 46, nominal: 85_000_000 },
      { maturity_days: 150, base_rate: 50.5, spread: 0, reinvest_rate: 42, nominal: 158_300_000 },
    ],
    trancheB: {
      maturity_days: 155,
      base_rate: 0,
      spread: 0,
      reinvest_rate: 42,
      /* nominal empty – will be filled when optimization comes */
      class_b_percent: 5
    }
  },
  new: {
    generalSettings: {
      start_date: new Date(2025, 3, 28), // April 16, 2025
      operational_expenses: 3_355_345,
      min_buffer: 5,
    },
    tranchesA: [
      { maturity_days: 155, base_rate: 50.75, spread: 0, reinvest_rate: 42.0, nominal: 250_200_000 },
    ],
    trancheB: {
      maturity_days: 155,
      base_rate: 0,
      spread: 0,
      reinvest_rate: 42.0,
      // For new default settings, Class B percentage should be 5%
      class_b_percent: 5 // Will be used to calculate nominal dynamically
    }
  }
};

/* Default stress test scenarios */
const DEFAULT_STRESS_SCENARIOS = {
  base: {
    name: "Base",
    npl_rate: 1.5,
    prepayment_rate: 30,
    reinvestment_shift: 0
  },
  moderate: {
    name: "Moderate",
    npl_rate: 3,
    prepayment_rate: 15,
    reinvestment_shift: -3
  },
  severe: {
    name: "Severe",
    npl_rate: 5,
    prepayment_rate: 10,
    reinvestment_shift: -5
  },
  extreme: {
    name: "Extreme",
    npl_rate: 7,
    prepayment_rate: 5,
    reinvestment_shift: -10
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
    maturity_range: [32, 180],
    maturity_step: 5,
    min_class_b_percent: 5,
    target_class_b_coupon_rate: 50,
    additional_days_for_class_b: 3,
    population_size: 50,
    num_generations: 40,
  });

  /* ---------------- Stress Test state ------------------ */
  const [stressTestResults, setStressTestResults] = useState(() =>
    safeParse('stressTestResults', null)
  );
  
  const [stressScenarios, setStressScenarios] = useState(() =>
    safeParse('stressScenarios', DEFAULT_STRESS_SCENARIOS)
  );
  
  const [stressTestHistory, setStressTestHistory] = useState(() =>
    safeParse('stressTestHistory', [])
  );

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
  const setStressResLS = wrapLocal(setStressTestResults, 'stressTestResults');
  const setStressScenLS = wrapLocal(setStressScenarios, 'stressScenarios');
  const setStressHistLS = wrapLocal(setStressTestHistory, 'stressTestHistory');

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
  
  const saveStressTestResult = (result, scenarioName, structureId) => {
    if (!result) return false;
    const stamped = {
      ...result,
      id: Date.now().toString(),
      scenarioName: scenarioName,
      structureId: structureId,
      timestamp: new Date().toISOString(),
    };
    setStressHistLS([...stressTestHistory, stamped]);
    return true;
  };
  
  const deleteStressTestResult = (id) => 
    setStressHistLS(stressTestHistory.filter(r => r.id !== id));
  
  const clearStressTestHistory = () => 
    setStressHistLS([]);
    
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
    selected_default_model: selectedDefaults
  });

  const createStressTestRequest = (structure, scenario) => {
    // Get structure details
    const structureDetails = typeof structure === 'string' ? 
      savedResults.find(r => r.id === structure) : structure;
      
    if (!structureDetails) {
      throw new Error("Structure not found");
    }
    
    // Format structure for API
    const formattedStructure = {
      start_date: structureDetails.start_date ||
                 (structureDetails.general_settings?.start_date instanceof Date ? 
                  structureDetails.general_settings.start_date.toISOString().split('T')[0] :
                  structureDetails.general_settings?.start_date),
      a_maturities: [],
      a_base_rates: [],
      a_spreads: [],
      a_reinvest_rates: [],
      a_nominals: [],
      b_maturity: structureDetails.tranche_b?.maturity_days || 180,
      b_base_rate: structureDetails.tranche_b?.base_rate || 0,
      b_spread: structureDetails.tranche_b?.spread || 0,
      b_reinvest_rate: structureDetails.tranche_b?.reinvest_rate || 0,
      b_nominal: structureDetails.tranche_b?.nominal || 0,
      ops_expenses: Number(structureDetails.general_settings?.operational_expenses || 0)
    };
    
    // Properly extract Class A tranches data
    if (Array.isArray(structureDetails.tranches_a)) {
      structureDetails.tranches_a.forEach(tranche => {
        formattedStructure.a_maturities.push(Number(tranche.maturity_days));
        formattedStructure.a_base_rates.push(Number(tranche.base_rate));
        formattedStructure.a_spreads.push(Number(tranche.spread));
        formattedStructure.a_reinvest_rates.push(Number(tranche.reinvest_rate));
        formattedStructure.a_nominals.push(Number(tranche.nominal));
      });
    }
    
    // Return complete request
    return {
      structure: formattedStructure,
      scenario: scenario
    };
  };

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
    
    /* stress test settings */
    stressTestResults,
    setStressTestResults: setStressResLS,
    stressScenarios,
    setStressScenarios: setStressScenLS,
    stressTestHistory,
    setStressTestHistory: setStressHistLS,
    saveStressTestResult,
    deleteStressTestResult,
    clearStressTestHistory,

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
    createStressTestRequest,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};