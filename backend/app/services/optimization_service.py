"""
Optimization service for ABS structure analysis.
This module implements multiple optimization strategies to find optimal ABS configurations
with improved Class B percentage targeting.
"""
import time
import pandas as pd
import numpy as np
import itertools
from datetime import datetime, timedelta
import random
import traceback
import logging
from typing import Dict, List, Any, Tuple, Optional

from app.models.input_models import OptimizationSettings, GeneralSettings
from app.models.output_models import OptimizationResult
from app.utils.finance_utils import (
    simple_to_compound_annual,
    get_nearest_maturity,
    get_last_cash_flow_day
)
from app.utils.cash_flow_utils import (
    assign_cash_flows_to_tranches,
    calculate_totals
)

# Configure logger
logger = logging.getLogger(__name__)

class OptimizationProgress:
    """Class to track and report optimization progress"""
    def __init__(self):
        self.reset()
        
    def reset(self):
        """Reset all progress tracking variables"""
        self.current_step = 0
        self.total_steps = 100
        self.current_phase = "Initializing"
        self.status_message = "Starting optimization..."
        self.progress = 0
        self.last_update_time = time.time()
        self.start_time = time.time()
        logger.info("Progress tracker reset")
        
    def update(self, step=None, total=None, phase=None, message=None):
        """Update progress information"""
        current_time = time.time()
        
        # Update more frequently
        force_update = (current_time - self.last_update_time) > 0.2
        
        if step is not None:
            self.current_step = step
        if total is not None:
            self.total_steps = total
        if phase is not None:
            self.current_phase = phase
        if message is not None:
            self.status_message = message
            
        # Calculate percentage
        if self.total_steps > 0:
            new_progress = min(99, int((self.current_step / self.total_steps) * 100))
            if self.current_phase == "Complete" or self.current_phase == "Error":
                new_progress = 100  # Set to 100% when complete or error
            
            progress_changed = new_progress != self.progress
            self.progress = new_progress
        
        # Log progress updates
        if phase is not None or message is not None or progress_changed or force_update:
            elapsed = current_time - self.start_time
            logger.info(f"Progress: {self.progress}% - {self.current_phase} - {self.status_message} (elapsed: {elapsed:.1f}s)")
            self.last_update_time = current_time
        
    def get_info(self):
        """Get current progress information with additional data"""
        current_time = time.time()
        elapsed = current_time - self.start_time
        
        return {
            "progress": self.progress,
            "phase": self.current_phase,
            "message": self.status_message,
            "step": self.current_step,
            "total_steps": self.total_steps,
            "timestamp": current_time,
            "elapsed_seconds": elapsed,
            "start_time": self.start_time
        }

# Create the global optimization_progress instance
optimization_progress = OptimizationProgress()

