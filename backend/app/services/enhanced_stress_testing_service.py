# app/services/enhanced_stress_testing_service.py
"""
Enhanced Stress Testing Service for Asset-Backed Securities (ABS)
This module implements advanced stress testing with detailed cash flow modeling
"""

import pandas as pd
import numpy as np
from datetime import date, datetime, timedelta
import logging
from typing import Dict, Any, List, Optional, Union, Tuple
from pydantic import BaseModel

# Configure logger
logger = logging.getLogger(__name__)

# =========================================================================
# Data Models
# =========================================================================

class ClassATranche(BaseModel):
    """Class A tranche parameters"""
    maturity_days: int
    base_rate: float
    spread: float
    reinvest_rate: float
    nominal: float

class ClassBTranche(BaseModel):
    """Class B tranche parameters"""
    maturity_days: int
    base_rate: float
    spread: float
    reinvest_rate: float
    nominal: float

class ABSStructure(BaseModel):
    """ABS structure parameters"""
    start_date: str
    a_tranches: List[ClassATranche]
    b_tranche: ClassBTranche
    ops_expenses: float = 0

class StressScenario(BaseModel):
    """Stress test scenario parameters"""
    name: str
    npl_rate: float  # %
    prepayment_rate: float  # %
    reinvestment_shift: float  # %
    recovery_rate: float = 0.5  # Ratio (0-1)
    recovery_lag: int = 90  # Days
    delinquency_rate: Optional[float] = None  # %, If None, half of NPL is used
    delinquency_recovery_rate: float = 0.85  # Ratio (0-1)
    delinquency_to_default_rate: float = 0.2  # Ratio (0-1)
    repeat_delinquency_factor: float = 1.5  # Multiplier

class StressTestRequest(BaseModel):
    """Stress test request parameters"""
    structure: ABSStructure
    scenario: StressScenario

class StressTestResponse(BaseModel):
    """Stress test response parameters"""
    original_class_b_rate: float
    stressed_class_b_rate: float
    difference: float
    cashflow_reduction_pct: float
    total_npl_impact: float
    total_prepayment: float
    total_reinvestment: float
    modeled_cashflows: List[Dict[str, Any]]

# =========================================================================
# Cash Flow Modeling
# =========================================================================

