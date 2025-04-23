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
from app.utils.tranche_utils import (
    calculate_tranche_results,
    adjust_class_a_nominals_for_target_coupon
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

def evaluate_params(
    df: pd.DataFrame,
    start_date: pd.Timestamp,
    maturities: List[int], 
    nominals: List[float], 
    class_b_maturity: int, 
    maturity_to_base_rate_A: Dict[int, float], 
    maturity_to_reinvest_rate_A: Dict[int, float],
    class_b_base_rate: float, 
    class_b_reinvest_rate: float,
    target_class_b_percent: float, 
    class_b_percent_deviation: float,
    target_class_b_coupon_rate: float, 
    min_buffer: float,
    ops_expenses: float = 0.0
) -> Dict[str, Any]:
    """Helper function to evaluate a set of parameters using shared calculate_tranche_results logic"""
    # Verify input parameters
    if not maturities or not nominals or len(maturities) != len(nominals):
        return {
            'is_valid': False,
            'score': 0,
            'results': None,
            'error': "Invalid input dimensions",
            'b_nominal': 0,
            'class_b_percent': 0
        }
    
    # Ensure types are correct
    maturities = [int(m) for m in maturities]
    nominals = list(nominals)
    
    # Round nominals to nearest 1000 and ensure no zeros
    nominals = [max(1000, round(n / 1000) * 1000) for n in nominals]
    
    # Get rates from lookup tables with fallback values
    available_lookup_keys = list(maturity_to_base_rate_A.keys())
    base_rates = [maturity_to_base_rate_A.get(
        get_nearest_maturity(m, available_lookup_keys), 42.0) for m in maturities]
    
    reinvest_rates = [maturity_to_reinvest_rate_A.get(
        get_nearest_maturity(m, list(maturity_to_reinvest_rate_A.keys())), 30.0) for m in maturities]
    
    # Default all spreads to 0
    spreads = [0.0] * len(maturities)
    
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
    
    # Calculate Class B nominal based on target percentage
    target_b_share = target_class_b_percent / 100
    class_b_nominal = (total_a_nominal * target_b_share) / (1 - target_b_share)
    
    # Round to nearest 1000
    class_b_nominal = round(class_b_nominal / 1_000) * 1_000
    
    # Calculate actual Class B percentage
    total_nominal = total_a_nominal + class_b_nominal
    actual_class_b_percent = (class_b_nominal / total_nominal) * 100
    
    # If the actual percentage is outside allowed range, adjust the nominal value
    min_class_b_percent = max(0.1, target_class_b_percent - class_b_percent_deviation)
    max_class_b_percent = min(50, target_class_b_percent + class_b_percent_deviation)
    
    if actual_class_b_percent < min_class_b_percent or actual_class_b_percent > max_class_b_percent:
        logger.debug(f"Adjusting Class B nominal to meet target percent. Current: {actual_class_b_percent:.2f}%, Target: {target_class_b_percent:.2f}%±{class_b_percent_deviation:.2f}%")
        
        # Calculate corrected B share
        if actual_class_b_percent < min_class_b_percent:
            corrected_b_share = min_class_b_percent / 100
        else:
            corrected_b_share = max_class_b_percent / 100
        
        # Recalculate B nominal
        class_b_nominal = (total_a_nominal * corrected_b_share) / (1 - corrected_b_share)
        class_b_nominal = round(class_b_nominal / 1_000) * 1_000
        
        # Recalculate actual percentage
        total_nominal = total_a_nominal + class_b_nominal
        actual_class_b_percent = (class_b_nominal / total_nominal) * 100
        
        logger.debug(f"Adjusted Class B percent to: {actual_class_b_percent:.2f}%")
    
    try:
        # Use shared calculation logic
        result = calculate_tranche_results(
            df, start_date,
            maturities, base_rates, spreads, reinvest_rates, nominals,
            class_b_maturity, class_b_base_rate, 0.0, class_b_reinvest_rate, class_b_nominal,
            ops_expenses
        )
        
        # Extract relevant metrics
        class_a_principal = result['class_a_principal']
        class_b_principal = result['class_b_principal']
        class_a_interest = result['class_a_interest']
        class_b_coupon = result['class_b_coupon']
        class_a_total = result['class_a_total']
        class_b_total = result['class_b_total']
        min_buffer_actual = result['min_buffer_actual']
        effective_coupon_rate = result['effective_coupon_rate']
        direct_coupon_rate = result['direct_coupon_rate']
        
        # Check if valid (meets minimum buffer requirement)
        is_valid = min_buffer_actual >= min_buffer
        
        # Check if Class B percentage is within acceptable range
        class_b_percent_diff = abs(actual_class_b_percent - target_class_b_percent)
        is_class_b_percent_valid = min_class_b_percent <= actual_class_b_percent <= max_class_b_percent
        
        # A solution is valid only if it meets both buffer and Class B percentage requirements
        is_valid = is_valid and is_class_b_percent_valid
        
        # Calculate coupon rate difference from target
        coupon_rate_diff = abs(effective_coupon_rate - target_class_b_coupon_rate)
        
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
            'class_b_coupon_rate': effective_coupon_rate,
            'direct_coupon_rate': direct_coupon_rate,
            'class_b_percent': actual_class_b_percent,
            'class_b_percent_diff': class_b_percent_diff,
            'coupon_rate_diff': coupon_rate_diff,
            'num_a_tranches': len(maturities)
        }
        
        # Scoring with balanced weighting between coupon rate and Class B percentage
        coupon_rate_weight = np.exp(-coupon_rate_diff / 3.0)
        class_b_percent_weight = np.exp(-class_b_percent_diff / 2.0)
        combined_weight = (coupon_rate_weight * 0.6) + (class_b_percent_weight * 0.4)
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
    
    # Get selected default model
    selected_default_model = getattr(optimization_settings, "selected_default_model", "previous")
    
    # Use the new Class B percentage targeting parameters 
    target_class_b_percent = getattr(optimization_settings, "min_class_b_percent", 5.0)  # Default to 5% instead of 15%
    class_b_percent_deviation = getattr(optimization_settings, "class_b_percent_deviation", 1.0)
    target_class_b_coupon_rate = optimization_settings.target_class_b_coupon_rate
    additional_days = optimization_settings.additional_days_for_class_b
    
    # Log the actual values used for debugging
    logger.info(f"Target Class B percent: {target_class_b_percent}, deviation: {class_b_percent_deviation}")
    logger.info(f"Selected default model: {selected_default_model}")
    
    # Get selected strategies - use all if not specified
    selected_strategies = getattr(optimization_settings, "selected_strategies", 
                                ["equal", "increasing", "decreasing", "middle_weighted"])
    
    optimization_progress.update(step=5, 
                               message=f"Selected strategies: {', '.join(selected_strategies)}")
    
    # Set maximum allowed difference for coupon rate - tightened for better matching
    max_allowed_diff = 1.0  # Relaxed to 1.0% difference for better chances of finding solutions
    
    optimization_progress.update(step=5, 
                               message=f"Target coupon rate: {target_class_b_coupon_rate}%, Target Class B: {target_class_b_percent}±{class_b_percent_deviation}%")
    
    start_date = pd.Timestamp(general_settings.start_date)
    ops_expenses = general_settings.operational_expenses
    min_buffer = general_settings.min_buffer
    
    # Get original parameters for Class A based on selected default model
    if selected_default_model == "new":
        # Updated NEW model parameters (April 28, 2025)
        original_maturities_A = [155]
        original_base_rates_A = [50.75]
        original_reinvest_rates_A = [42.0]
        
        # Class B values for new model
        class_b_maturity_orig = 155
        class_b_base_rate_orig = 0.0
        class_b_reinvest_rate_orig = 42.0
        
        # Calculate total nominal amount for new model
        total_a_nominal = 250_200_000
    else:
        # Updated PREVIOUS model parameters (April 28, 2025)
        original_maturities_A = [88, 150]
        original_base_rates_A = [51.0, 50.5]
        original_reinvest_rates_A = [46.0, 42.0]
        
        # Class B values for previous model
        class_b_maturity_orig = 155
        class_b_base_rate_orig = 0.0
        class_b_reinvest_rate_orig = 42.0
        
        # Calculate total nominal amount for previous model
        total_a_nominal = 85_000_000 + 158_300_000  # Sum of the two tranches
    
    optimization_progress.update(step=10, 
                               message="Creating rate lookup tables and preparing data...")
    
    # Create rate lookup tables for Class A
    maturity_to_base_rate_A = dict(zip(original_maturities_A, original_base_rates_A))
    maturity_to_reinvest_rate_A = dict(zip(original_maturities_A, original_reinvest_rates_A))
    
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
    
    # Fix: Ensure target_date uses standard hyphen
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
    
    # Fix: Ensure class_b_maturity is at least 1
    # Calculate Class B maturity as Last Cash Flow Day + Additional Days
    class_b_maturity = max(1, min(365, last_cash_flow_day + additional_days))
    
    # Create fallback solution in case no valid solution is found
    # This matches the default settings provided
    if selected_default_model == "new":
        fallback_maturities = original_maturities_A
        fallback_rates = original_base_rates_A
        fallback_reinvest = original_reinvest_rates_A
        fallback_nominals = [total_a_nominal]  # Single tranche with full nominal
        fallback_b_maturity = class_b_maturity_orig
        fallback_b_rate = class_b_base_rate_orig
        fallback_b_reinvest = class_b_reinvest_rate_orig
        fallback_strategy = "equal"
        
        # Calculate B nominal for 5% of total
        fallback_a_total = sum(fallback_nominals)
        fallback_b_nominal = (fallback_a_total * 0.05) / 0.95  # 5% of total = 5.26% of A
        fallback_b_nominal = round(fallback_b_nominal / 1000) * 1000
    else:
        # Previous model
        fallback_maturities = original_maturities_A
        fallback_rates = original_base_rates_A
        fallback_reinvest = original_reinvest_rates_A
        fallback_nominals = [85_000_000, 158_300_000]  # The two tranches with their nominals
        fallback_b_maturity = class_b_maturity_orig
        fallback_b_rate = class_b_base_rate_orig
        fallback_b_reinvest = class_b_reinvest_rate_orig
        fallback_strategy = "equal"
        
        # Calculate B nominal for 5% of total
        fallback_a_total = sum(fallback_nominals)
        fallback_b_nominal = (fallback_a_total * 0.05) / 0.95  # 5% of total = 5.26% of A
        fallback_b_nominal = round(fallback_b_nominal / 1000) * 1000

    # Initialize fallback result calculation
    try:
        # Try to evaluate the fallback solution
        fallback_result = calculate_tranche_results(
            df_temp, start_date,
            fallback_maturities, fallback_rates, [0.0] * len(fallback_maturities), 
            fallback_reinvest, fallback_nominals,
            fallback_b_maturity, fallback_b_rate, 0.0, fallback_b_reinvest, fallback_b_nominal,
            ops_expenses
        )
        
        # Store the fallback parameters and results for later use if needed
        fallback_params = {
            'num_a_tranches': len(fallback_maturities),
            'a_maturity_days': fallback_maturities,
            'a_base_rates': fallback_rates,
            'a_reinvest_rates': fallback_reinvest,
            'a_nominal_amounts': fallback_nominals,
            'b_maturity_days': [fallback_b_maturity],
            'b_base_rates': [fallback_b_rate],
            'b_reinvest_rates': [fallback_b_reinvest],
            'b_nominal': [fallback_b_nominal],
            'strategy': fallback_strategy,
            'last_cash_flow_day': last_cash_flow_day,
            'added_days': additional_days,
            'class_b_percent': (fallback_b_nominal / (fallback_a_total + fallback_b_nominal)) * 100,
            'direct_coupon_rate': fallback_result['direct_coupon_rate'],
            'effective_coupon_rate': fallback_result['effective_coupon_rate']
        }
        
        fallback_results = {
            'class_a_principal': fallback_result['class_a_principal'],
            'class_b_principal': fallback_result['class_b_principal'],
            'class_a_interest': fallback_result['class_a_interest'],
            'class_b_coupon': fallback_result['class_b_coupon'],
            'class_a_total': fallback_result['class_a_total'],
            'class_b_total': fallback_result['class_b_total'],
            'min_buffer_actual': fallback_result['min_buffer_actual'],
            'total_principal': fallback_result['class_a_principal'] + fallback_result['class_b_principal'],
            'class_b_coupon_rate': fallback_result['effective_coupon_rate'],
            'direct_coupon_rate': fallback_result['direct_coupon_rate'],
            'target_class_b_coupon_rate': target_class_b_coupon_rate,
            'coupon_rate_diff': abs(fallback_result['effective_coupon_rate'] - target_class_b_coupon_rate),
            'class_b_percent': (fallback_b_nominal / (fallback_a_total + fallback_b_nominal)) * 100,
            'target_class_b_percent': target_class_b_percent,
            'class_b_percent_diff': abs((fallback_b_nominal / (fallback_a_total + fallback_b_nominal)) * 100 - target_class_b_percent),
            'class_b_base_rate': fallback_b_rate,
            'num_a_tranches': len(fallback_maturities)
        }
        
        # Store fallback as a valid solution for the strategy
        best_params_by_strategy[fallback_strategy] = fallback_params
        best_results_by_strategy[fallback_strategy] = fallback_results
        
        optimization_progress.update(
            message=f"Created fallback solution with {fallback_strategy} strategy: " +
                   f"coupon_rate={fallback_result['effective_coupon_rate']:.2f}%, " +
                   f"Class B={fallback_params['class_b_percent']:.2f}%"
        )
    except Exception as e:
        logger.error(f"Error creating fallback solution: {str(e)}")
        # Continue without a fallback solution
    
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
        max_consecutive_failures = 10  # Fast-fail threshold
        
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
                
                # Now adjust the nominals to achieve target coupon rate - use shared utility function
                try:
                    # Generate default spreads (all zeros)
                    a_spreads = [0.0] * len(a_nominals)
                    b_spread = 0.0
                    
                    adjusted_a_nominals, adjustment_success, adjusted_b_percent = adjust_class_a_nominals_for_target_coupon(
                        df_temp, start_date,
                        maturities, a_nominals, a_base_rates, a_spreads, a_reinvest_rates,
                        class_b_maturity, b_base_rate, b_spread, b_reinvest_rate, class_b_nominal,
                        target_class_b_coupon_rate, target_class_b_percent, min_buffer, ops_expenses,
                        max_allowed_diff, class_b_percent_deviation
                    )
                    
                    if adjustment_success:
                        a_nominals = adjusted_a_nominals
                        # Reset consecutive failures counter on success
                        consecutive_failures = 0
                    else:
                        # Increment consecutive failures counter
                        consecutive_failures += 1
                except Exception as e:
                    logger.error(f"Error adjusting nominals: {str(e)}")
                    consecutive_failures += 1
                    # Continue with original nominals
                
                # Evaluate the result with the shared evaluate_params function
                eval_result = evaluate_params(
                    df_temp, start_date,
                    maturities, a_nominals, class_b_maturity,
                    maturity_to_base_rate_A, maturity_to_reinvest_rate_A,
                    b_base_rate, b_reinvest_rate,
                    target_class_b_percent, class_b_percent_deviation,
                    target_class_b_coupon_rate, min_buffer,
                    ops_expenses
                )
                
                # Check if valid and meets buffer requirement
                if eval_result['is_valid'] and eval_result['results']:
                    result_dict = eval_result['results']
                    total_principal = result_dict['total_principal']
                    class_b_coupon_rate = result_dict['class_b_coupon_rate']
                    min_buffer_actual = result_dict['min_buffer_actual']
                    class_b_percent = result_dict['class_b_percent']
                    class_b_percent_diff = result_dict['class_b_percent_diff']
                    coupon_rate_diff = result_dict['coupon_rate_diff']
                    
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
                            'class_b_percent': class_b_percent,
                            'direct_coupon_rate': result_dict['direct_coupon_rate'],
                            'effective_coupon_rate': result_dict['class_b_coupon_rate']
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
                            'direct_coupon_rate': result_dict['direct_coupon_rate'],
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
        # No valid solution found - use the fallback solution if available
        if fallback_strategy in best_params_by_strategy and best_params_by_strategy[fallback_strategy] is not None:
            optimization_progress.update(
                step=90,
                message="No optimal configuration found. Using fallback default configuration."
            )
            
            best_strategy = fallback_strategy
            best_params = best_params_by_strategy[best_strategy]
            best_results = best_results_by_strategy[best_strategy]
        else:
            # If no fallback solution either, raise error
            optimization_progress.update(
                step=90,
                message="No valid configuration found. Try adjusting optimization parameters."
            )
            raise ValueError("No valid configuration found. Try adjusting optimization parameters.")
    else:
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
    
    # Debug logging
    print(f"*** OPTIMIZATION RESULTS ***")
    print(f"Class B coupon rate (effective): {best_results['class_b_coupon_rate']}")
    print(f"Class B coupon rate (direct): {best_params.get('direct_coupon_rate', best_results['direct_coupon_rate'])}")
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
        direct_class_b_coupon_rate=best_results['direct_coupon_rate'],
        min_buffer_actual=best_results['min_buffer_actual'],
        last_cash_flow_day=last_cash_flow_day,
        additional_days=additional_days,
        results_by_strategy={k: v for k, v in best_results_by_strategy.items() if v is not None}
    )