def adjust_class_a_nominals_for_target_coupon(
    a_nominals: List[float], 
    class_b_nominal: float, 
    target_coupon_rate: float, 
    class_b_maturity: int,
    a_maturity_days: List[int], 
    a_base_rates: List[float], 
    a_reinvest_rates: List[float], 
    b_base_rate: float, 
    b_reinvest_rate: float,
    start_date: pd.Timestamp, 
    df_temp: pd.DataFrame, 
    min_buffer: float,
    target_class_b_percent: float,
    max_allowed_diff: float = 0.5,  # Reduced from 1.0 to 0.5 for tighter matching
    class_b_percent_deviation: float = 1.0  # Add new parameter with tighter default value
) -> Tuple[List[float], bool, float]:
    """
    Iteratively adjust Class A nominal amounts to achieve a target coupon rate for Class B
    using an improved adaptive search approach for faster convergence.
    
    Args:
        a_nominals: List of Class A nominal amounts
        class_b_nominal: Class B nominal amount
        target_coupon_rate: Target coupon rate for Class B
        class_b_maturity: Maturity days for Class B
        a_maturity_days: List of maturity days for Class A tranches
        a_base_rates: List of base rates for Class A tranches
        a_reinvest_rates: List of reinvestment rates for Class A tranches
        b_base_rate: Base rate for Class B
        b_reinvest_rate: Reinvestment rate for Class B
        start_date: Start date for calculations
        df_temp: DataFrame containing cash flow data
        min_buffer: Minimum buffer requirement
        target_class_b_percent: Target percentage for Class B
        max_allowed_diff: Maximum allowed difference between actual and target coupon rate
        class_b_percent_deviation: Maximum allowed deviation from target Class B percentage
        
    Returns:
        Tuple of (adjusted_nominals, success_flag, actual_class_b_percent)
    """
    # Initial parameters
    original_a_total = sum(a_nominals)
    original_proportions = [n / original_a_total for n in a_nominals]
    max_iterations = 30  # Reduced from 50 to 30 for faster execution
    
    # Fix 1: Ensure class_b_maturity is at least 1 to avoid division by zero
    class_b_maturity = max(1, min(365, class_b_maturity))
    
    # Adjustment limits 
    min_adjustment = 0.001  # Allow down to 0.1% of original
    max_adjustment = 3.0    # Allow up to 300% of original
    
    # Initialize adjustment direction variable to avoid errors
    adjustment_direction = 0  # Neutral at start
    
    logger.info(f"Starting adjustment with target coupon rate: {target_coupon_rate:.2f}%")
    logger.info(f"Original Class A total: {original_a_total:,.2f}, Class B nominal: {class_b_nominal:,.2f}")
    logger.info(f"Target Class B percentage: {target_class_b_percent:.2f}%, deviation: {class_b_percent_deviation:.2f}%")
    
    # Calculate actual Class B percentage
    total_nominal = original_a_total + class_b_nominal
    actual_class_b_percent = (class_b_nominal / total_nominal) * 100
    logger.info(f"Target Class B percentage: {target_class_b_percent:.2f}%, Actual: {actual_class_b_percent:.2f}%")
    
    # Maximum allowed deviation from target Class B percentage - use tighter limit of 1%
    max_class_b_percent_diff = 1.0  

    # Check if the initial Class B percentage is too far from target
    class_b_percent_diff = abs(actual_class_b_percent - target_class_b_percent)
    if class_b_percent_diff > max_class_b_percent_diff:
        logger.info(f"Initial Class B percentage too far from target. Diff: {class_b_percent_diff:.2f}%")
        
        # Calculate corrected B nominal to achieve target percentage
        target_b_share = target_class_b_percent / 100
        corrected_class_b_nominal = (original_a_total * target_b_share) / (1 - target_b_share)
        
        # Round to nearest 1000
        corrected_class_b_nominal = round(corrected_class_b_nominal / 1000) * 1000
        
        # Replace the provided B nominal with the corrected one
        class_b_nominal = corrected_class_b_nominal
        
        # Recalculate actual percentage
        total_nominal = original_a_total + class_b_nominal
        actual_class_b_percent = (class_b_nominal / total_nominal) * 100
        
        logger.info(f"Corrected Class B nominal: {class_b_nominal:,.2f}, percentage: {actual_class_b_percent:.2f}%")
    
    # First, evaluate the original nominals to get a baseline
    try:
        baseline_coupon_rate, baseline_min_buffer, baseline_direct_rate = evaluate_coupon_rate(
            a_nominals, class_b_nominal, class_b_maturity, 
            a_maturity_days, a_base_rates, a_reinvest_rates, 
            b_base_rate, b_reinvest_rate, start_date, df_temp
        )
        
        logger.info(f"Baseline - Coupon rate: {baseline_coupon_rate:.2f}%, Direct rate: {baseline_direct_rate:.2f}%, Buffer: {baseline_min_buffer:.2f}%")
        
        # Direct ratio-based initial approximation for faster convergence
        if baseline_coupon_rate > 0:
            direct_adjustment = target_coupon_rate / baseline_coupon_rate
            # Keep within limits
            direct_adjustment = max(min_adjustment, min(max_adjustment, direct_adjustment))
            
            # Test this direct approximation immediately
            test_nominals = [original_proportions[i] * original_a_total * direct_adjustment 
                           for i in range(len(a_nominals))]
            
            # Round to nearest 1000 and ensure no zeros
            test_nominals = [max(1000, round(n / 1000) * 1000) for n in test_nominals]
            
            direct_coupon_rate, direct_min_buffer, direct_direct_rate = evaluate_coupon_rate(
                test_nominals, class_b_nominal, class_b_maturity, 
                a_maturity_days, a_base_rates, a_reinvest_rates,
                b_base_rate, b_reinvest_rate, start_date, df_temp
            )
            
            # Recalculate actual Class B percentage with adjusted Class A
            test_a_total = sum(test_nominals)
            test_total_nominal = test_a_total + class_b_nominal
            test_class_b_percent = (class_b_nominal / test_total_nominal) * 100
            
            # Check if Class B percentage is within allowed range
            min_class_b_percent = max(0.1, target_class_b_percent - class_b_percent_deviation)
            max_class_b_percent = min(50, target_class_b_percent + class_b_percent_deviation)
            is_class_b_percent_valid = min_class_b_percent <= test_class_b_percent <= max_class_b_percent
            
            # If the direct approach gives a good result, use it immediately
            if direct_min_buffer >= min_buffer and abs(direct_coupon_rate - target_coupon_rate) <= max_allowed_diff and is_class_b_percent_valid:
                logger.info(f"Direct approach successful - Coupon rate: {direct_coupon_rate:.2f}%, "
                      f"diff: {abs(direct_coupon_rate - target_coupon_rate):.2f}%, "
                      f"min buffer: {direct_min_buffer:.2f}%, "
                      f"Class B %: {test_class_b_percent:.2f}%")
                return test_nominals, True, test_class_b_percent
                
            # If not perfect but close, use as starting point
            current_adjustment = direct_adjustment
            # Set direction based on direct approach result
            adjustment_direction = 1 if direct_coupon_rate < target_coupon_rate else -1
            logger.info(f"Using direct approach starting point: {direct_adjustment:.4f}, "
                  f"resulting coupon: {direct_coupon_rate:.2f}%")
        else:
            # Fallback to original approach if baseline is zero or negative
            logger.info("Baseline coupon is zero or negative, using standard approach")
            current_adjustment = 1.0
    except Exception as e:
        logger.error(f"Error evaluating baseline: {str(e)}")
        return a_nominals, False, actual_class_b_percent
    
    # Determine initial direction if not set by direct approach
    if baseline_coupon_rate < target_coupon_rate and adjustment_direction == 0:
        # If baseline coupon is too low, we need to increase Class A nominals
        logger.info("Baseline coupon is lower than target - will increase Class A nominals")
        adjustment_direction = 1  # Increase
        current_adjustment = 1.2  # Start with 20% increase
    elif baseline_coupon_rate > target_coupon_rate and adjustment_direction == 0:
        # If baseline coupon is too high, we need to decrease Class A nominals
        logger.info("Baseline coupon is higher than target - will decrease Class A nominals")
        adjustment_direction = -1  # Decrease
        
        # Set a very aggressive initial adjustment based on how far we are
        coupon_ratio = baseline_coupon_rate / target_coupon_rate
        if coupon_ratio > 10:
            # If coupon is more than 10x target, use extreme adjustment
            current_adjustment = 0.01  # 1% of original size
        elif coupon_ratio > 5:
            # If coupon is more than 5x target, use very aggressive adjustment
            current_adjustment = 0.05  # 5% of original size
        elif coupon_ratio > 2:
            # If coupon is more than 2x target, use aggressive adjustment
            current_adjustment = 0.1   # 10% of original size
        else:
            # For closer ratios, use moderate adjustment
            current_adjustment = 0.5   # 50% of original size
    
    best_diff = float('inf')
    best_nominals = a_nominals.copy()
    best_class_b_percent = actual_class_b_percent
    success = False
    
    # Store previous results for interpolation
    last_adjustment = current_adjustment
    last_coupon_rate = baseline_coupon_rate
    
    # Improved adaptive search with interpolation
    for iteration in range(max_iterations):
        # Apply current adjustment factor to all Class A nominals
        current_nominals = [original_proportions[i] * original_a_total * current_adjustment 
                           for i in range(len(a_nominals))]
        
        # Round to nearest 1000 and ensure no zeros
        current_nominals = [max(1000, round(n / 1000) * 1000) for n in current_nominals]
        
        # Fix 2: Add try-except with debug for error capture
        try:
            # Evaluate with current adjustment
            coupon_rate, min_buffer_actual, direct_rate = evaluate_coupon_rate(
                current_nominals, class_b_nominal, class_b_maturity, 
                a_maturity_days, a_base_rates, a_reinvest_rates,
                b_base_rate, b_reinvest_rate, start_date, df_temp
            )
            
            # Calculate difference from target
            rate_diff = abs(coupon_rate - target_coupon_rate)
            
            # Calculate actual Class B percentage
            current_a_total = sum(current_nominals)
            current_total_nominal = current_a_total + class_b_nominal
            current_class_b_percent = (class_b_nominal / current_total_nominal) * 100
            percent_diff = abs(current_class_b_percent - target_class_b_percent)
            
            # Check if Class B percentage is within allowed range
            is_class_b_percent_valid = min_class_b_percent <= current_class_b_percent <= max_class_b_percent
            
            logger.info(f"Iteration {iteration+1}, adjustment: {current_adjustment:.4f}, "
                  f"coupon: {coupon_rate:.2f}%, target: {target_coupon_rate:.2f}%, "
                  f"diff: {rate_diff:.2f}%, min buffer: {min_buffer_actual:.2f}%, "
                  f"Class B %: {current_class_b_percent:.2f}%, "
                  f"is_valid: {is_class_b_percent_valid}")
            
            # Check if this result is better and meets buffer requirement and Class B percentage requirement
            if min_buffer_actual >= min_buffer and is_class_b_percent_valid and rate_diff < best_diff:
                best_diff = rate_diff
                best_nominals = current_nominals.copy()
                best_class_b_percent = current_class_b_percent
                
                # If we're close to target, consider it a success
                if rate_diff <= max_allowed_diff:
                    success = True
                    logger.info(f"Found acceptable solution - coupon rate: {coupon_rate:.2f}%, "
                          f"diff: {rate_diff:.2f}%, min buffer: {min_buffer_actual:.2f}%, "
                          f"Class B %: {current_class_b_percent:.2f}%")
                    
                    # If very close to target, we can exit early
                    if rate_diff < 0.1:  # Tightened from 0.2 to 0.1
                        break
            
            # Fix 1: Linear interpolation section - add safeguard against division by zero
            if iteration > 0 and last_coupon_rate != coupon_rate:
                # Add check for division by zero
                if abs(current_adjustment - last_adjustment) > 0.000001:
                    # Calculate slope of coupon rate change vs adjustment change
                    rate_slope = (coupon_rate - last_coupon_rate) / (current_adjustment - last_adjustment)
                    
                    if abs(rate_slope) > 0.001:  # Avoid division by near-zero
                        # Estimate adjustment needed to hit target using linear interpolation
                        estimated_adjustment = last_adjustment + (target_coupon_rate - last_coupon_rate) / rate_slope
                        logger.info(f"Linear interpolation suggests adjustment: {estimated_adjustment:.4f}")
                        
                        # Keep within reasonable bounds
                        next_adjustment = max(min_adjustment, min(max_adjustment, estimated_adjustment))
                        
                        # Only use interpolation if it's not too extreme
                        if 0.5 * current_adjustment <= next_adjustment <= 2.0 * current_adjustment:
                            # Store current values before updating
                            last_adjustment = current_adjustment
                            last_coupon_rate = coupon_rate
                            
                            # Apply interpolated adjustment
                            current_adjustment = next_adjustment
                            continue  # Skip the standard adjustment logic below
            
            # Store current values for next interpolation
            last_adjustment = current_adjustment
            last_coupon_rate = coupon_rate
            
            # Standard adaptive adjustment based on current results
            if coupon_rate < target_coupon_rate:
                if adjustment_direction == 1:
                    # We're going in the right direction (increasing), make more aggressive adjustments
                    coupon_ratio = target_coupon_rate / coupon_rate
                    current_adjustment *= min(1.5, coupon_ratio)  # More aggressive increase
                else:
                    # We went too far, reverse direction and use smaller step
                    adjustment_direction = 1
                    current_adjustment = 1.0 + (1.0 - current_adjustment) * 0.3  # Smaller bounce back
            else:  # coupon_rate > target_coupon_rate
                if adjustment_direction == -1:
                    # We're going in the right direction (decreasing), be more aggressive
                    coupon_ratio = coupon_rate / target_coupon_rate
                    current_adjustment *= max(0.5, 1/coupon_ratio)  # More aggressive decrease
                else:
                    # We went too far, reverse direction and use smaller step
                    adjustment_direction = -1
                    current_adjustment = 1.0 - (current_adjustment - 1.0) * 0.3  # Smaller bounce back
            
            # Ensure adjustment is within bounds
            current_adjustment = max(min_adjustment, min(max_adjustment, current_adjustment))
            
            # Check if we're making too small changes and break early if we're stuck
            if abs(current_adjustment - last_adjustment) < 0.001 and iteration > 10:
                logger.info("Adjustment factor converged, stopping iterations")
                break
                
        except Exception as e:
            # Fix 2: Enhanced error logging
            logger.error(f"Error during adjustment iteration {iteration}: {str(e)}")
            logger.error(f"Parameters: class_b_maturity={class_b_maturity}, a_maturity_days={a_maturity_days}")
            # Continue to next iteration instead of terminating
            continue
    
    # If we didn't find a solution within max_allowed_diff but have a best solution, log it
    if not success and best_diff < float('inf'):
        logger.info(f"Best solution found: coupon rate diff: {best_diff:.2f}%")
    elif not success:
        logger.info(f"Failed to find valid solution. Try adjusting min buffer requirement or target coupon rate.")
    
    return best_nominals, success, best_class_b_percent

