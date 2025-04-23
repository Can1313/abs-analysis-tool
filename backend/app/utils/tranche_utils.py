# backend/app/utils/tranche_utils.py
"""
Utility module containing shared calculation functions
for Optimization and Calculation services.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from app.utils.finance_utils import (
    simple_to_compound_annual,
    get_nearest_maturity
)
from app.utils.cash_flow_utils import (
    assign_cash_flows_to_tranches,
    calculate_totals
)

def calculate_tranche_results(
    df: pd.DataFrame,
    start_date: pd.Timestamp,
    a_maturities: List[int],
    a_base_rates: List[float],
    a_spreads: List[float],
    a_reinvest_rates: List[float],
    a_nominals: List[float],
    b_maturity: int,
    b_base_rate: float,
    b_spread: float,
    b_reinvest_rate: float,
    b_nominal: float,
    ops_expenses: float = 0.0
) -> Dict[str, Any]:
    """
    Contains shared tranche calculation logic used in
    both optimization and calculation services.
    
    Args:
        df: DataFrame containing cash flow data
        start_date: Start date
        a_maturities: Class A maturity days
        a_base_rates: Class A base interest rates
        a_spreads: Class A spread values
        a_reinvest_rates: Class A reinvestment rates
        a_nominals: Class A nominal values
        b_maturity: Class B maturity days
        b_base_rate: Class B base interest rate
        b_spread: Class B spread value
        b_reinvest_rate: Class B reinvestment rate
        b_nominal: Class B nominal value
        ops_expenses: Operational expenses
        
    Returns:
        Dictionary containing calculation results
    """
    # Temporary dataframe copy
    df_temp = df.copy()
    df_temp["cash_flow"] = df_temp["original_cash_flow"].copy()
    
    # Deduct operational expenses (April 29, 2025)
    if ops_expenses > 0:
        target_date = pd.Timestamp("2025-04-29")
        mask = df_temp["installment_date"].dt.date == target_date.date()
        if mask.any():
            idx = df_temp[mask].index[0]
            df_temp.at[idx, "cash_flow"] = max(0, df_temp.at[idx, "cash_flow"] - ops_expenses)
    
    # Combine all parameters
    all_maturity_days = a_maturities + [b_maturity]
    all_base_rates = a_base_rates + [b_base_rate]
    all_spreads = a_spreads + [b_spread]
    all_reinvest_rates = a_reinvest_rates + [b_reinvest_rate]
    all_nominals = a_nominals + [b_nominal]
    all_maturity_dates = [start_date + pd.Timedelta(days=days) for days in all_maturity_days]
    
    # Distribute cash flows to tranches
    tranch_cash_flows = assign_cash_flows_to_tranches(
        df_temp, start_date, all_maturity_dates, all_reinvest_rates
    )
    
    # Calculate tranche results
    results = []
    buffer = 0.0
    
    for i, days in enumerate(all_maturity_days):
        is_a = i < len(a_maturities)
        t_name = f"Class {'A' if is_a else 'B'}{i+1 if is_a else ''}".strip()
        
        # Calculate cash flow, reinvestment and buffer
        c_flow, r_ret, total_principal, total_interest = calculate_totals(
            tranch_cash_flows[i], all_maturity_dates[i], all_reinvest_rates[i]
        )
        
        # Calculate buffer interest return
        buf_reinv = 0.0
        if i > 0 and buffer > 0 and days > all_maturity_days[i-1]:
            factor = (1 + simple_to_compound_annual(all_reinvest_rates[i])/100)**(
                (days - all_maturity_days[i-1]) / 365
            ) - 1
            buf_reinv = buffer * factor
        
        # Total available cash
        available = c_flow + r_ret + buffer + buf_reinv
        nominal = all_nominals[i]
        
        # Interest rate parameters
        base_rate = all_base_rates[i]
        spread = all_spreads[i]
        total_rate = base_rate + spread/100
        
        if is_a:
            # Calculation for Class A
            total_rate = base_rate + spread/100
            # Prevent division by zero
            if days == 0 or total_rate == 0:
                disc = 1
            else:
                disc = 1 / (1 + total_rate/100 * days/365)
            principal = nominal * disc
            interest = nominal - principal
            coupon = 0.0
            coupon_rate = 0.0
            eff_coupon = 0.0
            total_pay = nominal
        else:
            # Calculation for Class B
            principal = max(0.001, nominal)
            coupon = max(0, available - principal)
            interest = 0.0
            # Prevent division by zero
            if principal > 0.001:
                coupon_rate = coupon / principal * 100
                # Prevent division by zero for effective coupon
                if days > 0:
                    eff_coupon = (coupon / principal * 365 / days * 100)
                else:
                    eff_coupon = 0.0
            else:
                coupon_rate = 0.0
                eff_coupon = 0.0
            total_pay = principal + coupon
        
        # Calculate buffer
        new_buffer = max(0.0, available - total_pay)
        # Prevent division by zero
        buf_ratio = (new_buffer / nominal * 100) if nominal > 0 else 0.0
        
        # Add results
        results.append({
            "Tranche": t_name,
            "Start Date": start_date.strftime("%d/%m/%Y"),
            "Maturity Days": days,
            "Maturity Date": all_maturity_dates[i].strftime("%d/%m/%Y"),
            "Base Rate (%)": all_base_rates[i],
            "Spread (bps)": all_spreads[i],
            "Total Interest Rate (%)": total_rate,
            "Coupon Rate (%)": coupon_rate,
            "Effective Coupon (%)": eff_coupon,
            "Original Nominal": nominal,
            "Adjusted Nominal": nominal,
            "Buffer In": buffer,
            "Cash Flow Total": c_flow,
            "Reinvestment Return": r_ret,
            "Buffer Reinvestment": buf_reinv,
            "Total Available": available,
            "Principal": principal,
            "Interest": interest,
            "Coupon Payment": coupon,
            "Nominal Payment": nominal,
            "Total Payment": total_pay,
            "Buffer Out": new_buffer,
            "Buffer Cash Flow Ratio (%)": buf_ratio,
            "Discount Factor": 1.0,
            "Is Class A": is_a,
        })
        
        # Update buffer
        buffer = new_buffer
    
    # Split results by Class A and B
    a_results = [r for r in results if r["Is Class A"]]
    b_results = [r for r in results if not r["Is Class A"]]
    
    # Calculate totals
    class_a_principal = sum(r["Principal"] for r in a_results)
    class_b_principal = sum(r["Principal"] for r in b_results)
    class_a_interest = sum(r["Interest"] for r in a_results)
    class_b_coupon = sum(r["Coupon Payment"] for r in b_results)
    class_a_total = sum(r["Total Payment"] for r in a_results)
    class_b_total = sum(r["Total Payment"] for r in b_results)
    
    # Minimum buffer ratio (avoid empty list)
    min_buffer_actual = min(r["Buffer Cash Flow Ratio (%)"] for r in a_results) if a_results else 0.0
    
    # Total paid and financing cost
    total_principal_paid = class_a_principal + class_b_principal
    total_loan_principal = df_temp["principal_amount"].sum()
    financing_cost = total_principal_paid - total_loan_principal
    
    # Interest rate conversion information
    rate_conversions = []
    for i, days in enumerate(all_maturity_days):
        is_a = i < len(a_maturities)
        t_name = f"Class {'A' if is_a else 'B'}{i+1 if is_a else ''}".strip()
        
        if is_a:
            # For Class A tranches
            total_rate = all_base_rates[i] + all_spreads[i]/100
            simple_annual = total_rate
            compound_for_period = simple_to_maturity_compound(total_rate, days)
            reinvest_simple = all_reinvest_rates[i]
            reinvest_compound = overnight_to_annual_compound(all_reinvest_rates[i])
            coupon_rate = "-"
            eff_coupon_rate = "-"
        else:
            # For Class B tranches
            coupon_rate = results[i]["Coupon Rate (%)"]
            eff_coupon_rate = results[i]["Effective Coupon (%)"]
            simple_annual = "-"
            compound_for_period = "-"
            reinvest_simple = all_reinvest_rates[i]
            reinvest_compound = overnight_to_annual_compound(all_reinvest_rates[i])
        
        rate_conversions.append({
            "Tranche": t_name,
            "Maturity Days": days,
            "Simple Annual Interest (%)": simple_annual,
            "Compound Interest for Period (%)": compound_for_period,
            "Reinvest Simple Annual (%)": reinvest_simple,
            "Reinvest O/N Compound (%)": reinvest_compound,
            "Coupon Rate (%)": coupon_rate,
            "Effective Coupon Rate (%)": eff_coupon_rate,
        })
    
    # Direct coupon rate and effective coupon rate
    direct_coupon_rate = results[-1]["Coupon Rate (%)"] if b_results else 0.0
    effective_coupon_rate = results[-1]["Effective Coupon (%)"] if b_results else 0.0
    
    # Return results
    return {
        "tranche_results": results,
        "interest_rate_conversions": rate_conversions,
        "class_a_total": class_a_total,
        "class_b_total": class_b_total,
        "class_a_principal": class_a_principal,
        "class_b_principal": class_b_principal,
        "class_a_interest": class_a_interest,
        "class_b_coupon": class_b_coupon,
        "min_buffer_actual": min_buffer_actual,
        "total_principal_paid": total_principal_paid,
        "total_loan_principal": total_loan_principal,
        "financing_cost": financing_cost,
        "direct_coupon_rate": direct_coupon_rate,
        "effective_coupon_rate": effective_coupon_rate
    }

def simple_to_maturity_compound(simple_rate_percent, days):
    """Convert a simple rate over 'days' to an equivalent annual compounded rate."""
    if days <= 0:
        return 0.0
    r_simple = simple_rate_percent / 100.0
    period_simple = r_simple * (days / 365)  # portion of the year
    period_compound = (1 + period_simple)**(365 / days) - 1
    return period_compound * 100.0

def overnight_to_annual_compound(simple_rate_percent):
    """Convert an annual simple rate to annual compound."""
    daily_rate = simple_rate_percent / 365 / 100
    annual_compound = (1 + daily_rate)**365 - 1
    return annual_compound * 100.0

def adjust_class_a_nominals_for_target_coupon(
    df: pd.DataFrame,
    start_date: pd.Timestamp,
    a_maturities: List[int],
    a_nominals: List[float],
    a_base_rates: List[float],
    a_spreads: List[float],
    a_reinvest_rates: List[float],
    b_maturity: int,
    b_base_rate: float,
    b_spread: float,
    b_reinvest_rate: float,
    class_b_nominal: float,
    target_class_b_coupon_rate: float,
    target_class_b_percent: float,
    min_buffer: float,
    ops_expenses: float = 0.0,
    max_allowed_diff: float = 0.5,
    class_b_percent_deviation: float = 1.0,
    max_iterations: int = 30
) -> Tuple[List[float], bool, float]:
    """
    Adjusts Class A nominal amounts to reach target Class B coupon rate,
    while ensuring that Class B represents 5-6% of the total transaction.
    
    Args:
        df: DataFrame containing cash flow data
        start_date: Start date
        a_maturities: Class A maturity days
        a_nominals: Class A nominal values (initial values)
        a_base_rates: Class A base interest rates
        a_spreads: Class A spread values
        a_reinvest_rates: Class A reinvestment rates
        b_maturity: Class B maturity days
        b_base_rate: Class B base interest rate
        b_spread: Class B spread value
        b_reinvest_rate: Class B reinvestment rate
        class_b_nominal: Class B nominal value
        target_class_b_coupon_rate: Target Class B coupon rate
        target_class_b_percent: Target Class B percentage (ignored, as we use fixed 5-6% range)
        min_buffer: Minimum buffer requirement
        ops_expenses: Operational expenses
        max_allowed_diff: Maximum allowed difference
        class_b_percent_deviation: Allowed Class B percentage deviation (ignored, as we use fixed 5-6% range)
        max_iterations: Maximum number of iterations
        
    Returns:
        (adjusted_nominal_list, success_flag, actual_class_b_percentage)
    """
    try:
        # Initial parameters
        original_a_total = sum(a_nominals)
        # Prevent division by zero
        if original_a_total <= 0:
            # Return unchanged if A total is zero or negative
            return a_nominals, False, 0.0
            
        original_proportions = [n / original_a_total for n in a_nominals]
        
        # Nominal constraints
        min_adjustment = 0.001  # Can go down to 0.1% of original
        max_adjustment = 3.0    # Can go up to 3x of original
        
        # Check boundaries
        b_maturity = max(1, min(365, b_maturity))
        
        # Define strict Class B percentage constraints - exactly 5-6%
        min_class_b_percent = 5.0  # Hard minimum of 5%
        max_class_b_percent = 6.0  # Hard maximum of 6%
        
        # Calculate Class B percentage
        total_nominal = original_a_total + class_b_nominal
        # Prevent division by zero
        if total_nominal <= 0:
            actual_class_b_percent = 0.0
        else:
            actual_class_b_percent = (class_b_nominal / total_nominal) * 100
        
        # Initial evaluation
        result = calculate_tranche_results(
            df, start_date,
            a_maturities, a_base_rates, a_spreads, a_reinvest_rates, a_nominals,
            b_maturity, b_base_rate, b_spread, b_reinvest_rate, class_b_nominal,
            ops_expenses
        )
        
        baseline_coupon_rate = result['effective_coupon_rate']
        baseline_min_buffer = result['min_buffer_actual']
        
        # Adjust initial Class B nominal to ensure it falls within 5-6% range
        if original_a_total > 0:  # Prevent division by zero
            if actual_class_b_percent < min_class_b_percent:
                # If below 5%, increase Class B nominal
                required_b_percent = min_class_b_percent / 100
                # Prevent division by zero
                if required_b_percent < 1.0:  # Ensure denominator isn't zero
                    new_b_nominal = (original_a_total * required_b_percent) / (1 - required_b_percent)
                    class_b_nominal = max(1000, round(new_b_nominal / 1000) * 1000)
                    total_nominal = original_a_total + class_b_nominal
                    actual_class_b_percent = (class_b_nominal / total_nominal) * 100
            elif actual_class_b_percent > max_class_b_percent:
                # If above 6%, decrease Class B nominal
                required_b_percent = max_class_b_percent / 100
                # Prevent division by zero
                if required_b_percent < 1.0:  # Ensure denominator isn't zero
                    new_b_nominal = (original_a_total * required_b_percent) / (1 - required_b_percent)
                    class_b_nominal = max(1000, round(new_b_nominal / 1000) * 1000)
                    total_nominal = original_a_total + class_b_nominal
                    actual_class_b_percent = (class_b_nominal / total_nominal) * 100
        
        # Initial correction approach
        if baseline_coupon_rate > 0:
            # Prevent division by zero
            direct_adjustment = target_class_b_coupon_rate / baseline_coupon_rate if baseline_coupon_rate != 0 else 1.0
            direct_adjustment = max(min_adjustment, min(max_adjustment, direct_adjustment))
            
            test_nominals = [original_proportions[i] * original_a_total * direct_adjustment 
                           for i in range(len(a_nominals))]
            
            test_nominals = [max(1000, round(n / 1000) * 1000) for n in test_nominals]
            
            # Test adjusted values and update Class B to maintain 5-6%
            test_a_total = sum(test_nominals)
            
            # Prevent test_a_total from being zero
            if test_a_total <= 0:
                test_a_total = original_a_total
            
            # Recalculate Class B nominal to maintain percentage
            mid_target_percent = 5.5  # Target middle of the range (5.5%)
            required_b_percent = mid_target_percent / 100
            
            # Prevent division by zero
            if required_b_percent < 1.0:  # Ensure denominator isn't zero
                new_b_nominal = (test_a_total * required_b_percent) / (1 - required_b_percent)
                class_b_nominal = max(1000, round(new_b_nominal / 1000) * 1000)
            
                # Recalculate percentage
                test_total_nominal = test_a_total + class_b_nominal
                test_class_b_percent = (class_b_nominal / test_total_nominal) * 100
                
                # Test with adjusted values
                test_result = calculate_tranche_results(
                    df, start_date,
                    a_maturities, a_base_rates, a_spreads, a_reinvest_rates, test_nominals,
                    b_maturity, b_base_rate, b_spread, b_reinvest_rate, class_b_nominal,
                    ops_expenses
                )
                
                direct_coupon_rate = test_result['effective_coupon_rate']
                direct_min_buffer = test_result['min_buffer_actual']
                
                # Check if Class B percentage is within allowed range (5-6%)
                is_class_b_percent_valid = min_class_b_percent <= test_class_b_percent <= max_class_b_percent
                
                # Use direct approach if good enough
                if direct_min_buffer >= min_buffer and abs(direct_coupon_rate - target_class_b_coupon_rate) <= max_allowed_diff and is_class_b_percent_valid:
                    return test_nominals, True, test_class_b_percent
            
            # Set initial value
            current_adjustment = direct_adjustment
            adjustment_direction = 1 if direct_coupon_rate < target_class_b_coupon_rate else -1
        else:
            current_adjustment = 1.0
            adjustment_direction = 0  # Start neutral
        
        # Determine initial direction (if not determined by direct_approach)
        if baseline_coupon_rate < target_class_b_coupon_rate and adjustment_direction == 0:
            adjustment_direction = 1  # Increase
            current_adjustment = 1.2  # Start with 20% increase
        elif baseline_coupon_rate > target_class_b_coupon_rate and adjustment_direction == 0:
            adjustment_direction = -1  # Decrease
            
            # Aggressive adjustment based on distance from target
            # Prevent division by zero
            if target_class_b_coupon_rate > 0:
                coupon_ratio = baseline_coupon_rate / target_class_b_coupon_rate
                if coupon_ratio > 10:
                    current_adjustment = 0.01  # 1% of original size
                elif coupon_ratio > 5:
                    current_adjustment = 0.05  # 5% of original size
                elif coupon_ratio > 2:
                    current_adjustment = 0.1   # 10% of original size
                else:
                    current_adjustment = 0.5   # 50% of original size
            else:
                current_adjustment = 0.5  # Default to 50% if target rate is zero
        
        best_diff = float('inf')
        best_nominals = a_nominals.copy()
        best_class_b_percent = actual_class_b_percent
        best_class_b_nominal = class_b_nominal
        success = False
        
        # Previous results (for interpolation)
        last_adjustment = current_adjustment
        last_coupon_rate = baseline_coupon_rate
        
        # Improved adaptive search loop
        for iteration in range(max_iterations):
            # Apply current adjustment factor
            current_nominals = [original_proportions[i] * original_a_total * current_adjustment 
                               for i in range(len(a_nominals))]
            
            # Round to nearest 1000 and ensure non-zero
            current_nominals = [max(1000, round(n / 1000) * 1000) for n in current_nominals]
            
            # Calculate current Class A total
            current_a_total = sum(current_nominals)
            
            # Prevent current_a_total from being zero
            if current_a_total <= 0:
                current_a_total = original_a_total
            
            # Recalculate Class B nominal to maintain 5-6%
            mid_target_percent = 5.5  # Target middle of the range (5.5%)
            required_b_percent = mid_target_percent / 100
            
            # Prevent division by zero
            if required_b_percent >= 1.0:
                # If percentage is 100% or more, use a safe fallback
                class_b_nominal = current_a_total * 0.06  # Use 6% as fallback
            else:
                new_b_nominal = (current_a_total * required_b_percent) / (1 - required_b_percent)
                class_b_nominal = max(1000, round(new_b_nominal / 1000) * 1000)
            
            # Recalculate actual percentage
            current_total_nominal = current_a_total + class_b_nominal
            # Prevent division by zero
            if current_total_nominal <= 0:
                current_class_b_percent = 0.0
            else:
                current_class_b_percent = (class_b_nominal / current_total_nominal) * 100
            
            # Evaluate current adjustment
            result = calculate_tranche_results(
                df, start_date,
                a_maturities, a_base_rates, a_spreads, a_reinvest_rates, current_nominals,
                b_maturity, b_base_rate, b_spread, b_reinvest_rate, class_b_nominal,
                ops_expenses
            )
            
            coupon_rate = result['effective_coupon_rate']
            min_buffer_actual = result['min_buffer_actual']
            
            # Calculate difference from target
            rate_diff = abs(coupon_rate - target_class_b_coupon_rate)
            
            # Check if Class B percentage is valid (5-6%)
            is_class_b_percent_valid = min_class_b_percent <= current_class_b_percent <= max_class_b_percent
            
            # Save if this result is better and meets buffer requirement
            if min_buffer_actual >= min_buffer and is_class_b_percent_valid and rate_diff < best_diff:
                best_diff = rate_diff
                best_nominals = current_nominals.copy()
                best_class_b_percent = current_class_b_percent
                best_class_b_nominal = class_b_nominal
                
                # Consider success if close to target
                if rate_diff <= max_allowed_diff:
                    success = True
                    
                    # Exit early if very close to target
                    if rate_diff < 0.1:
                        break
            
            # Linear interpolation for better estimation
            if iteration > 0 and last_coupon_rate != coupon_rate:
                adjustment_diff = current_adjustment - last_adjustment
                # Prevent division by zero
                if abs(adjustment_diff) > 0.000001:
                    # Calculate rate change slope
                    rate_slope = (coupon_rate - last_coupon_rate) / adjustment_diff
                    
                    # Prevent division by zero
                    if abs(rate_slope) > 0.001:
                        # Estimate adjustment needed to hit target
                        estimated_adjustment = last_adjustment + (target_class_b_coupon_rate - last_coupon_rate) / rate_slope
                        
                        # Keep within reasonable limits
                        next_adjustment = max(min_adjustment, min(max_adjustment, estimated_adjustment))
                        
                        # Use interpolation only if not too extreme
                        if 0.5 * current_adjustment <= next_adjustment <= 2.0 * current_adjustment:
                            # Save current values
                            last_adjustment = current_adjustment
                            last_coupon_rate = coupon_rate
                            
                            # Set interpolation result
                            current_adjustment = next_adjustment
                            continue
            
            # Save current values for next interpolation
            last_adjustment = current_adjustment
            last_coupon_rate = coupon_rate
            
            # Adaptive adjustment based on results
            if coupon_rate < target_class_b_coupon_rate:
                if adjustment_direction == 1:
                    # Going in right direction (increasing), be more aggressive
                    # Prevent division by zero
                    if coupon_rate > 0:
                        coupon_ratio = target_class_b_coupon_rate / coupon_rate
                        current_adjustment *= min(1.5, coupon_ratio)
                    else:
                        current_adjustment *= 1.5  # Default increase by 50% if coupon rate is zero
                else:
                    # Went too far, change direction with smaller step
                    adjustment_direction = 1
                    current_adjustment = 1.0 + (1.0 - current_adjustment) * 0.3
            else:  # coupon_rate > target_class_b_coupon_rate
                if adjustment_direction == -1:
                    # Going in right direction (decreasing), be more aggressive
                    # Prevent division by zero
                    if target_class_b_coupon_rate > 0:
                        coupon_ratio = coupon_rate / target_class_b_coupon_rate
                        current_adjustment *= max(0.5, 1/coupon_ratio)
                    else:
                        current_adjustment *= 0.5  # Default decrease by 50% if target rate is zero
                else:
                    # Went too far, change direction with smaller step
                    adjustment_direction = -1
                    current_adjustment = 1.0 - (current_adjustment - 1.0) * 0.3
            
            # Ensure adjustment is within limits
            current_adjustment = max(min_adjustment, min(max_adjustment, current_adjustment))
            
            # Exit early if making very small changes and stuck
            if abs(current_adjustment - last_adjustment) < 0.001 and iteration > 10:
                break
        
        # Final verification of Class B percentage
        final_a_total = sum(best_nominals)
        # Prevent division by zero
        if final_a_total <= 0:
            return a_nominals, False, actual_class_b_percent
            
        final_total = final_a_total + best_class_b_nominal
        # Prevent division by zero
        if final_total <= 0:
            final_class_b_percent = 0.0
        else:
            final_class_b_percent = (best_class_b_nominal / final_total) * 100
        
        # Ensure percentage is exactly within bounds before returning
        if final_class_b_percent < min_class_b_percent or final_class_b_percent > max_class_b_percent:
            # Final forced adjustment to meet 5-6% requirement
            mid_target_percent = 5.5  # Target middle of the range (5.5%)
            required_b_percent = mid_target_percent / 100
            
            # Prevent division by zero
            if required_b_percent < 1.0:  # Ensure denominator isn't zero
                adjusted_b_nominal = (final_a_total * required_b_percent) / (1 - required_b_percent)
                adjusted_b_nominal = max(1000, round(adjusted_b_nominal / 1000) * 1000)
                
                # Recalculate final percentage
                final_total = final_a_total + adjusted_b_nominal
                # Prevent division by zero
                if final_total > 0:
                    final_class_b_percent = (adjusted_b_nominal / final_total) * 100
        
        return best_nominals, success, final_class_b_percent
        
    except Exception as e:
        # Gracefully handle any errors
        print(f"Error in adjust_class_a_nominals: {str(e)}")
        # Return original values if we encounter errors
        return a_nominals, False, actual_class_b_percent if 'actual_class_b_percent' in locals() else 0.0