import pandas as pd
import numpy as np
from app.utils.tranche_utils import calculate_tranche_results
from typing import Dict, Any, List
from app.models.input_models import StressTestRequest
import logging

logger = logging.getLogger(__name__)

def adjust_cash_flow_for_npl(df: pd.DataFrame, npl_rate: float) -> pd.DataFrame:
    """
    Adjust cash flows by reducing principal payments based on NPL rate
    """
    try:
        df_adjusted = df.copy()
        
        # Ensure all required columns exist
        if 'principal_amount' not in df_adjusted.columns:
            logger.error("Missing 'principal_amount' column in DataFrame")
            raise ValueError("Missing 'principal_amount' column in data")
            
        if 'interest_amount' not in df_adjusted.columns:
            logger.error("Missing 'interest_amount' column in DataFrame")
            raise ValueError("Missing 'interest_amount' column in data")
            
        if 'cash_flow' not in df_adjusted.columns:
            logger.error("Missing 'cash_flow' column in DataFrame")
            raise ValueError("Missing 'cash_flow' column in data")
        
        # Convert npl_rate to a factor (e.g., 5% -> 0.05)
        npl_factor = npl_rate / 100.0
        
        # Reduce principal by NPL rate
        df_adjusted['principal_amount'] = df_adjusted['principal_amount'] * (1 - npl_factor)
        
        # Recalculate total cash flow
        df_adjusted['cash_flow'] = df_adjusted['principal_amount'] + df_adjusted['interest_amount']
        
        # Keep original cash flow for reference
        if 'original_cash_flow' not in df_adjusted.columns:
            df_adjusted['original_cash_flow'] = df['cash_flow'].copy()
        
        logger.info(f"Applied NPL rate of {npl_rate}%, reducing principal payments")
        return df_adjusted
        
    except Exception as e:
        logger.error(f"Error in adjust_cash_flow_for_npl: {str(e)}")
        raise ValueError(f"Failed to adjust cash flows for NPL rate: {str(e)}")

