# backend/app/models/output_models.py
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class CashFlowSummary(BaseModel):
    total_records: int
    total_principal: float
    total_interest: float
    total_cash_flow: float
    date_range: List[str]
    
class CalculationResult(BaseModel):
    class_a_total: float
    class_b_total: float
    class_a_principal: float
    class_b_principal: float
    class_a_interest: float
    class_b_coupon: float
    min_buffer_actual: float
    total_principal_paid: float
    total_loan_principal: float
    financing_cost: float
    tranche_results: List[Dict[str, Any]]
    interest_rate_conversions: List[Dict[str, Any]]
    
class OptimizationResult(BaseModel):
    best_strategy: str
    class_a_maturities: List[int]
    class_a_nominals: List[float]
    class_a_rates: List[float]
    class_a_reinvest: List[float]
    class_b_maturity: int
    class_b_rate: float
    class_b_reinvest: float
    class_b_nominal: float
    class_b_coupon_rate: float
    direct_class_b_coupon_rate: float = 0.0  # Add this new field with default value
    min_buffer_actual: float
    last_cash_flow_day: int
    additional_days: int
    results_by_strategy: Dict[str, Dict[str, Any]]
    class_b_percent: Optional[float] = None  # Optional field for Class B percentage