def evaluate_coupon_rate(
    a_nominals: List[float], 
    class_b_nominal: float, 
    class_b_maturity: int, 
    a_maturity_days: List[int], 
    a_base_rates: List[float], 
    a_reinvest_rates: List[float],
    b_base_rate: float, 
    b_reinvest_rate: float, 
    start_date: pd.Timestamp, 
    df_temp: pd.DataFrame
) -> Tuple[float, float, float]:  # Returns (coupon_rate, min_buffer, direct_coupon_rate)
    """
    Helper function to evaluate a specific nominal adjustment
    Returns tuple of (coupon_rate, min_buffer, direct_coupon_rate)
    
    This function has been revised to match the calculation logic in calculation_service.py
    """
    # Ensure class_b_maturity is at least 1 to avoid division by zero
    class_b_maturity = max(1, class_b_maturity)
    
    # Set up parameters for calculation
    a_spreads = [0.0] * len(a_maturity_days)
    b_maturity_days = [class_b_maturity]
    b_nominal = [class_b_nominal]
    b_spreads = [0.0]
    
    # Combine all parameters
    all_maturity_days = a_maturity_days + b_maturity_days
    all_base_rates = a_base_rates + [b_base_rate]
    all_spreads = a_spreads + b_spreads
    all_reinvest_rates = a_reinvest_rates + [b_reinvest_rate]
    all_nominal = a_nominals + b_nominal
    
    # Calculate maturity dates
    all_maturity_dates = [start_date + pd.Timedelta(days=days) for days in all_maturity_days]
    
    # Distribute cash flows to tranches
    tranch_cash_flows = assign_cash_flows_to_tranches(
        df_temp, start_date, all_maturity_dates, all_reinvest_rates
    )
    
    # Calculate results for each tranche
    results = []
    buffer = 0.0
    
    for i in range(len(all_maturity_days)):
        is_class_a = (i < len(a_maturity_days))
        
        # Calculate cash flow totals
        c_flow, r_return, total_principal, total_interest = calculate_totals(
            tranch_cash_flows[i], all_maturity_dates[i], all_reinvest_rates[i]
        )
        
        # Buffer reinvestment calculation - UPDATED to match calculation_service.py
        if i > 0 and buffer > 0:
            dd = all_maturity_days[i] - all_maturity_days[i-1]
            if dd > 0:
                factor = (1 + simple_to_compound_annual(all_reinvest_rates[i])/100)**(dd/365) - 1
                buffer_reinv = buffer * factor
            else:
                buffer_reinv = 0
        else:
            buffer_reinv = 0
        
        # Total available funds
        total_available = c_flow + r_return + buffer + buffer_reinv
        
        # Interest rate calculations
        base_rate_val = all_base_rates[i]
        spread_bps = all_spreads[i]
        total_rate = base_rate_val + (spread_bps/100.0)
        
        if is_class_a:
            # Class A payment logic - UPDATED to match calculation_service.py
            nominal_pmt = all_nominal[i]
            discount_factor = 1 / (1 + (total_rate/100 * all_maturity_days[i]/365)) if all_maturity_days[i] > 0 else 1
            principal = nominal_pmt * discount_factor
            interest = nominal_pmt - principal
            coupon_payment = 0
            total_payment = nominal_pmt
        else:
            # Class B payment logic - UPDATED to match calculation_service.py exactly
            nominal_pmt = all_nominal[i]
            # Ensure principal is never zero or too small
            principal = max(0.001, nominal_pmt)
            coupon_payment = max(0, total_available - principal)
            interest = 0
            total_payment = principal + coupon_payment
        
        # Calculate buffer - avoid division by zero
        new_buffer = max(0, total_available - total_payment)
        buffer_cf_ratio = (new_buffer / nominal_pmt * 100) if nominal_pmt > 0 else 0
        
        # Add to results
        results.append({
            "is_class_a": is_class_a,
            "principal": principal,
            "interest": interest,
            "coupon_payment": coupon_payment,
            "total_payment": total_payment,
            "buffer_cf_ratio": buffer_cf_ratio,
            "maturity_days": all_maturity_days[i],
            "base_rate": base_rate_val,
            "nominal": all_nominal[i]
        })
        
        # Update buffer for next tranche
        buffer = new_buffer
    
    # Split results by class
    class_a_results = [r for r in results if r['is_class_a']]
    class_b_results = [r for r in results if not r['is_class_a']]
    
    # UPDATED - Calculate coupon rates exactly like in calculation_service.py
    # Calculate Class B principal and coupon
    class_b_principal = sum(r['principal'] for r in class_b_results)
    class_b_coupon = sum(r['coupon_payment'] for r in class_b_results)
    
    # Calculate direct coupon rate with safeguard
    direct_coupon_rate = 0.0
    if class_b_principal > 0.001:  # Ensure principal is sufficiently above zero
        direct_coupon_rate = (class_b_coupon / class_b_principal) * 100
    
    # Calculate Class B effective coupon rate with safeguard
    class_b_coupon_rate = 0.0
    if class_b_results and class_b_principal > 0.001 and class_b_maturity > 0:
        class_b_maturity_days = class_b_results[0]['maturity_days']
        class_b_coupon_rate = (class_b_coupon / class_b_principal) * (365 / class_b_maturity_days) * 100
    
    # Calculate minimum buffer
    min_buffer_actual = min(r['buffer_cf_ratio'] for r in class_a_results) if class_a_results else 0.0
    
    return class_b_coupon_rate, min_buffer_actual, direct_coupon_rate  # Modified to return direct rate too
def evaluate_params(
    maturities: List[int], 
    nominals: List[float], 
    class_b_maturity: int, 
    start_date: pd.Timestamp, 
    df_temp: pd.DataFrame,
    maturity_to_base_rate_A: Dict[int, float], 
    maturity_to_reinvest_rate_A: Dict[int, float],
    class_b_base_rate: float, 
    class_b_reinvest_rate: float,
    target_class_b_percent: float, 
    class_b_percent_deviation: float,
    target_class_b_coupon_rate: float, 
    min_buffer: float
) -> Dict[str, Any]:
    """Helper function to evaluate a set of parameters
    
    Args:
        maturities: List of maturity days for Class A tranches
        nominals: List of nominal amounts for Class A tranches
        class_b_maturity: Maturity days for Class B
        start_date: Start date for calculations
        df_temp: DataFrame containing cash flow data
        maturity_to_base_rate_A: Dictionary mapping maturity days to base rates
        maturity_to_reinvest_rate_A: Dictionary mapping maturity days to reinvestment rates
        class_b_base_rate: Base rate for Class B
        class_b_reinvest_rate: Reinvestment rate for Class B
        target_class_b_percent: Target percentage of Class B tranche
        class_b_percent_deviation: Allowable deviation from target Class B percentage
        target_class_b_coupon_rate: Target coupon rate for Class B
        min_buffer: Minimum buffer requirement
        
    Returns:
        Dictionary containing evaluation results
    """
    # Ensure class_b_maturity is at least 1
    class_b_maturity = max(1, class_b_maturity)
    
    # Fast rejection for obviously invalid inputs
    if not maturities or not nominals or len(maturities) != len(nominals):
        return {
            'is_valid': False,
            'score': 0,
            'results': None,
            'error': "Invalid input dimensions",
            'b_nominal': 0,
            'class_b_percent': 0
        }
    
    # Convert to lists for key operations and ensure types are correct
    maturities = [int(m) for m in maturities]  # Ensure integers
    nominals = list(nominals)
    
    # Round nominals to nearest 1000 and ensure no zeros
    nominals = [max(1000, round(n / 1000) * 1000) for n in nominals]
    
    # Get rates from lookup tables with fallback values
    available_lookup_keys = list(maturity_to_base_rate_A.keys())
    base_rates = [maturity_to_base_rate_A.get(
        get_nearest_maturity(m, available_lookup_keys), 42.0) for m in maturities]
    
    reinvest_rates = [maturity_to_reinvest_rate_A.get(
        get_nearest_maturity(m, list(maturity_to_reinvest_rate_A.keys())), 30.0) for m in maturities]
    
    # Calculate total Class A nominal
    total_a_nominal = sum(nominals)
    if total_a_nominal <= 0:
        return {
            'is_valid': False,
            'score': 0,
            'results': None,
            'error': "Total Class A nominal must be positive",
            'b_nominal': 0,
            'class_b_percent': 0
        }
    
    # Calculate Class B nominal based on target percentage with dynamic approach
    min_class_b_percent = max(0.1, target_class_b_percent - class_b_percent_deviation)
    max_class_b_percent = min(50, target_class_b_percent + class_b_percent_deviation)
    
    # Ideal class B percentage (target)
    target_b_share = target_class_b_percent / 100
    
    # Calculate ideal class B nominal based on target percentage
    # Formula: class_b_nominal = total_a_nominal * target_b_share / (1 - target_b_share)
    class_b_nominal = (total_a_nominal * target_b_share) / (1 - target_b_share)
    
    # Round to nearest 1000
    class_b_nominal = round(class_b_nominal / 1000) * 1000
    
    # Calculate actual Class B percentage
    total_nominal = total_a_nominal + class_b_nominal
    actual_class_b_percent = (class_b_nominal / total_nominal) * 100
    
    # If the actual percentage is outside allowed range, adjust the nominal value
    if actual_class_b_percent < min_class_b_percent or actual_class_b_percent > max_class_b_percent:
        logger.debug(f"Adjusting Class B nominal to meet target percent. Current: {actual_class_b_percent:.2f}%, Target: {target_class_b_percent:.2f}%±{class_b_percent_deviation:.2f}%")
        
        # Calculate corrected B share
        if actual_class_b_percent < min_class_b_percent:
            corrected_b_share = min_class_b_percent / 100
        else:
            corrected_b_share = max_class_b_percent / 100
        
        # Recalculate B nominal
        class_b_nominal = (total_a_nominal * corrected_b_share) / (1 - corrected_b_share)
        class_b_nominal = round(class_b_nominal / 1000) * 1000
        
        # Recalculate actual percentage
        total_nominal = total_a_nominal + class_b_nominal
        actual_class_b_percent = (class_b_nominal / total_nominal) * 100
        
        logger.debug(f"Adjusted Class B percent to: {actual_class_b_percent:.2f}%")
    
    # Set up parameters for calculation
    a_maturity_days = maturities
    a_spreads = [0.0] * len(a_maturity_days)
    b_maturity_days = [int(class_b_maturity)]  # Ensure integer
    b_nominal = [class_b_nominal]
    b_spreads = [0.0]
    
    # Combine all parameters
    all_maturity_days = a_maturity_days + b_maturity_days
    all_base_rates = base_rates + [class_b_base_rate]
    all_spreads = a_spreads + b_spreads
    all_reinvest_rates = reinvest_rates + [class_b_reinvest_rate]
    all_nominal = nominals + b_nominal
    
    # Calculate maturity dates
    all_maturity_dates = [start_date + pd.Timedelta(days=days) for days in all_maturity_days]
    
    try:
        # Distribute cash flows to tranches
        tranch_cash_flows = assign_cash_flows_to_tranches(
            df_temp, start_date, all_maturity_dates, all_reinvest_rates
        )
        
        # Calculate results for each tranche
        results = []
        buffer = 0.0
        
        for i in range(len(all_maturity_days)):
            is_class_a = (i < len(a_maturity_days))
            
            # Calculate cash flow totals
            c_flow, r_return, total_principal, total_interest = calculate_totals(
                tranch_cash_flows[i], all_maturity_dates[i], all_reinvest_rates[i]
            )
            
            # Buffer reinvestment calculation
            if i > 0 and buffer > 0:
                dd = all_maturity_days[i] - all_maturity_days[i-1]
                if dd > 0:
                    factor = (1 + simple_to_compound_annual(all_reinvest_rates[i])/100)**(dd/365) - 1
                    buffer_reinv = buffer * factor
                else:
                    buffer_reinv = 0
            else:
                buffer_reinv = 0
            
            # Total available funds
            total_available = c_flow + r_return + buffer + buffer_reinv
            
            # Interest rate calculations
            base_rate_val = all_base_rates[i]
            spread_bps = all_spreads[i]
            total_rate = base_rate_val + (spread_bps/100.0)
            
            if is_class_a:
                # Class A payment logic
                nominal_pmt = all_nominal[i]
                discount_factor = 1 / (1 + (total_rate/100 * all_maturity_days[i]/365)) if all_maturity_days[i] > 0 else 1
                principal = nominal_pmt * discount_factor
                interest = nominal_pmt - principal
                coupon_payment = 0
                total_payment = nominal_pmt
            else:
                # Class B payment logic with safeguards
                nominal_pmt = all_nominal[i]
                # Ensure principal is never too close to zero
                principal = max(0.001, nominal_pmt)
                coupon_payment = max(0, total_available - principal)
                interest = 0
                total_payment = principal + coupon_payment
            
            # Calculate buffer - avoid division by zero
            new_buffer = max(0, total_available - total_payment)
            buffer_cf_ratio = (new_buffer / nominal_pmt * 100) if nominal_pmt > 0 else 0
            
            # Add to results
            results.append({
                "is_class_a": is_class_a,
                "principal": principal,
                "interest": interest,
                "coupon_payment": coupon_payment,
                "total_payment": total_payment,
                "buffer_cf_ratio": buffer_cf_ratio,
                "maturity_days": all_maturity_days[i],
                "base_rate": base_rate_val,
                "nominal": all_nominal[i]
            })
            
            # Update buffer for next tranche
            buffer = new_buffer
        
        # Split results by class
        class_a_results = [r for r in results if r['is_class_a']]
        class_b_results = [r for r in results if not r['is_class_a']]
        
        # Calculate key metrics
        class_a_principal = sum(r['principal'] for r in class_a_results)
        class_b_principal = sum(r['principal'] for r in class_b_results)
        class_a_interest = sum(r['interest'] for r in class_a_results)
        class_b_coupon = sum(r['coupon_payment'] for r in class_b_results)
        class_a_total = sum(r['total_payment'] for r in class_a_results)
        class_b_total = sum(r['total_payment'] for r in class_b_results)
        
        # Calculate direct coupon rate with safeguard
        direct_coupon_rate = 0.0
        if class_b_principal > 0.001:  # Ensure principal is sufficiently above zero
            direct_coupon_rate = (class_b_coupon / class_b_principal) * 100
        
        # Calculate Class B effective coupon rate with safeguard
        class_b_coupon_rate = 0.0
        if class_b_results and class_b_principal > 0.001 and class_b_maturity > 0:
            class_b_maturity_days = class_b_results[0]['maturity_days']
            class_b_coupon_rate = (class_b_coupon / class_b_principal) * (365 / class_b_maturity_days) * 100
        
        min_buffer_actual = min(r['buffer_cf_ratio'] for r in class_a_results) if class_a_results else 0.0
        
        # Check if valid (meets minimum buffer requirement)
        is_valid = min_buffer_actual >= min_buffer
        
        # Calculate Class B percentage deviation from target
        class_b_percent_diff = abs(actual_class_b_percent - target_class_b_percent)
        
        # Check if Class B percentage is within acceptable range
        is_class_b_percent_valid = min_class_b_percent <= actual_class_b_percent <= max_class_b_percent
        
        # A solution is valid only if it meets both buffer and Class B percentage requirements
        is_valid = is_valid and is_class_b_percent_valid
        
        # Collect results
        result_dict = {
            'class_a_principal': class_a_principal,
            'class_b_principal': class_b_principal,
            'class_a_interest': class_a_interest, 
            'class_b_coupon': class_b_coupon,
            'class_a_total': class_a_total,
            'class_b_total': class_b_total,
            'min_buffer_actual': min_buffer_actual,
            'total_principal': class_a_principal + class_b_principal,
            'class_b_coupon_rate': class_b_coupon_rate,
            'direct_coupon_rate': direct_coupon_rate,
            'class_b_percent': actual_class_b_percent,
            'class_b_percent_diff': class_b_percent_diff,
            'num_a_tranches': len(a_maturity_days)
        }
        
        # Improved scoring with both coupon rate match and Class B percentage match
        coupon_rate_diff = abs(class_b_coupon_rate - target_class_b_coupon_rate)
        
        # Exponential penalty for coupon rate difference - sharper dropoff
        coupon_rate_weight = np.exp(-coupon_rate_diff / 3.0)
        
        # Exponential penalty for Class B percentage difference
        class_b_percent_weight = np.exp(-class_b_percent_diff / 2.0)
        
        # Combined weight with more emphasis on coupon rate (60% vs 40%)
        combined_weight = (coupon_rate_weight * 0.6) + (class_b_percent_weight * 0.4)
        
        # Weighted principal score
        weighted_principal = result_dict['total_principal'] * combined_weight
        
        return {
            'is_valid': is_valid,
            'score': weighted_principal if is_valid else 0,
            'results': result_dict if is_valid else None,
            'b_nominal': class_b_nominal,
            'class_b_percent': actual_class_b_percent
        }
    
    except Exception as e:
        # Return invalid result on any error
        logger.error(f"Error in evaluate_params: {str(e)}")
        logger.debug(traceback.format_exc())
        return {
            'is_valid': False,
            'score': 0,
            'results': None,
            'error': str(e),
            'b_nominal': class_b_nominal,
            'class_b_percent': actual_class_b_percent
        }