def adjust_cash_flow_for_prepayment(df: pd.DataFrame, prepayment_rate: float) -> pd.DataFrame:
    """
    Adjust cash flows by shifting some payments earlier based on prepayment rate
    """
    try:
        # If prepayment rate is zero or negative, no adjustment needed
        if prepayment_rate <= 0:
            return df
        
        df_adjusted = df.copy()
        
        # Ensure required columns exist
        if 'principal_amount' not in df_adjusted.columns:
            logger.error("Missing 'principal_amount' column in DataFrame")
            raise ValueError("Missing 'principal_amount' column in data")
            
        if 'installment_date' not in df_adjusted.columns:
            logger.error("Missing 'installment_date' column in DataFrame")
            raise ValueError("Missing 'installment_date' column in data")
        
        # Convert prepayment_rate to a factor
        prepayment_factor = prepayment_rate / 100.0
        
        # Sort by date
        if not pd.api.types.is_datetime64_any_dtype(df_adjusted['installment_date']):
            df_adjusted['installment_date'] = pd.to_datetime(df_adjusted['installment_date'])
            
        df_adjusted = df_adjusted.sort_values('installment_date')
        
        # Calculate running sum of principal
        total_principal = df_adjusted['principal_amount'].sum()
        
        # Calculate prepayment amount
        prepayment_amount = total_principal * prepayment_factor
        
        # Distribution function (more prepayments in early periods)
        n_rows = len(df_adjusted)
        if n_rows <= 1:
            logger.warning("Too few rows for prepayment adjustment")
            return df_adjusted
            
        prepayment_weights = np.linspace(3, 1, n_rows)
        prepayment_weights = prepayment_weights / prepayment_weights.sum()
        
        # Allocate prepayments by weight
        prepayment_allocations = prepayment_amount * prepayment_weights
        
        # Apply prepayments (reduce later periods, increase earlier periods)
        n = len(df_adjusted)
        reduction_indices = range(n//2, n)  # Reduce second half
        addition_indices = range(0, n//2)   # Add to first half
        
        # Reduce later payments (create a deep copy to avoid warnings)
        df_temp = df_adjusted.copy()
        for i in reduction_indices:
            if i < len(prepayment_allocations):
                max_reduction = df_temp.iloc[i]['principal_amount'] * 0.8
                reduction = min(prepayment_allocations[i], max_reduction)
                df_temp.iloc[i, df_temp.columns.get_loc('principal_amount')] -= reduction
        
        # Increase earlier payments
        for i in addition_indices:
            if i < len(prepayment_allocations):
                df_temp.iloc[i, df_temp.columns.get_loc('principal_amount')] += prepayment_allocations[i]
        
        # Update the adjusted dataframe
        df_adjusted = df_temp
        
        # Recalculate total cash flow
        if 'interest_amount' in df_adjusted.columns:
            df_adjusted['cash_flow'] = df_adjusted['principal_amount'] + df_adjusted['interest_amount']
            
        # Keep original cash flow for reference
        if 'original_cash_flow' not in df_adjusted.columns and 'cash_flow' in df.columns:
            df_adjusted['original_cash_flow'] = df['cash_flow'].copy()
        
        logger.info(f"Applied prepayment rate of {prepayment_rate}%, shifting principal payments")
        return df_adjusted
        
    except Exception as e:
        logger.error(f"Error in adjust_cash_flow_for_prepayment: {str(e)}")
        raise ValueError(f"Failed to adjust cash flows for prepayment rate: {str(e)}")

def perform_stress_test(df: pd.DataFrame, request: StressTestRequest) -> Dict[str, Any]:
    """
    Perform stress testing by adjusting cash flows and recalculating with the same structure
    """
    try:
        logger.info("Starting stress test calculation")
        
        # Extract parameters
        structure = request.structure
        scenario = request.scenario
        npl_rate = scenario.npl_rate
        prepayment_rate = scenario.prepayment_rate
        reinvestment_shift = scenario.reinvestment_shift
        
        # Log parameters for debugging
        logger.info(f"Scenario: {scenario.name}")
        logger.info(f"NPL Rate: {npl_rate}%, Prepayment Rate: {prepayment_rate}%, Reinvestment Shift: {reinvestment_shift}%")
        
        # First calculate baseline results with original data
        logger.info("Calculating baseline results")
        baseline_result = calculate_tranche_results(
            df, structure.start_date,
            structure.a_maturities, structure.a_base_rates, structure.a_spreads, structure.a_reinvest_rates,
            structure.a_nominals, structure.b_maturity, structure.b_base_rate, structure.b_spread,
            structure.b_reinvest_rate, structure.b_nominal, structure.ops_expenses
        )
        
        # Apply NPL rate
        df_adjusted = df.copy()
        if npl_rate > 0:
            logger.info(f"Adjusting cash flows for NPL rate: {npl_rate}%")
            df_adjusted = adjust_cash_flow_for_npl(df_adjusted, npl_rate)
        
        # Apply prepayment
        if prepayment_rate > 0:
            logger.info(f"Adjusting cash flows for prepayment rate: {prepayment_rate}%")
            df_adjusted = adjust_cash_flow_for_prepayment(df_adjusted, prepayment_rate)
        
        # Adjust reinvestment rates if shift is non-zero
        a_reinvest_rates = structure.a_reinvest_rates
        b_reinvest_rate = structure.b_reinvest_rate
        
        if reinvestment_shift != 0:
            logger.info(f"Applying reinvestment rate shift: {reinvestment_shift}%")
            a_reinvest_rates = [rate + reinvestment_shift for rate in structure.a_reinvest_rates]
            b_reinvest_rate = structure.b_reinvest_rate + reinvestment_shift
        
        # Calculate stress test results
        logger.info("Calculating stress test results")
        result = calculate_tranche_results(
            df_adjusted, structure.start_date,
            structure.a_maturities, structure.a_base_rates, structure.a_spreads, a_reinvest_rates,
            structure.a_nominals, structure.b_maturity, structure.b_base_rate, structure.b_spread,
            b_reinvest_rate, structure.b_nominal, structure.ops_expenses
        )
        
        # Create response
        response = {
            'baseline': {
                'class_b_coupon_rate': round(baseline_result['effective_coupon_rate'], 4),
                'min_buffer_actual': round(baseline_result.get('min_buffer_actual', 0), 4)
            },
            'stress_test': {
                'class_b_coupon_rate': round(result['effective_coupon_rate'], 4),
                'min_buffer_actual': round(result.get('min_buffer_actual', 0), 4),
                'npl_rate': npl_rate,
                'prepayment_rate': prepayment_rate,
                'reinvestment_shift': reinvestment_shift
            },
            'difference': {
                'class_b_coupon_rate': round(result['effective_coupon_rate'] - baseline_result['effective_coupon_rate'], 4),
                'min_buffer_actual': round(result.get('min_buffer_actual', 0) - baseline_result.get('min_buffer_actual', 0), 4)
            }
        }
        
        logger.info("Stress test completed successfully")
        logger.info(f"Baseline rate: {response['baseline']['class_b_coupon_rate']}%, Stress rate: {response['stress_test']['class_b_coupon_rate']}%")
        logger.info(f"Difference: {response['difference']['class_b_coupon_rate']}%")
        
        return response
        
    except Exception as e:
        logger.error(f"Error in perform_stress_test: {str(e)}")
        raise ValueError(f"Stress test calculation failed: {str(e)}")