class CashFlowModeler:
    """
    Cash flow modeling class. Calculates modeled cash flows
    applying various stress factors.
    """
    
    @staticmethod
    def prepare_cashflow_df(cash_flows: pd.DataFrame) -> pd.DataFrame:
        """
        Prepares the original cash flow DataFrame for modeling
        """
        df = cash_flows.copy()
        
        # Check and fix date column
        if 'installment_date' not in df.columns:
            raise ValueError("Cash flow table must contain 'installment_date' column")
        
        # Fix date format
        df['installment_date'] = pd.to_datetime(df['installment_date'])
        
        # Check required columns
        required_columns = ['principal_amount', 'interest_amount']
        for col in required_columns:
            if col not in df.columns:
                raise ValueError(f"Cash flow table must contain '{col}' column")
        
        # Calculate cash flow total
        if 'cash_flow' not in df.columns:
            df['cash_flow'] = df['principal_amount'] + df['interest_amount']
        
        # Convert data types
        df['principal_amount'] = pd.to_numeric(df['principal_amount'])
        df['interest_amount'] = pd.to_numeric(df['interest_amount'])
        df['cash_flow'] = pd.to_numeric(df['cash_flow'])
        
        return df
    
    @staticmethod
    def calculate_daily_rates(annual_rate: float) -> float:
        """
        Converts an annual rate to a daily rate
        """
        return 1 - (1 - annual_rate/100) ** (1/365)
    
    @staticmethod
    def model_cashflows(
        original_cashflows: pd.DataFrame,
        structure: ABSStructure,
        scenario: StressScenario
    ) -> pd.DataFrame:
        """
        Models cash flows according to stress parameters
        """
        # Create copy of DataFrame
        df = original_cashflows.copy()
        result_df = pd.DataFrame()
        
        # Prepare scenario parameters
        npl_rate = scenario.npl_rate / 100
        prepayment_rate = scenario.prepayment_rate / 100  
        reinvest_shift = scenario.reinvestment_shift / 100
        recovery_rate = scenario.recovery_rate
        recovery_lag_days = scenario.recovery_lag
        
        # Set delinquency rate, if not specified use half of NPL
        delinquency_rate = (scenario.delinquency_rate / 100) if scenario.delinquency_rate is not None else (npl_rate / 2)
        delinquency_recovery_rate = scenario.delinquency_recovery_rate
        delinquency_to_default_rate = scenario.delinquency_to_default_rate
        
        # Calculate daily rates
        daily_npl_rate = CashFlowModeler.calculate_daily_rates(scenario.npl_rate)
        daily_prepayment_rate = CashFlowModeler.calculate_daily_rates(scenario.prepayment_rate)
        daily_delinquency_rate = CashFlowModeler.calculate_daily_rates(
            scenario.delinquency_rate if scenario.delinquency_rate is not None else (scenario.npl_rate / 2)
        )
        
        # Initial values
        remaining_principal = df["principal_amount"].sum()
        current_date = pd.Timestamp(structure.start_date)
        remaining_cashflows = []
        defaulted_amounts = []  # List of defaulted amounts
        delinquent_amounts = []  # List of delinquent amounts

        # Process cash flows in date order
        for _, row in df.sort_values("installment_date").iterrows():
            installment_date = pd.Timestamp(row["installment_date"])
            days_diff = (installment_date - current_date).days
            
            # 1. Calculate NPL impact - loss of principal and interest
            # Instead of direct calculation, we calculate a cumulative probability
            cumulative_npl_prob = 1 - (1 - daily_npl_rate) ** days_diff
            npl_impact = remaining_principal * cumulative_npl_prob
            
            # NPL effect on principal and interest (proportional by default)
            remaining_after_npl = remaining_principal - npl_impact
            
            # Ratio of remaining to what should be
            scaling_factor = remaining_after_npl / remaining_principal if remaining_principal > 0 else 0
            principal_after_npl = row["principal_amount"] * scaling_factor
            interest_after_npl = row["interest_amount"] * scaling_factor
            
            # 2. Calculate delinquency effect
            # Based on principal after NPL
            cumulative_delinq_prob = 1 - (1 - daily_delinquency_rate) ** days_diff
            delinquency_amount = remaining_after_npl * cumulative_delinq_prob
            
            # Principal remaining after NPL and delinquency
            remaining_after_delinq = remaining_after_npl - delinquency_amount
            
            # 3. Calculate prepayment effect
            # Based on principal after NPL and delinquency
            cumulative_prepay_prob = 1 - (1 - daily_prepayment_rate) ** days_diff
            prepayment_amount = remaining_after_delinq * cumulative_prepay_prob
            
            # Normal principal payment + prepayment
            scheduled_principal = principal_after_npl * (1 - cumulative_delinq_prob)
            actual_principal = scheduled_principal + prepayment_amount
            
            # 4. Calculate interest effects
            # a. Delinquency interest effect (typically with penalty interest)
            delinquency_ratio = delinquency_amount / remaining_after_npl if remaining_after_npl > 0 else 0
            delinquency_interest = interest_after_npl * delinquency_ratio * 1.5  # 1.5x penalty interest
            
            # b. Prepayment interest loss
            prepayment_interest_loss = 0
            if row["principal_amount"] > 0:
                interest_rate = row["interest_amount"] / row["principal_amount"]
                # Lost interest on prepaid amount (assume average half period)
                prepayment_interest_loss = prepayment_amount * interest_rate * 0.5  
            
            # Net interest
            actual_interest = (interest_after_npl * (1 - delinquency_ratio)) - prepayment_interest_loss + delinquency_interest
            
            # 5. Recovery calculations
            # Recovery for defaults and delinquencies after specific lag
            default_recovery = 0
            delinquency_recovery = 0
            
            # Calculate recovery from previous defaults based on recovery lag
            recovery_date = installment_date - timedelta(days=recovery_lag_days)
            for def_amount in defaulted_amounts:
                if def_amount["date"] <= recovery_date:
                    default_recovery += def_amount["amount"] * recovery_rate
                    def_amount["processed"] = True
            
            # Calculate recovery from previous delinquencies 
            for del_amount in delinquent_amounts:
                if del_amount["date"] <= recovery_date:
                    # Part of delinquency becomes default
                    default_portion = del_amount["amount"] * delinquency_to_default_rate
                    # Remaining part is either recovered or continues delinquent
                    recovery_portion = (del_amount["amount"] - default_portion) * delinquency_recovery_rate
                    
                    # Add recovery amount
                    delinquency_recovery += recovery_portion
                    
                    # Add default portion to defaults list
                    defaulted_amounts.append({
                        "date": del_amount["date"] + timedelta(days=30),  # Default after 30 days
                        "amount": default_portion,
                        "processed": False
                    })
                    
                    del_amount["processed"] = True
            
            # Remove processed amounts from lists
            defaulted_amounts = [d for d in defaulted_amounts if not d.get("processed", False)]
            delinquent_amounts = [d for d in delinquent_amounts if not d.get("processed", False)]
            
            # Add new default amount to list
            defaulted_amounts.append({
                "date": installment_date,
                "amount": npl_impact,
                "processed": False
            })
            
            # Add new delinquency amount to list
            delinquent_amounts.append({
                "date": installment_date,
                "amount": delinquency_amount,
                "processed": False
            })
            
            # 6. Calculate total actual cash flow
            actual_cashflow = actual_principal + actual_interest + default_recovery + delinquency_recovery
            
            # 7. Calculate reinvestment
            reinvest_amount = 0
            
            # Calculate reinvestment for all tranches (base + shift)
            for i, cf in enumerate(remaining_cashflows):
                cf_date = cf["date"]
                days_between = (installment_date - cf_date).days
                if days_between > 0:
                    # Tranche specific reinvest rate
                    base_reinvest_rate = 0
                    
                    # Find appropriate tranche
                    if i < len(structure.a_tranches):
                        # Class A tranche-specific rate
                        base_reinvest_rate = structure.a_tranches[i].reinvest_rate / 100
                    else:
                        # Class B rate
                        base_reinvest_rate = structure.b_tranche.reinvest_rate / 100
                    
                    # Apply shift
                    actual_reinvest_rate = max(0, base_reinvest_rate + reinvest_shift)
                    
                    # Calculate reinvestment return (simple interest)
                    reinvest_return = cf["amount"] * actual_reinvest_rate * days_between / 365
                    reinvest_amount += reinvest_return
            
            # 8. Update remaining principal
            remaining_principal -= actual_principal
            
            # 9. Add results
            result_df = pd.concat([result_df, pd.DataFrame({
                "installment_date": [installment_date],
                "original_principal": [row["principal_amount"]],
                "original_interest": [row["interest_amount"]],
                "original_cashflow": [row["cash_flow"]],
                "npl_impact": [npl_impact],
                "delinquency_amount": [delinquency_amount],
                "actual_principal": [actual_principal],
                "actual_interest": [actual_interest],
                "prepayment": [prepayment_amount],
                "default_recovery": [default_recovery],
                "delinquency_recovery": [delinquency_recovery],
                "actual_cashflow": [actual_cashflow],
                "reinvest_amount": [reinvest_amount],
                "total_actual_cashflow": [actual_cashflow + reinvest_amount],
                "remaining_principal": [remaining_principal]
            })], ignore_index=True)
            
            # 10. Remember cash flow for next period reinvestment
            remaining_cashflows.append({
                "date": installment_date,
                "amount": actual_cashflow
            })
            
            current_date = installment_date
        
        return result_df