def perform_optimization(df: pd.DataFrame, general_settings: GeneralSettings, optimization_settings: OptimizationSettings) -> OptimizationResult:
    """Perform ABS structure optimization with improved coupon rate and Class B percentage targeting
    
    Args:
        df: DataFrame containing cash flow data
        general_settings: General settings for the optimization
        optimization_settings: Optimization-specific settings
        
    Returns:
        OptimizationResult object with the optimized structure
    """
    
    # Initialize progress tracking
    optimization_progress.update(step=0, total=100, 
                                phase="Standard Optimization", 
                                message="Starting standard optimization...")
    
    # Extract settings
    min_a_tranches, max_a_tranches = optimization_settings.a_tranches_range
    maturity_range = optimization_settings.maturity_range
    maturity_step = optimization_settings.maturity_step
    
    # Use the new Class B percentage targeting parameters 
    target_class_b_percent = getattr(optimization_settings, "min_class_b_percent", 15.0)
    
    # Use the tighter class_b_percent_deviation value (default 1.0)
    class_b_percent_deviation = getattr(optimization_settings, "class_b_percent_deviation", 1.0)
    
    target_class_b_coupon_rate = optimization_settings.target_class_b_coupon_rate
    additional_days = optimization_settings.additional_days_for_class_b
    
    # Log the actual values used for debugging
    logger.info(f"Target Class B percent: {target_class_b_percent}, deviation: {class_b_percent_deviation}")
    
    # Get selected strategies - use all if not specified
    selected_strategies = getattr(optimization_settings, "selected_strategies", 
                                ["equal", "increasing", "decreasing", "middle_weighted"])
    
    optimization_progress.update(step=5, 
                               message=f"Selected strategies: {', '.join(selected_strategies)}")
    
    # Set maximum allowed difference for coupon rate - tightened for better matching
    max_allowed_diff = 0.5  # Maximum 0.5% difference (reduced from 1.0%)
    
    optimization_progress.update(step=5, 
                               message=f"Target coupon rate: {target_class_b_coupon_rate}%, Target Class B: {target_class_b_percent}±{class_b_percent_deviation}%")
    
    start_date = pd.Timestamp(general_settings.start_date)
    ops_expenses = general_settings.operational_expenses
    min_buffer = general_settings.min_buffer
    
    # Get original parameters for Class A from the example data
    original_maturities_A = [61, 120, 182, 274]
    original_base_rates_A = [45.6, 44.5, 43.3, 42.5]
    original_reinvest_rates_A = [40.0, 37.25, 32.5, 30.0]
    
    # Class B values (fallback values)
    class_b_maturity_orig = 300
    class_b_base_rate_orig = 0.0
    class_b_reinvest_rate_orig = 25.5
    
    optimization_progress.update(step=10, 
                               message="Creating rate lookup tables and preparing data...")
    
    # Create rate lookup tables for Class A
    maturity_to_base_rate_A = dict(zip(original_maturities_A, original_base_rates_A))
    maturity_to_reinvest_rate_A = dict(zip(original_maturities_A, original_reinvest_rates_A))
    
    # Calculate total nominal amount (from example)
    total_a_nominal = 1765000000  # Example from original code
    
    # Define search space
    num_a_tranches_options = range(min_a_tranches, max_a_tranches + 1)
    possible_maturities = list(range(maturity_range[0], maturity_range[1] + 1, maturity_step))
    
    optimization_progress.update(step=15, 
                               message=f"Using tranches from {min_a_tranches} to {max_a_tranches}")
    
    # Dictionaries to track best results for each strategy
    strategy_names = ["equal", "increasing", "decreasing", "middle_weighted"]
    
    best_params_by_strategy = {strategy: None for strategy in strategy_names}
    best_results_by_strategy = {strategy: None for strategy in strategy_names}
    best_weighted_principal_by_strategy = {strategy: 0 for strategy in strategy_names}
    best_coupon_rate_diff_by_strategy = {strategy: float('inf') for strategy in strategy_names}
    best_class_b_percent_diff_by_strategy = {strategy: float('inf') for strategy in strategy_names}
    
    # Find last cash flow day
    last_cash_flow_day = get_last_cash_flow_day(df, start_date)
    
    optimization_progress.update(step=20, 
                               message=f"Last cash flow day: {last_cash_flow_day}")
    
    # Create a temporary copy of dataframe for calculations
    df_temp = df.copy()
    df_temp['cash_flow'] = df_temp['original_cash_flow'].copy()
    target_date = pd.Timestamp('2025-02-16')
    target_rows = df_temp[df_temp['installment_date'].dt.date == target_date.date()]
    
    if not target_rows.empty:
        t_idx = target_rows.index[0]
        orig_cf = df_temp.at[t_idx, 'cash_flow']
        new_cf = max(0, orig_cf - ops_expenses)
        df_temp.at[t_idx, 'cash_flow'] = new_cf
    
    # Initialize progress counter
    current_iteration = 0
    
    # Calculate total iterations (approximate)
    total_maturity_combinations = 0
    for num_a_tranches in num_a_tranches_options:
        # Rough estimate of combinations, will be reduced later
        total_maturity_combinations += min(1000, len(list(itertools.combinations(possible_maturities, num_a_tranches))))
    
    # 4 strategies per maturity combo
    total_iterations = total_maturity_combinations * len(selected_strategies)
    optimization_progress.update(message=f"Estimated iterations: {total_iterations}")
    
    # Progress tracking variables
    current_phase = "Testing Configurations"
    optimization_progress.update(phase=current_phase)
    
    # Fix 1: Ensure class_b_maturity is at least 1
    # Calculate Class B maturity as Last Cash Flow Day + Additional Days
    class_b_maturity = max(1, min(365, last_cash_flow_day + additional_days))
    
    # Loop through Class A tranche counts
    for num_a_tranches_idx, num_a_tranches in enumerate(num_a_tranches_options):
        tranche_progress_base = 20 + (num_a_tranches_idx * 15)  # 15% progress per tranche count
        
        optimization_progress.update(
            step=tranche_progress_base,
            message=f"Testing with {num_a_tranches} Class A tranches"
        )
        
        # Minimum gap between consecutive maturities
        min_gap = 15  # In days
        
        # Create sequential maturity combinations
        maturity_combinations = []
        for maturities in itertools.combinations(possible_maturities, num_a_tranches):
            # Check if sorted and with minimum gap
            sorted_maturities = sorted(maturities)
            if all(sorted_maturities[i+1] - sorted_maturities[i] >= min_gap for i in range(len(sorted_maturities)-1)):
                maturity_combinations.append(sorted_maturities)
        
        # More intelligent sampling of maturity combinations
        # If too many combinations, use stratified sampling
        max_samples = 20  # Reduced from 30 to 20 for faster processing
        if len(maturity_combinations) > max_samples:
            # Sort by average maturity and select samples from different parts of the distribution
            sorted_combinations = sorted(maturity_combinations, 
                                        key=lambda x: sum(x)/len(x))
            step = len(sorted_combinations) // max_samples
            sampled_indices = [i * step for i in range(max_samples)]
            maturity_combinations = [sorted_combinations[i] for i in sampled_indices]
        
        # Calculate progress step for this set of combinations
        combo_count = len(maturity_combinations)
        combo_progress_step = 10 / max(1, combo_count)
        
        # Track consecutive failures to optimize performance
        consecutive_failures = 0
        max_consecutive_failures = 5  # Fast-fail threshold
        
        # Process maturity combinations
        for combo_idx, maturities in enumerate(maturity_combinations):
            combo_progress = tranche_progress_base + (combo_idx * combo_progress_step)
            
            # Skip updates for most combinations to reduce overhead
            if combo_idx % 5 == 0:  # Update every 5 combinations
                optimization_progress.update(
                    step=int(combo_progress),
                    message=f"Testing maturity combination {combo_idx+1}/{combo_count}: {maturities}"
                )
            
            # Assign rates based on nearest original Class A maturity
            a_base_rates = []
            a_reinvest_rates = []
            for m in maturities:
                nearest = get_nearest_maturity(m, original_maturities_A)
                a_base_rates.append(maturity_to_base_rate_A[nearest])
                a_reinvest_rates.append(maturity_to_reinvest_rate_A[nearest])
            
            # Use the base rate of the longest Class A tranche for Class B
            # but always use the original reinvest rate from UI
            if len(a_base_rates) > 0:
                b_base_rate = a_base_rates[-1]  # Use the base rate of the longest-maturity Class A tranche
                b_reinvest_rate = class_b_reinvest_rate_orig  # Always use original reinvest rate
            else:
                b_base_rate = class_b_base_rate_orig
                b_reinvest_rate = class_b_reinvest_rate_orig
            
            # Different nominal distribution strategies
            distribution_strategies = [
                strategy for strategy in selected_strategies 
                if strategy in ["equal", "increasing", "decreasing", "middle_weighted"]
            ]
            
            # If no valid strategies, use all
            if not distribution_strategies:
                distribution_strategies = ["equal", "increasing", "decreasing", "middle_weighted"]
                logger.warning(f"No valid strategies selected, using all: {distribution_strategies}")
            
            # Reset consecutive failures counter for each new maturity combination
            consecutive_failures = 0
            
            # Process each strategy
            for strategy in distribution_strategies:
                # Try multiple class B percentages within the allowed deviation range
                # This is a key enhancement over the original algorithm
                
                # Calculate required Class B nominal to achieve target percentage
                # Formula: class_b_nominal = total_a_nominal * (target_percent / (100 - target_percent))
                target_b_share = target_class_b_percent / 100
                class_b_nominal = (total_a_nominal * target_b_share) / (1 - target_b_share)
                
                # Round to nearest 1000
                class_b_nominal = round(class_b_nominal / 1000) * 1000
                
                # Calculate total nominal amount based on Class A and B
                remaining_nominal = total_a_nominal
                
                # Distribute nominal amounts based on strategy
                if strategy == "equal":
                    a_nominals = [remaining_nominal / num_a_tranches] * num_a_tranches
                    
                elif strategy == "increasing":
                    # Weight by maturity days
                    weights = np.array(maturities)
                    a_nominals = (weights / weights.sum()) * remaining_nominal
                    
                elif strategy == "decreasing":
                    # Inverse weight by maturity days
                    weights = 1 / np.array(maturities)
                    a_nominals = (weights / weights.sum()) * remaining_nominal
                    
                elif strategy == "middle_weighted":
                    # Give more weight to middle tranches
                    if num_a_tranches >= 3:
                        weights = np.ones(num_a_tranches)
                        mid_idx = num_a_tranches // 2
                        weights[mid_idx] = 1.5
                        if num_a_tranches > 3:
                            weights[mid_idx-1] = 1.3
                            weights[mid_idx+1] = 1.3
                        a_nominals = (weights / weights.sum()) * remaining_nominal
                    else:
                        a_nominals = [remaining_nominal / num_a_tranches] * num_a_tranches
                else:
                    # Invalid strategy, use equal distribution as fallback
                    logger.warning(f"Unknown strategy: {strategy}, using equal distribution")
                    a_nominals = [remaining_nominal / num_a_tranches] * num_a_tranches
                
                # Round to nearest 1000
                a_nominals = [round(n / 1000) * 1000 for n in a_nominals]
                
                # Ensure sum equals the remaining nominal
                adjustment = (remaining_nominal - sum(a_nominals)) / num_a_tranches
                a_nominals = [n + adjustment for n in a_nominals]
                a_nominals = [round(n / 1000) * 1000 for n in a_nominals]
                
                # Make final adjustment to last tranche to ensure exact total
                a_nominals[-1] += remaining_nominal - sum(a_nominals)
                
                # Now adjust the nominals to achieve target coupon rate
                adjusted_a_nominals, success, actual_class_b_percent = adjust_class_a_nominals_for_target_coupon(
                    a_nominals, 
                    class_b_nominal, 
                    target_class_b_coupon_rate,
                    class_b_maturity,
                    maturities, 
                    a_base_rates, 
                    a_reinvest_rates, 
                    b_base_rate, 
                    b_reinvest_rate,
                    start_date, 
                    df_temp, 
                    min_buffer,
                    target_class_b_percent,
                    max_allowed_diff,
                    class_b_percent_deviation  # Pass the tighter deviation value
                )
                
                if success:
                    a_nominals = adjusted_a_nominals
                    # Reset consecutive failures counter on success
                    consecutive_failures = 0
                else:
                    # Increment consecutive failures counter
                    consecutive_failures += 1
                
                # Evaluate the result with the new Class B percentage parameters
                eval_result = evaluate_params(
                    maturities, a_nominals, 
                    class_b_maturity, start_date, df_temp,
                    maturity_to_base_rate_A, maturity_to_reinvest_rate_A,
                    b_base_rate, b_reinvest_rate,
                    target_class_b_percent, class_b_percent_deviation,
                    target_class_b_coupon_rate, min_buffer
                )
                
                # Check if valid and meets buffer requirement
                if eval_result['is_valid'] and eval_result['results']:
                    result_dict = eval_result['results']
                    total_principal = result_dict['total_principal']
                    class_b_coupon_rate = result_dict['class_b_coupon_rate']
                    min_buffer_actual = result_dict['min_buffer_actual']
                    class_b_percent = result_dict['class_b_percent']
                    class_b_percent_diff = result_dict['class_b_percent_diff']
                    
                    # Calculate difference from target coupon rate
                    coupon_rate_diff = abs(class_b_coupon_rate - target_class_b_coupon_rate)
                    
                    # Improved scoring function combining both objectives
                    # Exponential penalty for rate difference
                    coupon_rate_weight = np.exp(-coupon_rate_diff / 2.0)
                    # Exponential penalty for Class B percentage difference
                    class_b_percent_weight = np.exp(-class_b_percent_diff / 2.0)
                    # Combined weight with 60% emphasis on coupon rate, 40% on Class B percentage
                    combined_weight = (coupon_rate_weight * 0.6) + (class_b_percent_weight * 0.4)
                    
                    weighted_principal = total_principal * combined_weight
                    
                    # Check if this is the best solution for this strategy
                    # Use a balanced approach between coupon rate and Class B percentage matching
                    # with a slight preference for coupon rate matching
                    is_better = False
                    
                    # Determine if this solution is better based on combined criteria
                    if coupon_rate_diff <= best_coupon_rate_diff_by_strategy[strategy] * 1.1 and \
                       class_b_percent_diff <= best_class_b_percent_diff_by_strategy[strategy] * 1.1:
                        # If both metrics are comparable or better, use weighted principal as tiebreaker
                        if weighted_principal > best_weighted_principal_by_strategy[strategy]:
                            is_better = True
                    elif coupon_rate_diff <= max_allowed_diff and \
                         class_b_percent_diff <= class_b_percent_deviation and \
                         weighted_principal > best_weighted_principal_by_strategy[strategy] * 1.15:
                        # If within allowed differences and significantly better weighted principal
                        is_better = True
                    elif (coupon_rate_diff < best_coupon_rate_diff_by_strategy[strategy] * 0.7 or \
                          class_b_percent_diff < best_class_b_percent_diff_by_strategy[strategy] * 0.7) and \
                         weighted_principal > best_weighted_principal_by_strategy[strategy] * 0.9:
                        # If one metric is much better without sacrificing too much weighted principal
                        is_better = True
                    
                    if is_better:
                        best_coupon_rate_diff_by_strategy[strategy] = coupon_rate_diff
                        best_class_b_percent_diff_by_strategy[strategy] = class_b_percent_diff
                        best_weighted_principal_by_strategy[strategy] = weighted_principal
                        
                        # Reset consecutive failures on finding a good solution
                        consecutive_failures = 0
                        
                        best_params_by_strategy[strategy] = {
                            'num_a_tranches': num_a_tranches,
                            'a_maturity_days': list(maturities),
                            'a_base_rates': a_base_rates,
                            'a_reinvest_rates': a_reinvest_rates,
                            'a_nominal_amounts': a_nominals,
                            'b_maturity_days': [class_b_maturity],
                            'b_base_rates': [b_base_rate],
                            'b_reinvest_rates': [b_reinvest_rate],
                            'b_nominal': [class_b_nominal],
                            'strategy': strategy,
                            'last_cash_flow_day': last_cash_flow_day,
                            'added_days': additional_days,
                            'class_b_percent': class_b_percent
                        }
                        
                        best_results_by_strategy[strategy] = {
                            'class_a_principal': result_dict['class_a_principal'],
                            'class_b_principal': result_dict['class_b_principal'],
                            'class_a_interest': result_dict['class_a_interest'],
                            'class_b_coupon': result_dict['class_b_coupon'],
                            'class_a_total': result_dict['class_a_total'],
                            'class_b_total': result_dict['class_b_total'],
                            'min_buffer_actual': min_buffer_actual,
                            'total_principal': total_principal,
                            'class_b_coupon_rate': class_b_coupon_rate,
                            'direct_coupon_rate': result_dict.get('direct_coupon_rate', class_b_coupon_rate),  # Add this
                            'target_class_b_coupon_rate': target_class_b_coupon_rate,
                            'coupon_rate_diff': coupon_rate_diff,
                            'class_b_percent': class_b_percent,
                            'target_class_b_percent': target_class_b_percent,
                            'class_b_percent_diff': class_b_percent_diff,
                            'class_b_base_rate': b_base_rate,
                            'num_a_tranches': num_a_tranches
                        }
                        
                        optimization_progress.update(
                            message=f"Found better solution for {strategy}: coupon_rate={class_b_coupon_rate:.2f}%, " +
                                   f"diff={coupon_rate_diff:.2f}%, Class B={class_b_percent:.2f}%, " +
                                   f"total_principal={total_principal:,.2f}"
                        )
                
                # Update iteration counter
                current_iteration += 1
                
                # Update progress periodically
                if current_iteration % 20 == 0:  # Reduced frequency of updates
                    progress_percent = min(80, 20 + int(current_iteration / total_iterations * 60))
                    optimization_progress.update(
                        step=progress_percent,
                        message=f"Completed {current_iteration} iterations out of approximately {total_iterations}"
                    )
                
                # Check if we should skip remaining strategies for this maturity combination
                if consecutive_failures >= max_consecutive_failures:
                    optimization_progress.update(
                        message=f"Skipping remaining strategies for this maturity combination due to {consecutive_failures} consecutive failures"
                    )
                    break
            
            # Early termination if we've found very good solutions across multiple strategies
            good_strategies_count = sum(1 for strat in strategy_names if 
                                      best_coupon_rate_diff_by_strategy[strat] <= 0.3 and
                                      best_class_b_percent_diff_by_strategy[strat] <= 0.5)
            if good_strategies_count >= 2 and combo_idx > combo_count // 4:
                optimization_progress.update(
                    message=f"Found {good_strategies_count} very good solutions, ending search early"
                )
                break
    
    # Update progress to preparing results phase
    optimization_progress.update(
        step=85,
        phase="Finalizing Results",
        message="Comparing strategies and preparing results..."
    )
    
    # Compare valid strategies
    valid_strategies = {k: v for k, v in best_results_by_strategy.items() if v is not None}
    
    if not valid_strategies:
        # No valid solution found
        optimization_progress.update(
            step=90,
            message="No valid configuration found. Try adjusting optimization parameters."
        )
        raise ValueError("No valid configuration found. Try adjusting optimization parameters.")
    
    # Improved strategy selection with balanced weighting between coupon rate and Class B percentage
    # Find best overall strategy prioritizing both objectives
    best_overall_strategy = min(
        valid_strategies.items(),
        key=lambda x: (
            # First sort by normalized combined objective 
            (x[1]['coupon_rate_diff'] / target_class_b_coupon_rate * 0.6) + 
            (x[1]['class_b_percent_diff'] / target_class_b_percent * 0.4),
            # Then by negative principal (higher principal is better)
            -x[1]['total_principal']
        )
    )[0]
    
    # Get best parameters and results
    best_strategy = best_overall_strategy
    best_params = best_params_by_strategy[best_strategy]
    best_results = best_results_by_strategy[best_strategy]
    
    optimization_progress.update(
        step=95,
        message=f"Selected best strategy: {best_strategy}, coupon_rate: {best_results['class_b_coupon_rate']:.2f}%, " +
               f"diff: {best_results['coupon_rate_diff']:.2f}%, Class B: {best_results['class_b_percent']:.2f}%, " +
               f"total_principal: {best_results['total_principal']:,.2f}"
    )
    
    # Extract values for the result
    class_a_maturities = best_params['a_maturity_days']
    class_a_nominals = best_params['a_nominal_amounts']
    class_a_rates = best_params['a_base_rates']
    class_a_reinvest = best_params['a_reinvest_rates']
    
    class_b_maturity = best_params['b_maturity_days'][0]
    class_b_rate = best_params['b_base_rates'][0]
    class_b_reinvest = best_params['b_reinvest_rates'][0]
    class_b_nominal = best_params['b_nominal'][0]
    class_b_percent = best_params['class_b_percent']
    
    # Fix 4: Add debug logging before returning results
    print(f"*** OPTIMIZATION RESULTS ***")
    print(f"Class B coupon rate (effective): {best_results['class_b_coupon_rate']}")
    print(f"Class B coupon rate (direct): {best_results.get('direct_coupon_rate', 0)}")
    print(f"Class B maturity: {class_b_maturity}")
    
    # Final progress update
    optimization_progress.update(
        step=100,
        phase="Complete",
        message="Optimization completed successfully."
    )
    
    # Return the optimization result with enhanced data
    return OptimizationResult(
        best_strategy=best_strategy,
        class_a_maturities=class_a_maturities,
        class_a_nominals=class_a_nominals,
        class_a_rates=class_a_rates,
        class_a_reinvest=class_a_reinvest,
        class_b_maturity=class_b_maturity,
        class_b_rate=class_b_rate,
        class_b_reinvest=class_b_reinvest,
        class_b_nominal=class_b_nominal,
        class_b_percent=class_b_percent,
        class_b_coupon_rate=best_results['class_b_coupon_rate'],
        direct_class_b_coupon_rate=best_results.get('direct_coupon_rate', best_results['class_b_coupon_rate']),  # Add this
        min_buffer_actual=best_results['min_buffer_actual'],
        last_cash_flow_day=last_cash_flow_day,
        additional_days=additional_days,
        results_by_strategy={k: v for k, v in best_results_by_strategy.items() if v is not None}
    )