def perform_genetic_optimization(df: pd.DataFrame, general_settings: GeneralSettings, optimization_settings: OptimizationSettings) -> OptimizationResult:
    """Genetic algorithm optimization with improved Class B percentage targeting - 
    Uses shared calculation logic from tranche_utils"""
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
        
        # Get selected default model
        selected_default_model = getattr(optimization_settings, "selected_default_model", "previous")
        
        # Use the new Class B percentage targeting parameters
        target_class_b_percent = getattr(optimization_settings, "min_class_b_percent", 5.0)  # Default to 5% instead of 15%
        
        # Use the tighter class_b_percent_deviation value (default 1.0)
        class_b_percent_deviation = getattr(optimization_settings, "class_b_percent_deviation", 1.0)
        
        # Log the actual values used for debugging
        logger.info(f"Genetic: Target Class B percent: {target_class_b_percent}, deviation: {class_b_percent_deviation}")
        logger.info(f"Genetic: Selected default model: {selected_default_model}")
        
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
        
        # Fix: Ensure class_b_maturity is at least 1 to avoid division by zero
        # Class B maturity as Last Cash Flow Day + Additional Days, capped at 365
        class_b_maturity = max(1, min(365, last_cash_flow_day + additional_days))
        
        # Get original parameters for Class A based on selected default model
        if selected_default_model == "new":
            # Updated NEW model parameters (April 28, 2025)
            original_maturities_A = [155]
            original_base_rates_A = [50.75]
            original_reinvest_rates_A = [42.0]
            
            # Class B values for new model
            class_b_base_rate_orig = 0.0
            class_b_reinvest_rate_orig = 42.0
            
            # Calculate total nominal amount for new model
            total_a_nominal = 250_200_000
            
            # Fixed number of tranches for new model
            default_num_a_tranches = 1  # New model has 1 tranche
        else:
            # Updated PREVIOUS model parameters (April 28, 2025)
            original_maturities_A = [88, 150]
            original_base_rates_A = [51.0, 50.5]
            original_reinvest_rates_A = [46.0, 42.0]
            
            # Class B values for previous model
            class_b_base_rate_orig = 0.0
            class_b_reinvest_rate_orig = 42.0
            
            # Calculate total nominal amount for previous model
            total_a_nominal = 85_000_000 + 158_300_000  # Sum of the two tranches
            
            # Fixed number of tranches for previous model
            default_num_a_tranches = 2  # Previous model has 2 tranches
        
        # Create rate lookup tables for Class A
        maturity_to_base_rate_A = dict(zip(original_maturities_A, original_base_rates_A))
        maturity_to_reinvest_rate_A = dict(zip(original_maturities_A, original_reinvest_rates_A))
        
        # Update progress to 15%
        optimization_progress.update(step=15, 
                                    message="Preparing optimization data...")
        
        # Create temporary dataframe for calculation
        df_temp = df.copy()
        df_temp['cash_flow'] = df_temp['original_cash_flow'].copy()
        
        # Fix: Ensure target_date uses standard hyphen
        target_date = pd.Timestamp('2025-02-16')
        target_rows = df_temp[df_temp['installment_date'].dt.date == target_date.date()]
        
        if not target_rows.empty:
            t_idx = target_rows.index[0]
            orig_cf = df_temp.at[t_idx, 'cash_flow']
            new_cf = max(0, orig_cf - ops_expenses)
            df_temp.at[t_idx, 'cash_flow'] = new_cf
        
        # Fixed number of tranches - use the default for the selected model
        num_a_tranches = default_num_a_tranches
        
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
            
            # Ensure all maturities are integers
            maturities = [int(m) for m in maturities]
            
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
                    
                    # Try to adjust nominals for target coupon rate using the shared utility function
                    try:
                        # Generate default spreads (all zeros)
                        a_spreads = [0.0] * len(nominals)
                        b_spread = 0.0
                        
                        adjusted_nominals, adjustment_success, adjusted_b_percent = adjust_class_a_nominals_for_target_coupon(
                            df_temp, start_date,
                            maturities_int, nominals, a_base_rates, a_spreads, a_reinvest_rates,
                            class_b_maturity, class_b_base_rate_orig, b_spread, class_b_reinvest_rate_orig, class_b_nominal,
                            target_class_b_coupon_rate, target_class_b_percent, min_buffer, ops_expenses
                        )
                        
                        if adjustment_success:
                            nominals = adjusted_nominals
                            individual['nominals'] = nominals
                            individual['class_b_percent'] = adjusted_b_percent
                    except Exception as e:
                        logger.error(f"Error adjusting nominals: {str(e)}")
                        # Continue with original nominals
                    
                    # Evaluate the adjusted parameters using shared evaluate_params
                    eval_result = evaluate_params(
                        df_temp, start_date,
                        maturities_int, nominals, class_b_maturity,
                        maturity_to_base_rate_A, maturity_to_reinvest_rate_A,
                        class_b_base_rate_orig, class_b_reinvest_rate_orig,
                        target_class_b_percent, class_b_percent_deviation,
                        target_class_b_coupon_rate, min_buffer,
                        ops_expenses
                    )
                    
                    # Set fitness - ensure it's a number
                    if eval_result['is_valid']:
                        individual['fitness'] = float(eval_result['score'])
                        individual['result'] = eval_result
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
                            if results:
                                coupon_rate = results.get('class_b_coupon_rate', 0)
                                coupon_diff = abs(coupon_rate - target_class_b_coupon_rate)
                                class_b_percent = results.get('class_b_percent', 0)
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
                            child_maturities[0] = random.randint(min_maturity, min(child_maturities[1] - min_gap if num_a_tranches > 1 else max_maturity, min_maturity + 60))
                        elif mutation_idx == num_a_tranches - 1:
                            # Last maturity
                            child_maturities[-1] = random.randint(child_maturities[-2] + min_gap if num_a_tranches > 1 else min_maturity, max_maturity)
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
                if best_results:
                    coupon_diff = abs(best_results.get('class_b_coupon_rate', 0) - target_class_b_coupon_rate)
                    percent_diff = abs(best_results.get('class_b_percent', 0) - target_class_b_percent)
                    
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
        
        # Debug logging
        print(f"*** GENETIC OPTIMIZATION RESULTS ***")
        if best_result and best_result['results']:
            print(f"Class B coupon rate (effective): {best_result['results'].get('class_b_coupon_rate', 0)}")
            print(f"Class B coupon rate (direct): {best_result['results'].get('direct_coupon_rate', 0)}")
        print(f"Class B maturity: {class_b_maturity}")
        
        # Prepare the result from the best_result dictionary
        result_dict = best_result['results'] if best_result and best_result['results'] else {}
        
        # Final progress update to 100%
        optimization_progress.update(step=100, 
                                phase="Complete",
                                message="Genetic optimization completed successfully")
        
        # Return the optimization result with all necessary data
        return OptimizationResult(
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
            class_b_coupon_rate=result_dict.get('class_b_coupon_rate', 0),
            direct_class_b_coupon_rate=result_dict.get('direct_coupon_rate', 0),
            min_buffer_actual=result_dict.get('min_buffer_actual', 0),
            last_cash_flow_day=int(last_cash_flow_day),
            additional_days=int(additional_days),
            results_by_strategy={"genetic": result_dict}
        )
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