# =========================================================================
# Class A Calculator
# =========================================================================

class ClassACalculator:
    """
    Class for calculating Class A payments
    """
    
    @staticmethod
    def calculate_interest_rate(base_rate: float, spread: float, days: int) -> float:
        """
        Calculates annual interest yield using simple interest formula
        """
        annual_rate = base_rate + spread  # %
        return annual_rate * (days / 365) / 100
    
    @staticmethod
    def calculate_class_a_payments(structure: ABSStructure) -> pd.DataFrame:
        """
        Calculates payments for all Class A tranches
        """
        start_date = pd.Timestamp(structure.start_date)
        results = []
        
        for i, tranche in enumerate(structure.a_tranches):
            maturity_date = start_date + pd.Timedelta(days=tranche.maturity_days)
            
            # Calculate interest rate
            interest_rate = ClassACalculator.calculate_interest_rate(
                tranche.base_rate, tranche.spread, tranche.maturity_days
            )
            
            # Calculate interest amount
            interest_amount = tranche.nominal * interest_rate
            
            # Add results
            results.append({
                "tranche_index": i,
                "tranche_name": f"Class A-{i+1}",
                "maturity_days": tranche.maturity_days,
                "maturity_date": maturity_date,
                "nominal": tranche.nominal,
                "interest_rate": interest_rate * 100,  # As %
                "interest_amount": interest_amount,
                "total_payment": tranche.nominal + interest_amount
            })
        
        return pd.DataFrame(results)