def perform_genetic_optimization(df: pd.DataFrame, general_settings: GeneralSettings, optimization_settings: OptimizationSettings) -> OptimizationResult:
    """Genetic algorithm optimization with improved Class B percentage targeting
    
    Args:
        df: DataFrame containing cash flow data
        general_settings: General settings for the optimization
        optimization_settings: Optimization-specific settings
        
    Returns:
        OptimizationResult object with the optimized structure
    """
    try:
        # Initialize progress tracking
        optimization_progress.update(step=0, total=100, 
                                    phase="Genetic Optimization", 
                                    message="Starting genetic algorithm optimization...")
        
        logger.info("Starting genetic algorithm optimization...")
        
        # Basic parameters
        start_date = pd.Timestamp(general_settings.start_date)
        ops_expenses = general_settings.operational_expenses
        min_buffer = general_settings.min_buffer
        
        # Use the new Class B percentage targeting parameters
        target_class_b_percent = getattr(optimization_settings, "min_class_b_percent", 15.0)
        
        # Use the tighter class_b_percent_deviation value (default 1.0)
        class_b_percent_deviation = getattr(optimization_settings, "class_b_percent_deviation", 1.0)
        
        # Log the actual values used for debugging
        logger.info(f"Genetic: Target Class B percent: {target_class_b_percent}, deviation: {class_b_percent_deviation}")
        
        target_class_b_coupon_rate = optimization_settings.target_class_b_coupon_rate
        additional_days = optimization_settings.additional_days_for_class_b
        population_size = getattr(optimization_settings, "population_size", 50)
        num_generations = getattr(optimization_settings, "num_generations", 40)
        
        optimization_progress.update(step=5, 
                                    message=f"Population size: {population_size}, generations: {num_generations}, " +
                                           f"Target Class B: {target_class_b_percent}±{class_b_percent_deviation}%")
        
        logger.info(f"Parameters: population_size={population_size}, num_generations={num_generations}, " +
                   f"target_class_b_percent={target_class_b_percent}±{class_b_percent_deviation}%")
        
        # Get last cash flow day
        last_cash_flow_day = get_last_cash_flow_day(df, start_date)
        
        # Update progress to 10%
        optimization_progress.update(step=10, 
                                    message=f"Last cash flow day: {last_cash_flow_day}")
        
        # Fix 1: Ensure class_b_maturity is at least 1 to avoid division by zero
        # Class B maturity as Last Cash Flow Day + Additional Days, capped at 365
        class_b_maturity = max(1, min(365, last_cash_flow_day + additional_days))
        
        # Get original parameters for Class A 
        original_maturities_A = [61, 120, 182, 274]
        original_base_rates_A = [45.6, 44.5, 43.3, 42.5]
        original_reinvest_rates_A = [40.0, 37.25, 32.5, 30.0]
        
        # Class B values
        class_b_base_rate_orig = 0.0
        class_b_reinvest_rate_orig = 25.5
        
        # Create rate lookup tables for Class A
        maturity_to_base_rate_A = dict(zip(original_maturities_A, original_base_rates_A))
        maturity_to_reinvest_rate_A = dict(zip(original_maturities_A, original_reinvest_rates_A))
        
        # Update progress to 15%
        optimization_progress.update(step=15, 
                                    message="Preparing optimization data...")
        
        # Create temporary dataframe for calculation
        df_temp = df.copy()
        df_temp['cash_flow'] = df_temp['original_cash_flow'].copy()
        target_date = pd.Timestamp('2025-02-16')
        target_rows = df_temp[df_temp['installment_date'].dt.date == target_date.date()]
        
        if not target_rows.empty:
            t_idx = target_rows.index[0]
            orig_cf = df_temp.at[t_idx, 'cash_flow']
            new_cf = max(0, orig_cf - ops_expenses)
            df_temp.at[t_idx, 'cash_flow'] = new_cf
        
        # Total A nominal
        total_a_nominal = 1765000000
        
        # Fixed number of tranches
        num_a_tranches = 4
        
        # Parameter boundaries
        min_maturity = optimization_settings.maturity_range[0]
        max_maturity = optimization_settings.maturity_range[1]
        
        # Initialize population with valid individuals
        population = []
        min_gap = 15  # Minimum days between maturities
        
        optimization_progress.update(step=20, 
                                   phase="Initializing Population",
                                   message="Creating initial population...")
        
        logger.info("Initializing population...")
        
        # Function to create a valid individual with Class B percentage gene
        def create_valid_individual():
            # Generate valid maturities - ensure they are integers
            maturities = []
            maturities.append(random.randint(min_maturity, min_maturity + 60))
            
            for j in range(1, num_a_tranches):
                prev_maturity = maturities[j-1]
                min_new = prev_maturity + min_gap
                max_new = min(max_maturity, prev_maturity + 120)  # Cap max gap
                
                if min_new > max_new:
                    min_new = max_new
                
                maturities.append(random.randint(min_new, max_new))
            
            # Random weights
            weights = [random.random() for _ in range(num_a_tranches)]
            total_weight = sum(weights)
            weights = [w / total_weight for w in weights]
            
            # Convert to nominals
            nominals = [w * total_a_nominal for w in weights]
            
            # Random Class B percentage within allowed range
            # This is a key enhancement in the genetic algorithm
            min_percent = max(0.1, target_class_b_percent - class_b_percent_deviation)
            max_percent = min(50, target_class_b_percent + class_b_percent_deviation)
            random_b_percent = random.uniform(min_percent, max_percent)
            
            # Calculate Class B nominal based on random percentage
            # Formula: class_b_nominal = total_a_nominal * (b_percent / (100 - b_percent))
            b_share = random_b_percent / 100
            class_b_nominal = (total_a_nominal * b_share) / (1 - b_share)
            
            # Round to nearest 1000
            class_b_nominal = round(class_b_nominal / 1000) * 1000
            
            # Calculate actual Class B percentage
            total_nominal = total_a_nominal + class_b_nominal
            actual_b_percent = (class_b_nominal / total_nominal) * 100
            
            return {
                'maturities': maturities,
                'nominals': nominals,
                'class_b_nominal': class_b_nominal,
                'class_b_percent': actual_b_percent,
                'fitness': 0  # Will be evaluated
            }
        
        # Create initial population
        failure_count = 0
        for i in range(population_size):
            try:
                individual = create_valid_individual()
                population.append(individual)
                
                # Update progress periodically
                if i % 10 == 0:
                    optimization_progress.update(
                        step=20 + int((i / population_size) * 5),
                        message=f"Initializing population: {i+1}/{population_size}"
                    )
            except Exception as e:
                logger.error(f"Error creating individual {i}: {str(e)}")
                failure_count += 1
                # Try again
                if failure_count < 50:  # Limit retries
                    i -= 1  # Retry this index
                else:
                    logger.error("Too many failures creating population, proceeding with limited population")
                    break
        
        # Ensure we have at least some individuals
        if len(population) < 5:
            optimization_progress.update(
                phase="Error",
                message="Failed to create sufficient initial population"
            )
            raise ValueError("Failed to create sufficient initial population")
        
        # Update progress to 25%
        optimization_progress.update(step=25, 
                                   phase="Evolution",
                                   message="Starting genetic algorithm evolution...")
        
        # Evolution loop
        best_individual = None
        best_fitness = -float('inf')
        
        logger.info("Starting genetic algorithm evolution...")
        
        generation_progress_step = 50 / num_generations  # 50% of progress for generations
        
        # Tournament selection function
        def tournament_select(pop, tournament_size=3):
            if not pop:
                raise ValueError("Empty population for tournament selection")
                
            contestants = random.sample(pop, min(tournament_size, len(pop)))
            return max(contestants, key=lambda x: x.get('fitness', -float('inf')))
        
        for generation in range(num_generations):
            # Update progress for each generation
            generation_progress = 25 + int(generation * generation_progress_step)
            optimization_progress.update(
                step=generation_progress,
                message=f"Generation {generation+1} of {num_generations}"
            )
            
            logger.info(f"Generation {generation+1} of {num_generations}")
            
            # Evaluate fitness
            fitness_sum = 0
            valid_count = 0
            
            for idx, individual in enumerate(population):
                try:
                    maturities = individual['maturities']
                    nominals = individual['nominals']
                    class_b_nominal = individual['class_b_nominal']
                    
                    # Ensure maturities are integers for evaluation
                    maturities_int = [int(m) for m in maturities]
                    
                    # Get rates based on nearest maturity
                    a_base_rates = [maturity_to_base_rate_A.get(
                        get_nearest_maturity(m, list(maturity_to_base_rate_A.keys())), 42.0) for m in maturities_int]
                    
                    a_reinvest_rates = [maturity_to_reinvest_rate_A.get(
                        get_nearest_maturity(m, list(maturity_to_reinvest_rate_A.keys())), 30.0) for m in maturities_int]
                    
                    # Calculate actual Class B percentage
                    total_a_nominal = sum(nominals)
                    total_nominal = total_a_nominal + class_b_nominal
                    actual_b_percent = (class_b_nominal / total_nominal) * 100
                    
                    individual['class_b_percent'] = actual_b_percent
                    
                    # Try to adjust nominals for target coupon rate
                    try:
                        adjusted_nominals, adjustment_success, adjusted_b_percent = adjust_class_a_nominals_for_target_coupon(
                            nominals, 
                            class_b_nominal, 
                            target_class_b_coupon_rate,
                            class_b_maturity,
                            maturities_int, 
                            a_base_rates, 
                            a_reinvest_rates, 
                            class_b_base_rate_orig, 
                            class_b_reinvest_rate_orig,
                            start_date, 
                            df_temp, 
                            min_buffer,
                            target_class_b_percent,
                            0.5,  # max_allowed_diff
                            class_b_percent_deviation  # Pass the tighter deviation value
                        )
                        if adjustment_success:
                            nominals = adjusted_nominals
                            individual['nominals'] = nominals
                            individual['class_b_percent'] = adjusted_b_percent
                    except Exception as e:
                        logger.error(f"Error adjusting nominals: {str(e)}")
                        # Continue with original nominals
                        pass
                    
                    # Evaluate the adjusted parameters
                    result = evaluate_params(
                        maturities_int, nominals, 
                        class_b_maturity, start_date, df_temp,
                        maturity_to_base_rate_A, maturity_to_reinvest_rate_A,
                        class_b_base_rate_orig, class_b_reinvest_rate_orig,
                        target_class_b_percent, class_b_percent_deviation,
                        target_class_b_coupon_rate, min_buffer
                    )
                    
                    # Set fitness - ensure it's a number
                    if result['is_valid']:
                        individual['fitness'] = float(result['score'])
                        individual['result'] = result
                        fitness_sum += individual['fitness']
                        valid_count += 1
                    else:
                        individual['fitness'] = -1.0 # Invalid but better than -inf for selection
                        individual['result'] = None
                    
                    # Track the best
                    if individual['fitness'] > best_fitness:
                        best_fitness = individual['fitness']
                        best_individual = individual.copy()
                        logger.info(f"Found better solution: score={best_fitness}")
                        
                        # Update progress message when finding better solution
                        if 'result' in individual and individual['result'] and 'results' in individual['result']:
                            results = individual['result']['results']
                            if results and 'class_b_coupon_rate' in results and 'class_b_percent' in results:
                                coupon_rate = results['class_b_coupon_rate']
                                coupon_diff = abs(coupon_rate - target_class_b_coupon_rate)
                                class_b_percent = results['class_b_percent']
                                percent_diff = abs(class_b_percent - target_class_b_percent)
                                
                                optimization_progress.update(
                                    message=f"Generation {generation+1}: Found better solution with score {best_fitness:.2f}, " +
                                           f"coupon rate: {coupon_rate:.2f}% (diff: {coupon_diff:.2f}%), " +
                                           f"Class B: {class_b_percent:.2f}% (diff: {percent_diff:.2f}%)"
                                )
                        else:
                            optimization_progress.update(
                                message=f"Generation {generation+1}: Found better solution with score {best_fitness:.2f}"
                            )
                except Exception as e:
                    logger.error(f"Error evaluating individual {idx} in generation {generation}: {str(e)}")
                    # Set very low fitness to avoid selection
                    individual['fitness'] = -float('inf')
                    individual['result'] = None
            
            # Log average fitness for valid individuals
            if valid_count > 0:
                avg_fitness = fitness_sum / valid_count
                logger.info(f"Generation {generation+1} average fitness: {avg_fitness:.2f} ({valid_count} valid individuals)")
            
            # Create next generation
            new_population = []
            
            # Elitism - keep best individuals
            sorted_pop = sorted(population, key=lambda x: x.get('fitness', -float('inf')), reverse=True)
            elite_count = max(2, population_size // 10)
            new_population.extend(sorted_pop[:elite_count])
            
            # Fill rest with crossover and mutation
            crossover_attempts = 0
            while len(new_population) < population_size and crossover_attempts < population_size * 2:
                crossover_attempts += 1
                try:
                    # Tournament selection
                    parent1 = tournament_select(population)
                    parent2 = tournament_select(population)
                    
                    # Crossover - mix maturities
                    child_maturities = []
                    for i in range(num_a_tranches):
                        # 50% chance from each parent
                        if random.random() < 0.5:
                            child_maturities.append(parent1['maturities'][i])
                        else:
                            child_maturities.append(parent2['maturities'][i])
                    
                    # Ensure maturities are valid integers
                    child_maturities = sorted([int(m) for m in child_maturities])
                    
                    # Fix any invalid gaps
                    for i in range(1, num_a_tranches):
                        if child_maturities[i] - child_maturities[i-1] < min_gap:
                            child_maturities[i] = child_maturities[i-1] + min_gap
                    
                    # Weight crossover with averaging
                    child_weights = []
                    for i in range(num_a_tranches):
                        weight1 = parent1['nominals'][i] / total_a_nominal
                        weight2 = parent2['nominals'][i] / total_a_nominal
                        child_weights.append((weight1 + weight2) / 2)
                    
                    # Normalize weights
                    total_weight = sum(child_weights)
                    child_weights = [w / total_weight for w in child_weights]
                    child_nominals = [w * total_a_nominal for w in child_weights]
                    
                    # Class B percentage crossover
                    # Use weighted average of parent percentages
                    if random.random() < 0.5:
                        # Weighted average with random weight
                        weight = random.random()
                        child_b_percent = (parent1['class_b_percent'] * weight) + (parent2['class_b_percent'] * (1 - weight))
                    else:
                        # Pick one parent's value
                        child_b_percent = parent1['class_b_percent'] if random.random() < 0.5 else parent2['class_b_percent']
                    
                    # Calculate Class B nominal from percentage
                    b_share = child_b_percent / 100
                    child_b_nominal = (total_a_nominal * b_share) / (1 - b_share)
                    child_b_nominal = round(child_b_nominal / 1000) * 1000
                    
                    # Mutation - mutate maturities
                    if random.random() < 0.3:  # 30% mutation rate
                        mutation_idx = random.randint(0, num_a_tranches-1)
                        
                        # Different mutation for different positions
                        if mutation_idx == 0:
                            # First maturity
                            child_maturities[0] = random.randint(min_maturity, min(child_maturities[1] - min_gap, min_maturity + 60))
                        elif mutation_idx == num_a_tranches - 1:
                            # Last maturity
                            child_maturities[-1] = random.randint(child_maturities[-2] + min_gap, max_maturity)
                        else:
                            # Middle maturity
                            min_val = child_maturities[mutation_idx-1] + min_gap
                            max_val = child_maturities[mutation_idx+1] - min_gap
                            
                            if min_val < max_val:
                                child_maturities[mutation_idx] = random.randint(min_val, max_val)
                    
                    # Mutation - mutate weights
                    if random.random() < 0.3:
                        mutation_idx = random.randint(0, num_a_tranches-1)
                        mutation_amount = random.uniform(-0.1, 0.1)
                        child_weights[mutation_idx] = max(0.1, min(0.4, child_weights[mutation_idx] + mutation_amount))
                        
                        # Renormalize
                        total_weight = sum(child_weights)
                        child_weights = [w / total_weight for w in child_weights]
                        child_nominals = [w * total_a_nominal for w in child_weights]
                    
                    # Mutation - mutate Class B percentage
                    if random.random() < 0.3:
                        mutation_amount = random.uniform(-class_b_percent_deviation / 2, class_b_percent_deviation / 2)
                        child_b_percent = max(0.1, min(50, child_b_percent + mutation_amount))
                        
                        # Recalculate B nominal
                        b_share = child_b_percent / 100
                        child_b_nominal = (total_a_nominal * b_share) / (1 - b_share)
                        child_b_nominal = round(child_b_nominal / 1000) * 1000
                    
                    # Add child to new population
                    new_population.append({
                        'maturities': child_maturities,  # These are already integers
                        'nominals': child_nominals,
                        'class_b_nominal': child_b_nominal,
                        'class_b_percent': child_b_percent,
                        'fitness': 0  # Will be evaluated in next generation
                    })
                except Exception as e:
                    logger.error(f"Error in crossover/mutation: {str(e)}")
                    continue
            
            # If we couldn't create enough children, fill with new random individuals
            while len(new_population) < population_size:
                try:
                    new_population.append(create_valid_individual())
                except Exception as e:
                    logger.error(f"Error creating new individual to fill population: {str(e)}")
                    # If we failed a few times, just break and proceed with smaller population
                    if len(new_population) > population_size * 0.7:
                        break
            
            # Replace population
            population = new_population
            
            # Early termination if we have an excellent solution
            if best_individual and best_individual.get('result') and best_individual['result'].get('results'):
                best_results = best_individual['result']['results']
                if 'class_b_coupon_rate' in best_results and 'class_b_percent' in best_results:
                    coupon_diff = abs(best_results['class_b_coupon_rate'] - target_class_b_coupon_rate)
                    percent_diff = abs(best_results['class_b_percent'] - target_class_b_percent)
                    
                    # Only terminate early if both objectives are very good
                    if coupon_diff < 0.2 and percent_diff < 0.5:
                        optimization_progress.update(
                            message=f"Found excellent solution (coupon diff < 0.2%, Class B diff < 0.5%), ending evolution early"
                        )
                        break
        
        # Update to 75% progress
        optimization_progress.update(step=75, 
                                phase="Finalizing",
                                message="Evolution complete, preparing final results...")
        
        # If no valid solution found
        if best_individual is None or best_fitness <= 0:
            optimization_progress.update(
                step=80,
                phase="Error",
                message="Genetic optimization failed: No valid solution found"
            )
            logger.error("Genetic optimization failed: No valid solution found")
            # Fall back to classic optimization
            optimization_progress.update(
                message="Falling back to classic optimization method..."
            )
            return perform_optimization(df, general_settings, optimization_settings)
        
        # Get the best result
        best_maturities = best_individual['maturities']
        best_nominals = best_individual['nominals']
        best_class_b_nominal = best_individual['class_b_nominal']
        best_class_b_percent = best_individual['class_b_percent']
        best_result = best_individual['result']
        
        # Get rates based on original data
        best_base_rates = [maturity_to_base_rate_A.get(get_nearest_maturity(m, original_maturities_A), 42.0) for m in best_maturities]
        best_reinvest_rates = [maturity_to_reinvest_rate_A.get(get_nearest_maturity(m, original_maturities_A), 30.0) for m in best_maturities]
        
        optimization_progress.update(step=90, 
                                message="Creating optimization result...")
        
        logger.info("Genetic optimization completed successfully")
        
        # Fix 4: Add debug logging before returning results
        print(f"*** GENETIC OPTIMIZATION RESULTS ***")
        print(f"Class B coupon rate (effective): {best_result['results'].get('class_b_coupon_rate', 0)}")
        print(f"Class B coupon rate (direct): {best_result['results'].get('direct_coupon_rate', 0)}")
        print(f"Class B maturity: {class_b_maturity}")
        
        # Prepare the result - ensure all values are of correct types
        result = OptimizationResult(
            best_strategy="genetic",
            class_a_maturities=[int(m) for m in best_maturities],  # Ensure integers
            class_a_nominals=best_nominals,
            class_a_rates=best_base_rates,
            class_a_reinvest=best_reinvest_rates,
            class_b_maturity=int(class_b_maturity),
            class_b_rate=class_b_base_rate_orig,
            class_b_reinvest=class_b_reinvest_rate_orig,
            class_b_nominal=best_class_b_nominal,
            class_b_percent=best_class_b_percent,
            class_b_coupon_rate=best_result['results'].get('class_b_coupon_rate', 0),
            direct_class_b_coupon_rate=best_result['results'].get('direct_coupon_rate', best_result['results'].get('class_b_coupon_rate', 0)),  # Add this
            min_buffer_actual=best_result['results'].get('min_buffer_actual', 0),
            last_cash_flow_day=int(last_cash_flow_day),
            additional_days=int(additional_days),
            results_by_strategy={"genetic": best_result['results']}
        )
        
        # Final progress update to 100%
        optimization_progress.update(step=100, 
                                phase="Complete",
                                message="Genetic optimization completed successfully")
        
        return result
    except Exception as e:
        # Handle any exceptions
        logger.error(f"Error in genetic optimization: {str(e)}")
        logger.debug(traceback.format_exc())
        
        # Fall back to classic optimization
        optimization_progress.update(
            step=80,
            phase="Error Recovery",
            message=f"Error in genetic optimization: {str(e)}. Falling back to classic optimization method..."
        )
        return perform_optimization(df, general_settings, optimization_settings)