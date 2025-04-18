/* -----------------------------------------------------------
 *  Global state & helpers (React Context)
 * --------------------------------------------------------- */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

/* localStorage parse – "undefined" vb. hataları engeller */
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
 *              <DataProvider>
 * --------------------------------------------------------- */
export const DataProvider = ({ children }) => {
  /* ------------------- Core flags ------------------ */
  const [cashFlowData, setCashFlowData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ---------------- Form defaults ------------------ */
  const [generalSettings, setGeneralSettings] = useState({
    start_date: new Date(2025, 1, 13),
    operational_expenses: 7_928_640,
    min_buffer: 5,
  });

  const [tranchesA, setTranchesA] = useState([
    { maturity_days: 61, base_rate: 45.6, spread: 0, reinvest_rate: 40, nominal: 480_000_000 },
    { maturity_days: 120, base_rate: 44.5, spread: 0, reinvest_rate: 37.25, nominal: 460_000_000 },
    { maturity_days: 182, base_rate: 43.3, spread: 0, reinvest_rate: 32.5, nominal: 425_000_000 },
    { maturity_days: 274, base_rate: 42.5, spread: 0, reinvest_rate: 30, nominal: 400_000_000 },
  ]);

  const [trancheB, setTrancheB] = useState({
    maturity_days: 300,
    base_rate: 0,
    spread: 0,
    reinvest_rate: 25.5,
    /* nominal boş – optimizasyon gelince dolacak */
  });

  const [npvSettings, setNpvSettings] = useState({
    method: 'weighted_avg_rate',
    custom_rate: 40,
  });

  /* --------------- Optimization defaults ------------ */
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

  /* ------------------ Stored results ---------------- */
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

  /* -------------- localStorage wrappers -------------- */
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
  const createCalculationRequest = () => ({
    general_settings: {
      start_date: generalSettings.start_date.toISOString().split('T')[0],
      operational_expenses: generalSettings.operational_expenses,
      min_buffer: generalSettings.min_buffer,
    },
    tranches_a: tranchesA,
    tranche_b: trancheB,
    npv_settings: npvSettings,
  });

  const createOptimizationRequest = () => ({
    optimization_settings: optimizationSettings,
    general_settings: {
      start_date: generalSettings.start_date.toISOString().split('T')[0],
      operational_expenses: generalSettings.operational_expenses,
      min_buffer: generalSettings.min_buffer,
    },
  });

  /* ---------------- context value ------------------- */
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
