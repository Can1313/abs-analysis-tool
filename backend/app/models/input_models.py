# app/models/input_models.py

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class GeneralSettings(BaseModel):
    start_date: date
    operational_expenses: float
    min_buffer: float


class TrancheA(BaseModel):
    maturity_days: int
    base_rate: float
    spread: float
    reinvest_rate: float
    nominal: float


class TrancheB(BaseModel):
    maturity_days: int
    base_rate: float
    spread: float
    reinvest_rate: float
    nominal: Optional[float] = None


class NPVSettings(BaseModel):
    method: str
    custom_rate: Optional[float] = None


class OptimizationSettings(BaseModel):
    optimization_method: str = Field(default="classic")
    selected_strategies: List[str] = Field(default=["equal", "increasing", "decreasing", "middle_weighted"])
    a_tranches_range: List[int] = Field(default=[2, 6])
    maturity_range: List[int] = Field(default=[32, 365])
    maturity_step: int = Field(default=10)
    min_class_b_percent: float = Field(default=10.0)
    target_class_b_coupon_rate: float = Field(default=30.0)
    additional_days_for_class_b: int = Field(default=10)
    class_b_percent_deviation: float = Field(default=1.0)
    selected_default_model: str = Field(default="previous")
    
    # Evolutionary algorithm parameters
    population_size: Optional[int] = Field(default=50)
    num_generations: Optional[int] = Field(default=40)


class CalculationRequest(BaseModel):
    general_settings: GeneralSettings
    tranches_a: List[TrancheA]
    tranche_b: TrancheB
    npv_settings: NPVSettings
    is_optimized: Optional[bool] = False
    optimization_method: Optional[str] = None


# Stress Testing Models
class StructureParameters(BaseModel):
    start_date: date
    a_maturities: List[int]
    a_base_rates: List[float]
    a_spreads: List[float]
    a_reinvest_rates: List[float]
    a_nominals: List[float]
    b_maturity: int
    b_base_rate: float
    b_spread: float
    b_reinvest_rate: float
    b_nominal: float
    ops_expenses: float = 0.0


class EnhancedScenarioParameters(BaseModel):
    name: str
    npl_rate: float
    prepayment_rate: float
    reinvestment_shift: float
    # Additional parameters for cash flow modeling
    recovery_rate: float = 0.50
    recovery_lag: int = 6
    delinquency_rate: Optional[float] = None  # If None, will be derived from npl_rate
    delinquency_recovery_rate: float = 0.85
    delinquency_to_default_rate: float = 0.20
    repeat_delinquency_factor: float = 1.5


class ScenarioParameters(BaseModel):
    name: str
    npl_rate: float
    prepayment_rate: float
    reinvestment_shift: float


class StressTestRequest(BaseModel):
    structure: StructureParameters
    scenario: ScenarioParameters


class EnhancedStressTestRequest(BaseModel):
    structure: StructureParameters
    scenario: EnhancedScenarioParameters