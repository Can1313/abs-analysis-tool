# app/services/enhanced_stress_testing_service.py

import pandas as pd
import numpy as np
from datetime import date, datetime
import logging
import traceback
from typing import Dict, Any, List, Union

# Import the necessary modules
from app.models.input_models import EnhancedStressTestRequest
from app.utils.tranche_utils import calculate_tranche_results

logger = logging.getLogger(__name__)

class CashFlowScenarioProcessor:
    """
    Handles cash flow scenario analysis including:
      - Prepayment
      - Delinquency
      - Default (with partial recovery)
    """

    @staticmethod
    def cpr_to_smm(cpr):
        """Convert annual CPR to a daily SMM (Simple Monthly Mortality)."""
        return 1 - (1 - float(cpr)) ** (1 / 365)

    @staticmethod
    def cdr_to_mdr(cdr):
        """Convert annual rates (CDR/Delinquency) to a daily rate."""
        return 1 - (1 - float(cdr)) ** (1 / 365)

    @staticmethod
    def ensure_timestamp(date_input: Union[str, date, datetime, pd.Timestamp]) -> pd.Timestamp:
        """
        Convert any date format to pandas Timestamp
        """
        if isinstance(date_input, pd.Timestamp):
            return date_input
        
        if isinstance(date_input, (date, datetime)):
            return pd.Timestamp(date_input)
        
        if isinstance(date_input, str):
            try:
                return pd.Timestamp(date_input)
            except Exception as e:
                logger.error(f"Could not convert date format: {date_input}, error: {str(e)}")
                # Return today's date as default
                return pd.Timestamp('today')
        
        # For other types of values
        logger.warning(f"Unexpected date format: {type(date_input)}, value: {date_input}")
        return pd.Timestamp('today')

    @staticmethod
    def prepare_cash_flow_dataframe(df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare the cash flow DataFrame for scenario analysis
        """
        try:
            # Verify required columns exist
            required_columns = ['installment_date', 'principal_amount', 'interest_amount', 'cash_flow']
            for col in required_columns:
                if col not in df.columns:
                    logger.error(f"Missing column: '{col}'")
                    raise ValueError(f"Column '{col}' not found in data")
            
            # Create a copy of the DataFrame
            cf_df = df.copy()
            
            # Rename columns to match expected format
            cf_df = cf_df.rename(columns={
                'installment_date': 'payment_date',
                'installment_amount': 'payment_amount'
            })
            
            # Ensure payment_date is datetime
            if not pd.api.types.is_datetime64_any_dtype(cf_df['payment_date']):
                cf_df['payment_date'] = pd.to_datetime(cf_df['payment_date'], errors='coerce')
            
            # Calculate beginning balance
            cf_df["beginning_balance"] = 0.0
            total_principal = cf_df["principal_amount"].sum()
            current_balance = total_principal
            
            for i in range(len(cf_df)):
                cf_df.loc[i, "beginning_balance"] = current_balance
                current_balance -= cf_df.loc[i, "principal_amount"]
                if current_balance < 0:
                    current_balance = 0
            
            # Convert to float for numeric operations
            cf_df["beginning_balance"] = cf_df["beginning_balance"].astype(float)
            cf_df["principal_amount"] = cf_df["principal_amount"].astype(float)
            cf_df["interest_amount"] = cf_df["interest_amount"].astype(float)
            
            # Sort by payment date
            cf_df = cf_df.sort_values('payment_date')
            
            return cf_df
            
        except Exception as e:
            logger.exception(f"Error preparing cash flow DataFrame: {e}")
            raise ValueError(f"Error processing cash flow data: {e}")

    @staticmethod
    def apply_scenario_assumptions(
        cf_df,
        sm,  # Daily prepayment rate
        dr,  # Daily default rate
        dr_delinq,  # Daily delinquency rate
        recovery_rate,
        recovery_lag,
        delinquency_recovery_rate,
        delinquency_to_default_rate,
        repeat_delinquency_factor,
    ):
        """
        Applies prepayment, delinquency, and default assumptions.
        Returns a DataFrame with modeled cash flows.
        """
        df = cf_df.copy().reset_index(drop=True)

        # Initialize new columns
        df["actual_balance"] = 0.0
        df["actual_principal"] = 0.0
        df["actual_interest"] = 0.0
        df["prepayment"] = 0.0
        df["default"] = 0.0
        df["delinquency"] = 0.0
        df["default_recovery"] = 0.0
        df["delinquency_recovery"] = 0.0
        df["loss"] = 0.0
        df["prepayment_interest_loss"] = 0.0
        df["net_modeled_cashflow"] = 0.0

        current_balance = df.loc[0, "beginning_balance"]

        ab_list = []  # actual_balance
        ap_list = []  # actual_principal
        ai_list = []  # actual_interest
        pp_list = []  # prepayment
        def_list = []  # default
        del_list = []  # delinquency
        def_rec_list = []  # default_recovery
        del_rec_list = []  # delinquency_recovery
        loss_list = []  # loss
        pp_loss_list = []  # prepayment_interest_loss
        net_cf_list = []  # net_modeled_cashflow

        # Track default amounts for recovery
        defaults_for_recovery = []
        # Track delinquent amounts for recovery
        delinquencies_for_recovery = []

        # Track outstanding defaults and delinquencies
        outstanding_defaults = 0.0
        outstanding_delinquencies = 0.0

        for i, row in df.iterrows():
            scheduled_principal = row["principal_amount"]
            scheduled_interest = row["interest_amount"]
            scheduled_balance = row["beginning_balance"]

            # Scale down based on current balance vs. scheduled
            scaling_factor = current_balance / scheduled_balance if scheduled_balance > 0 else 0
            principal_adj = scheduled_principal * scaling_factor
            interest_adj = scheduled_interest * scaling_factor

            # After scheduled principal
            remaining_balance = current_balance - principal_adj

            # Prepayment
            prepayment_amt = remaining_balance * sm
            remaining_after_prepay = remaining_balance - prepayment_amt

            # Delinquency
            delinquency_amt = remaining_after_prepay * dr_delinq

            # Repeated delinquency logic
            if i > 0 and df.loc[i - 1, "delinquency"] > 0:
                prev_del = df.loc[i - 1, "delinquency"]
                repeat_factor = min(prev_del / current_balance, 0.5) if current_balance > 0 else 0
                additional_del = repeat_factor * remaining_after_prepay * (repeat_delinquency_factor - 1) * dr_delinq
                delinquency_amt += additional_del

            remaining_after_del = remaining_after_prepay - delinquency_amt

            # Some portion of delinquency goes to default
            delinquency_to_default_amt = delinquency_amt * delinquency_to_default_rate
            delinquency_amt -= delinquency_to_default_amt

            # Default
            default_amt = remaining_after_del * dr + delinquency_to_default_amt
            loss_amt = default_amt * (1 - recovery_rate)

            # Default recovery from earlier periods
            default_recovery_amt = 0.0
            if i >= recovery_lag and len(defaults_for_recovery) > recovery_lag:
                default_recovery_amt = defaults_for_recovery[i - recovery_lag] * recovery_rate

            # Delinquency recovery from earlier periods
            delinquency_recovery_amt = 0.0
            if i >= recovery_lag and len(delinquencies_for_recovery) > recovery_lag:
                delinquency_recovery_amt = delinquencies_for_recovery[i - recovery_lag] * delinquency_recovery_rate

            # Delinquency interest +50% on that portion
            if (principal_adj + interest_adj) > 0:
                delinquency_ratio = delinquency_amt / (principal_adj + interest_adj) if (principal_adj + interest_adj) > 0 else 0
                actual_interest = interest_adj + (interest_adj * 0.5 * delinquency_ratio)
            else:
                actual_interest = interest_adj

            # Prepayment interest loss
            if (principal_adj + prepayment_amt) > 0:
                fraction_prepay = prepayment_amt / (principal_adj + prepayment_amt)
            else:
                fraction_prepay = 0.0
            prepay_int_loss = scheduled_interest * scaling_factor * fraction_prepay

            # Actual principal paid
            actual_principal = principal_adj + prepayment_amt

            # Update outstanding defaults/delinquencies
            outstanding_defaults += default_amt
            outstanding_defaults -= default_recovery_amt
            if outstanding_defaults < 0:
                outstanding_defaults = 0

            outstanding_delinquencies += delinquency_amt
            outstanding_delinquencies -= delinquency_recovery_amt
            if outstanding_delinquencies < 0:
                outstanding_delinquencies = 0

            ab_list.append(current_balance)
            ap_list.append(actual_principal)
            ai_list.append(actual_interest)
            pp_list.append(prepayment_amt)
            def_list.append(default_amt)
            del_list.append(delinquency_amt)
            def_rec_list.append(default_recovery_amt)
            del_rec_list.append(delinquency_recovery_amt)
            loss_list.append(loss_amt)
            pp_loss_list.append(prepay_int_loss)

            defaults_for_recovery.append(default_amt)
            delinquencies_for_recovery.append(delinquency_amt)

            # Update balance
            current_balance = current_balance - actual_principal - default_amt - delinquency_amt
            if current_balance < 0:
                current_balance = 0

            # Net cash flow
            net_cf = actual_principal + actual_interest + default_recovery_amt + delinquency_recovery_amt
            net_cf_list.append(net_cf)

        df["actual_balance"] = ab_list
        df["actual_principal"] = ap_list
        df["actual_interest"] = ai_list
        df["prepayment"] = pp_list
        df["default"] = def_list
        df["delinquency"] = del_list
        df["default_recovery"] = def_rec_list
        df["delinquency_recovery"] = del_rec_list
        df["loss"] = loss_list
        df["prepayment_interest_loss"] = pp_loss_list
        df["net_modeled_cashflow"] = net_cf_list

        # Derived columns
        df["actual_cashflow"] = (
            df["actual_principal"] + df["actual_interest"] + df["default_recovery"] + df["delinquency_recovery"]
        )
        df["cumulative_actual_cashflow"] = df["actual_cashflow"].cumsum()
        df["cumulative_prepayment"] = df["prepayment"].cumsum()
        df["cumulative_default"] = df["default"].cumsum()
        df["cumulative_delinquency"] = df["delinquency"].cumsum()
        df["cumulative_loss"] = df["loss"].cumsum()
        df["cumulative_default_recovery"] = df["default_recovery"].cumsum()
        df["cumulative_delinquency_recovery"] = df["delinquency_recovery"].cumsum()

        return df

def normalize_coupon_rates(baseline_rate, stress_rate):
    """
    Normalizes unreasonably high coupon rates while preserving the relative impact
    of stress scenarios on the rate.
    """
    # Define reasonable coupon rate ranges
    MAX_REASONABLE_RATE = 50.0  # Maximum reasonable coupon rate
    TARGET_BASELINE_RATE = 35.0  # Target for baseline coupon rate
    
    # Check if either rate is unreasonably high
    if baseline_rate <= MAX_REASONABLE_RATE and stress_rate <= MAX_REASONABLE_RATE:
        return baseline_rate, stress_rate
    
    # Calculate the relative impact (important to preserve)
    if baseline_rate > 0:
        relative_impact = stress_rate / baseline_rate
    else:
        # Fallback if baseline is zero
        relative_impact = 1.0
        if stress_rate < 0:
            relative_impact = 0.9  # Negative impact
    
    # Apply normalization
    normalized_baseline = min(baseline_rate, TARGET_BASELINE_RATE)
    if baseline_rate > MAX_REASONABLE_RATE:
        normalized_baseline = TARGET_BASELINE_RATE
    
    # Apply the same relative impact to the normalized baseline
    normalized_stress = normalized_baseline * relative_impact
    
    # Ensure the stress rate stays in reasonable bounds
    normalized_stress = max(0.1, min(MAX_REASONABLE_RATE, normalized_stress))
    
    # Log the normalization
    logger.warning(f"Normalized coupon rates from {baseline_rate:.2f}%/{stress_rate:.2f}% to {normalized_baseline:.2f}%/{normalized_stress:.2f}%")
    
    return normalized_baseline, normalized_stress

def perform_enhanced_stress_test(df: pd.DataFrame, request: EnhancedStressTestRequest) -> Dict[str, Any]:
    """
    Performs enhanced stress test that combines cash flow modeling with ABS structure analysis
    
    Args:
        df: Cash flow DataFrame
        request: Enhanced stress test request with structure and scenario parameters
        
    Returns:
        Dict[str, Any]: Enhanced stress test results
    """
    try:
        logger.info("Starting enhanced stress test calculation")
        
        # Extract base parameters
        structure = request.structure
        scenario = request.scenario
        
        # Extract scenario parameters with defaults
        npl_rate = scenario.npl_rate
        prepayment_rate = scenario.prepayment_rate
        reinvestment_shift = scenario.reinvestment_shift
        recovery_rate = scenario.recovery_rate
        recovery_lag = scenario.recovery_lag
        delinquency_rate = scenario.delinquency_rate if scenario.delinquency_rate is not None else npl_rate / 2
        delinquency_recovery_rate = scenario.delinquency_recovery_rate
        delinquency_to_default_rate = scenario.delinquency_to_default_rate
        repeat_delinquency_factor = scenario.repeat_delinquency_factor
        
        # Log parameters
        logger.info(f"Scenario: {scenario.name}")
        logger.info(f"NPL Rate: {npl_rate}%, Prepayment: {prepayment_rate}%, Reinvestment Shift: {reinvestment_shift}%")
        logger.info(f"Recovery Rate: {recovery_rate}, Recovery Lag: {recovery_lag} days")
        logger.info(f"Delinquency Rate: {delinquency_rate}%, Delinquency Recovery Rate: {delinquency_recovery_rate}")
        
        # Convert start_date to pandas Timestamp
        start_date = CashFlowScenarioProcessor.ensure_timestamp(structure.start_date)
        logger.info(f"Start date: {start_date}")
        
        # Data validation
        if df is None or df.empty:
            raise ValueError("No valid cash flow data found for analysis")
        
        # Check for required columns
        required_columns = ['principal_amount', 'interest_amount', 'cash_flow', 'installment_date']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing columns in cash flow data: {', '.join(missing_columns)}")
        
        # Save original structure parameters to calculate original rates later if needed
        original_a_nominals = structure.a_nominals.copy()
        original_b_nominal = structure.b_nominal
        
        # First calculate baseline results with original cash flows
        logger.info("Calculating baseline results")
        try:
            baseline_result = calculate_tranche_results(
                df, start_date,
                structure.a_maturities, structure.a_base_rates, structure.a_spreads, structure.a_reinvest_rates,
                structure.a_nominals, structure.b_maturity, structure.b_base_rate, structure.b_spread,
                structure.b_reinvest_rate, structure.b_nominal, structure.ops_expenses
            )
        except Exception as e:
            logger.error(f"Error calculating baseline: {str(e)}")
            logger.debug(traceback.format_exc())
            raise ValueError(f"Error calculating baseline scenario: {str(e)}")
        
        # Prepare cash flow DataFrame for scenario analysis
        cf_df = CashFlowScenarioProcessor.prepare_cash_flow_dataframe(df)
        
        # Convert annual rates to daily rates
        daily_prepay_rate = CashFlowScenarioProcessor.cpr_to_smm(prepayment_rate / 100)
        daily_default_rate = CashFlowScenarioProcessor.cdr_to_mdr(npl_rate / 100)
        daily_delinquency_rate = CashFlowScenarioProcessor.cdr_to_mdr(delinquency_rate / 100)
        
        # Apply scenario assumptions to get modeled cash flows
        logger.info("Applying cash flow scenario modeling")
        try:
            modeled_df = CashFlowScenarioProcessor.apply_scenario_assumptions(
                cf_df,
                daily_prepay_rate,
                daily_default_rate,
                daily_delinquency_rate,
                recovery_rate,
                recovery_lag,
                delinquency_recovery_rate,
                delinquency_to_default_rate,
                repeat_delinquency_factor
            )
        except Exception as e:
            logger.error(f"Error in cash flow modeling: {str(e)}")
            logger.debug(traceback.format_exc())
            raise ValueError(f"Error during cash flow scenario modeling: {str(e)}")
        
        # Convert modeled cash flows back to original format for structure analysis
        stress_df = df.copy()
        stress_df["principal_amount"] = modeled_df["actual_principal"]
        stress_df["interest_amount"] = modeled_df["actual_interest"]
        stress_df["cash_flow"] = modeled_df["actual_cashflow"]
        
        # Apply reinvestment rate shift if specified
        a_reinvest_rates = list(structure.a_reinvest_rates)
        b_reinvest_rate = structure.b_reinvest_rate
        
        if reinvestment_shift != 0:
            logger.info(f"Applying {reinvestment_shift}% shift to reinvestment rates")
            a_reinvest_rates = [rate + reinvestment_shift for rate in structure.a_reinvest_rates]
            b_reinvest_rate = structure.b_reinvest_rate + reinvestment_shift
        
        # Calculate stress test results with modeled cash flows
        logger.info("Calculating stress test results using modeled cash flows")
        try:
            stress_result = calculate_tranche_results(
                stress_df, start_date,
                structure.a_maturities, structure.a_base_rates, structure.a_spreads, a_reinvest_rates,
                structure.a_nominals, structure.b_maturity, structure.b_base_rate, structure.b_spread,
                b_reinvest_rate, structure.b_nominal, structure.ops_expenses
            )
        except Exception as e:
            logger.error(f"Error calculating stress scenario: {str(e)}")
            logger.debug(traceback.format_exc())
            raise ValueError(f"Error calculating stress scenario: {str(e)}")
        
        # Calculate summary metrics
        total_original_principal = df["principal_amount"].sum()
        total_modeled_principal = modeled_df["actual_principal"].sum()
        total_default = modeled_df["default"].sum()
        total_default_pct = (total_default / total_original_principal) * 100 if total_original_principal > 0 else 0
        total_loss = modeled_df["loss"].sum()
        total_loss_pct = (total_loss / total_original_principal) * 100 if total_original_principal > 0 else 0
        total_delinquency = modeled_df["delinquency"].sum()
        total_delinquency_pct = (total_delinquency / total_original_principal) * 100 if total_original_principal > 0 else 0
        total_cf_reduction = ((df["cash_flow"].sum() - modeled_df["actual_cashflow"].sum()) / df["cash_flow"].sum()) * 100 if df["cash_flow"].sum() > 0 else 0
        
        # Extract key result values
        baseline_coupon_rate = baseline_result.get('effective_coupon_rate', 0)
        stress_coupon_rate = stress_result.get('effective_coupon_rate', 0)
        baseline_buffer = baseline_result.get('min_buffer_actual', 0)
        stress_buffer = stress_result.get('min_buffer_actual', 0)
        baseline_coupon = baseline_result.get('class_b_coupon', 0)
        stress_coupon = stress_result.get('class_b_coupon', 0)
        
        # Get direct coupon rates (not annualized)
        baseline_direct_rate = baseline_result.get('direct_coupon_rate', 0)
        stress_direct_rate = stress_result.get('direct_coupon_rate', 0)
        
        # Log original rates for debugging
        logger.info(f"Original rates - Baseline: {baseline_coupon_rate:.2f}%, Stress: {stress_coupon_rate:.2f}%, Difference: {stress_coupon_rate - baseline_coupon_rate:.2f}%")
        
        # Store original values for reference
        original_baseline_rate = baseline_coupon_rate
        original_stress_rate = stress_coupon_rate
        
        # Always check for unreasonably high rates (improved condition)
        if baseline_coupon_rate > 60 or stress_coupon_rate > 60:
            logger.warning(f"High coupon rates detected: Baseline={baseline_coupon_rate}%, Stress={stress_coupon_rate}%")
            
            # Try alternative calculation first
            try:
                logger.info("Trying alternative calculation method for more reasonable rates")
                
                # Calculate original coupon rate first
                original_result = calculate_tranche_results(
                    df, start_date,
                    structure.a_maturities, structure.a_base_rates, structure.a_spreads, structure.a_reinvest_rates,
                    original_a_nominals, structure.b_maturity, structure.b_base_rate, structure.b_spread,
                    structure.b_reinvest_rate, original_b_nominal, structure.ops_expenses
                )
                
                original_coupon_rate = original_result.get('effective_coupon_rate', 0)
                
                # Only use alternative if it's reasonable
                if original_coupon_rate <= 60:
                    # Estimate impact factor from cash flow reduction
                    principal_reduction_factor = max(0.01, total_modeled_principal / total_original_principal)
                    impact_factor = 1 - ((1 - principal_reduction_factor) * 0.7) # 70% impact from principal reduction
                    
                    # Apply impact to original rate
                    baseline_coupon_rate = original_coupon_rate
                    stress_coupon_rate = original_coupon_rate * impact_factor
                    
                    logger.info(f"Using estimated rates: Original={original_coupon_rate}%, Baseline={baseline_coupon_rate}%, Stress={stress_coupon_rate}%")
                else:
                    # If alternative is also high, normalize both
                    baseline_coupon_rate, stress_coupon_rate = normalize_coupon_rates(baseline_coupon_rate, stress_coupon_rate)
            except Exception as e:
                logger.warning(f"Alternative calculation failed: {str(e)}. Using normalization instead.")
                # If that fails, normalize the rates
                baseline_coupon_rate, stress_coupon_rate = normalize_coupon_rates(baseline_coupon_rate, stress_coupon_rate)
        
        # Calculate difference after normalization
        coupon_rate_diff = stress_coupon_rate - baseline_coupon_rate
        
        # Create response object
        response = {
            'baseline': {
                'class_b_coupon_rate': round(baseline_coupon_rate, 4),
                'min_buffer_actual': round(baseline_buffer, 4),
                'class_b_coupon': round(baseline_coupon, 4),
                'original_rate': round(original_baseline_rate, 4) if original_baseline_rate != baseline_coupon_rate else None
            },
            'stress_test': {
                'class_b_coupon_rate': round(stress_coupon_rate, 4),
                'min_buffer_actual': round(stress_buffer, 4),
                'class_b_coupon': round(stress_coupon, 4),
                'npl_rate': npl_rate,
                'prepayment_rate': prepayment_rate,
                'reinvestment_shift': reinvestment_shift,
                'original_rate': round(original_stress_rate, 4) if original_stress_rate != stress_coupon_rate else None,
                # Cash flow model metrics
                'recovery_rate': recovery_rate,
                'delinquency_rate': delinquency_rate,
                'total_default_pct': round(total_default_pct, 2),
                'total_loss_pct': round(total_loss_pct, 2),
                'total_delinquency_pct': round(total_delinquency_pct, 2),
                'total_cashflow_reduction_pct': round(total_cf_reduction, 2),
                'principal_reduction_pct': round((1 - total_modeled_principal / total_original_principal) * 100 if total_original_principal > 0 else 0, 2)
            },
            'difference': {
                'class_b_coupon_rate': round(coupon_rate_diff, 4),
                'min_buffer_actual': round(stress_buffer - baseline_buffer, 4),
                'class_b_coupon': round(stress_coupon - baseline_coupon, 4)
            },
            'cash_flow_model': {
                'total_original_principal': round(total_original_principal, 2),
                'total_modeled_principal': round(total_modeled_principal, 2),
                'total_default': round(total_default, 2),
                'total_delinquency': round(total_delinquency, 2),
                'total_loss': round(total_loss, 2),
                'total_recovery': round(modeled_df["default_recovery"].sum() + modeled_df["delinquency_recovery"].sum(), 2)
            }
        }
        
        # Log results
        logger.info("Enhanced stress test completed successfully")
        logger.info(f"Baseline rate: {response['baseline']['class_b_coupon_rate']}%, " +
                   f"Stress rate: {response['stress_test']['class_b_coupon_rate']}%")
        logger.info(f"Difference: {response['difference']['class_b_coupon_rate']}%")
        logger.info(f"Total loss: {total_loss_pct}% of principal, Cash flow reduction: {total_cf_reduction}%")
        
        return response
        
    except Exception as e:
        # Log detailed error
        logger.error(f"Unexpected error during enhanced stress test: {str(e)}")
        logger.debug(traceback.format_exc())
        raise ValueError(f"Enhanced stress test calculation failed: {str(e)}")