# =========================================================================
# Main Stress Testing Functions
# =========================================================================

def perform_stress_test(original_cashflows: pd.DataFrame, request: StressTestRequest) -> StressTestResponse:
    """
    Performs stress test and returns results
    """
    try:
        logger.info(f"Starting stress test: {request.scenario.name}")
        
        # 1. Prepare cash flow DataFrame
        df = CashFlowModeler.prepare_cashflow_df(original_cashflows)
        
        # 2. Calculate Class A payments
        class_a_payments = ClassACalculator.calculate_class_a_payments(request.structure)
        total_class_a_payments = class_a_payments["total_payment"].sum()
        
        # 3. Calculate original Class B coupon rate
        original_total_cashflow = df["cash_flow"].sum()
        original_class_b_available = original_total_cashflow - total_class_a_payments
        
        # Subtract operational expenses if any
        if request.structure.ops_expenses > 0:
            original_class_b_available -= request.structure.ops_expenses
        
        # Calculate coupon rate (annualized)
        b_tranche = request.structure.b_tranche
        b_maturity_years = b_tranche.maturity_days / 365
        original_class_b_rate = (original_class_b_available / b_tranche.nominal) / b_maturity_years * 100
        
        # 4. Model stressed cash flows
        modeled_cashflows = CashFlowModeler.model_cashflows(df, request.structure, request.scenario)
        
        # 5. Calculate stressed Class B coupon rate
        modeled_total_cashflow = modeled_cashflows["total_actual_cashflow"].sum()
        stressed_class_b_available = modeled_total_cashflow - total_class_a_payments
        
        # Subtract operational expenses if any
        if request.structure.ops_expenses > 0:
            stressed_class_b_available -= request.structure.ops_expenses
        
        # Must be at least 0 (no negative payment)
        stressed_class_b_available = max(0, stressed_class_b_available)
        
        # Calculate coupon rate (annualized)
        stressed_class_b_rate = (stressed_class_b_available / b_tranche.nominal) / b_maturity_years * 100
        
        # 6. Prepare results
        cashflow_reduction_pct = ((original_total_cashflow - modeled_total_cashflow) / original_total_cashflow) * 100 if original_total_cashflow > 0 else 0
        
        # Metrics
        total_npl_impact = modeled_cashflows["npl_impact"].sum()
        total_prepayment = modeled_cashflows["prepayment"].sum()
        total_reinvestment = modeled_cashflows["reinvest_amount"].sum()
        
        logger.info(f"Stress test completed: {request.scenario.name}")
        logger.info(f"Original Class B rate: {original_class_b_rate:.2f}%, Stressed: {stressed_class_b_rate:.2f}%")
        logger.info(f"Cash flow reduction: {cashflow_reduction_pct:.2f}%")
        
        # Create response
        response = StressTestResponse(
            original_class_b_rate=original_class_b_rate,
            stressed_class_b_rate=stressed_class_b_rate,
            difference=stressed_class_b_rate - original_class_b_rate,
            cashflow_reduction_pct=cashflow_reduction_pct,
            total_npl_impact=total_npl_impact,
            total_prepayment=total_prepayment,
            total_reinvestment=total_reinvestment,
            modeled_cashflows=modeled_cashflows.to_dict('records')
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Stress test error: {str(e)}")
        logger.exception(e)
        raise ValueError(f"Stress test calculation failed: {str(e)}")

def perform_enhanced_stress_test(original_cashflows: pd.DataFrame, request) -> dict:
    """
    Handles enhanced stress test requests with additional parameters.
    
    This function converts the API request model to the internal model
    and executes the stress test with enhanced scenario parameters.
    
    Args:
        original_cashflows: DataFrame containing cash flow data
        request: Enhanced stress test request from the API
        
    Returns:
        Dictionary containing baseline, stress test, and difference results
    """
    try:
        logger.info(f"Starting enhanced stress test: {request.scenario.name}")
        
        # Convert from API request model to internal model
        structure = ABSStructure(
            start_date=request.structure.start_date.strftime("%Y-%m-%d"),
            a_tranches=[
                ClassATranche(
                    maturity_days=request.structure.a_maturities[i],
                    base_rate=request.structure.a_base_rates[i],
                    spread=request.structure.a_spreads[i],
                    reinvest_rate=request.structure.a_reinvest_rates[i],
                    nominal=request.structure.a_nominals[i]
                ) for i in range(len(request.structure.a_maturities))
            ],
            b_tranche=ClassBTranche(
                maturity_days=request.structure.b_maturity,
                base_rate=request.structure.b_base_rate,
                spread=request.structure.b_spread,
                reinvest_rate=request.structure.b_reinvest_rate,
                nominal=request.structure.b_nominal
            ),
            ops_expenses=request.structure.ops_expenses
        )
        
        # Create baseline scenario (no stress factors)
        baseline_scenario = StressScenario(
            name="Baseline",
            npl_rate=0.0,
            prepayment_rate=0.0,
            reinvestment_shift=0.0,
            recovery_rate=request.scenario.recovery_rate,
            recovery_lag=request.scenario.recovery_lag,
            delinquency_rate=0.0,
            delinquency_recovery_rate=request.scenario.delinquency_recovery_rate,
            delinquency_to_default_rate=request.scenario.delinquency_to_default_rate,
            repeat_delinquency_factor=request.scenario.repeat_delinquency_factor
        )
        
        # Create stress scenario with all enhanced parameters
        stress_scenario = StressScenario(
            name=request.scenario.name,
            npl_rate=request.scenario.npl_rate,
            prepayment_rate=request.scenario.prepayment_rate,
            reinvestment_shift=request.scenario.reinvestment_shift,
            recovery_rate=request.scenario.recovery_rate,
            recovery_lag=request.scenario.recovery_lag,
            delinquency_rate=request.scenario.delinquency_rate,
            delinquency_recovery_rate=request.scenario.delinquency_recovery_rate,
            delinquency_to_default_rate=request.scenario.delinquency_to_default_rate,
            repeat_delinquency_factor=request.scenario.repeat_delinquency_factor
        )
        
        # Calculate baseline results
        baseline_request = StressTestRequest(structure=structure, scenario=baseline_scenario)
        baseline_results = perform_stress_test(original_cashflows, baseline_request)
        
        # Calculate stress test results
        stress_request = StressTestRequest(structure=structure, scenario=stress_scenario)
        stress_results = perform_stress_test(original_cashflows, stress_request)
        
        # Prepare API response
        response = {
            "baseline": {
                "class_b_coupon_rate": baseline_results.original_class_b_rate,
                "total_cashflow": sum(cf["original_cashflow"] for cf in baseline_results.modeled_cashflows)
            },
            "stress_test": {
                "class_b_coupon_rate": stress_results.stressed_class_b_rate,
                "total_cashflow": sum(cf["total_actual_cashflow"] for cf in stress_results.modeled_cashflows),
                "total_npl_impact": stress_results.total_npl_impact,
                "total_prepayment": stress_results.total_prepayment,
                "total_reinvestment": stress_results.total_reinvestment
            },
            "difference": {
                "class_b_coupon_rate": stress_results.difference,
                "cashflow_reduction_pct": stress_results.cashflow_reduction_pct
            },
            "cashflows": {
                "baseline": baseline_results.modeled_cashflows[:10],  # Return only first 10 cashflows for brevity
                "stress": stress_results.modeled_cashflows[:10]
            }
        }
        
        logger.info(f"Enhanced stress test completed: {request.scenario.name}")
        return response
        
    except Exception as e:
        logger.error(f"Enhanced stress test error: {str(e)}")
        logger.exception(e)
        raise ValueError(f"Enhanced stress test calculation failed: {str(e)}")