import pandas as pd
import numpy as np
from app.utils.tranche_utils import calculate_tranche_results
from typing import Dict, Any, List
from app.models.input_models import StressTestRequest

def adjust_cash_flow_for_npl(df: pd.DataFrame, npl_rate: float) -> pd.DataFrame:
    """
    Adjust cash flows by reducing principal payments based on NPL rate
    """
    df_adjusted = df.copy()
    
    # Reduce principal by NPL rate
    df_adjusted['principal_amount'] = df_adjusted['principal_amount'] * (1 - (npl_rate / 100))
    
    # Recalculate total cash flow
    df_adjusted['cash_flow'] = df_adjusted['principal_amount'] + df_adjusted['interest_amount']
    df_adjusted['original_cash_flow'] = df_adjusted['cash_flow'].copy()
    
    return df_adjusted

def adjust_cash_flow_for_prepayment(df: pd.DataFrame, prepayment_rate: float) -> pd.DataFrame:
    """
    Adjust cash flows by shifting some payments earlier based on prepayment rate
    """
    if prepayment_rate <= 0:
        return df
    
    df_adjusted = df.copy()
    
    # Sort by date
    df_adjusted = df_adjusted.sort_values('installment_date')
    
    # Calculate running sum of principal
    total_principal = df_adjusted['principal_amount'].sum()
    
    # Calculate prepayment amount
    prepayment_amount = total_principal * (prepayment_rate / 100)
    
    # Distribution function (more prepayments in early periods)
    prepayment_weights = np.linspace(3, 1, len(df_adjusted))
    prepayment_weights = prepayment_weights / prepayment_weights.sum()
    
    # Allocate prepayments by weight
    prepayment_allocations = prepayment_amount * prepayment_weights
    
    # Apply prepayments (reduce later periods, increase earlier periods)
    n = len(df_adjusted)
    reduction_indices = range(n//2, n)  # Reduce second half
    addition_indices = range(0, n//2)   # Add to first half
    
    # Reduce later payments
    for i in reduction_indices:
        if i < len(prepayment_allocations):
            reduction = min(prepayment_allocations[i], df_adjusted.iloc[i]['principal_amount'] * 0.8)
            df_adjusted.iloc[i, df_adjusted.columns.get_loc('principal_amount')] -= reduction
    
    # Increase earlier payments
    for i in addition_indices:
        if i < len(prepayment_allocations):
            df_adjusted.iloc[i, df_adjusted.columns.get_loc('principal_amount')] += prepayment_allocations[i]
    
    # Recalculate total cash flow
    df_adjusted['cash_flow'] = df_adjusted['principal_amount'] + df_adjusted['interest_amount']
    df_adjusted['original_cash_flow'] = df_adjusted['cash_flow'].copy()
    
    return df_adjusted

def perform_stress_test(df: pd.DataFrame, request: StressTestRequest) -> Dict[str, Any]:
    """
    Perform stress testing by adjusting cash flows and recalculating with the same structure
    """
    # Extract parameters
    structure = request.structure
    scenario = request.scenario
    npl_rate = scenario.npl_rate
    prepayment_rate = scenario.prepayment_rate
    reinvestment_shift = scenario.reinvestment_shift
    
    # Adjust cash flows for NPL
    df_adjusted = adjust_cash_flow_for_npl(df, npl_rate)
    
    # Adjust cash flows for prepayment
    df_adjusted = adjust_cash_flow_for_prepayment(df_adjusted, prepayment_rate)
    
    # Adjust reinvestment rates if needed
    a_reinvest_rates = [rate + reinvestment_shift for rate in structure.a_reinvest_rates]
    b_reinvest_rate = structure.b_reinvest_rate + reinvestment_shift
    
    # Calculate new results
    result = calculate_tranche_results(
        df_adjusted, structure.start_date,
        structure.a_maturities, structure.a_base_rates, structure.a_spreads, a_reinvest_rates,
        structure.a_nominals, structure.b_maturity, structure.b_base_rate, structure.b_spread,
        b_reinvest_rate, structure.b_nominal, structure.ops_expenses
    )
    
    # Extract baseline results
    baseline_result = calculate_tranche_results(
        df, structure.start_date,
        structure.a_maturities, structure.a_base_rates, structure.a_spreads, structure.a_reinvest_rates,
        structure.a_nominals, structure.b_maturity, structure.b_base_rate, structure.b_spread,
        structure.b_reinvest_rate, structure.b_nominal, structure.ops_expenses
    )
    
    # Create response
    response = {
        'baseline': {
            'class_b_coupon_rate': baseline_result['effective_coupon_rate'],
            'min_buffer_actual': baseline_result['min_buffer_actual']
        },
        'stress_test': {
            'class_b_coupon_rate': result['effective_coupon_rate'],
            'min_buffer_actual': result['min_buffer_actual'],
            'npl_rate': npl_rate,
            'prepayment_rate': prepayment_rate,
            'reinvestment_shift': reinvestment_shift
        },
        'difference': {
            'class_b_coupon_rate': result['effective_coupon_rate'] - baseline_result['effective_coupon_rate'],
            'min_buffer_actual': result['min_buffer_actual'] - baseline_result['min_buffer_actual']
        }
    }
    
    return response