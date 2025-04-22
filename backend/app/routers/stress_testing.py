# app/routers/stress_testing.py

from fastapi import APIRouter, HTTPException, Body
from app.models.input_models import StressTestRequest, EnhancedStressTestRequest, StructureParameters, EnhancedScenarioParameters
from app.services.enhanced_stress_testing_service import perform_enhanced_stress_test
from app.routers.calculation import df_store
import logging
import traceback
from datetime import date
from typing import Dict, Any, List
from pydantic import ValidationError

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/stress-test/", response_model=Dict[str, Any])
async def stress_test(request: StressTestRequest):
    """
    Run a basic stress test with NPL, prepayment and reinvestment shift
    """
    try:
        # Get the stored dataframe
        df = df_store.get("df")
        if df is None:
            raise HTTPException(
                status_code=400, 
                detail="No loan data found. Please upload an Excel file on the Structure Analysis page first."
            )
        
        # Validate dataframe has required columns
        required_columns = ['principal_amount', 'interest_amount', 'cash_flow', 'installment_date']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns in uploaded data: {', '.join(missing_columns)}"
            )
        
        # Validate input data
        if not request.structure:
            raise HTTPException(status_code=400, detail="Structure details are missing")
            
        # Validate structure parameters
        if not request.structure.a_maturities:
            raise HTTPException(status_code=400, detail="No Class A maturities provided")
        
        # Ensure lists are of equal length
        list_lengths = [
            len(request.structure.a_maturities),
            len(request.structure.a_base_rates),
            len(request.structure.a_spreads),
            len(request.structure.a_reinvest_rates),
            len(request.structure.a_nominals)
        ]
        if len(set(list_lengths)) > 1:
            raise HTTPException(
                status_code=400, 
                detail=f"Inconsistent lengths in Class A parameters: {list_lengths}"
            )
        
        # Validate scenario parameters
        if request.scenario.npl_rate < 0 or request.scenario.npl_rate > 100:
            raise HTTPException(
                status_code=400,
                detail=f"NPL rate must be between 0 and 100, got {request.scenario.npl_rate}"
            )
            
        if request.scenario.prepayment_rate < 0 or request.scenario.prepayment_rate > 100:
            raise HTTPException(
                status_code=400,
                detail=f"Prepayment rate must be between 0 and 100, got {request.scenario.prepayment_rate}"
            )
        
        # Log inputs for debugging
        logger.info(f"Running stress test with scenario: {request.scenario.name}")
        logger.info(f"NPL rate: {request.scenario.npl_rate}%, Prepayment: {request.scenario.prepayment_rate}%, Reinvestment shift: {request.scenario.reinvestment_shift}%")
        
        # Convert standard request to enhanced request with default values for enhanced parameters
        enhanced_request = EnhancedStressTestRequest(
            structure=request.structure,
            scenario=EnhancedScenarioParameters(
                name=request.scenario.name,
                npl_rate=request.scenario.npl_rate,
                prepayment_rate=request.scenario.prepayment_rate,
                reinvestment_shift=request.scenario.reinvestment_shift,
                recovery_rate=0.50,
                recovery_lag=6,
                delinquency_rate=None,  # Will be derived from npl_rate
                delinquency_recovery_rate=0.85,
                delinquency_to_default_rate=0.20,
                repeat_delinquency_factor=1.5
            )
        )
        
        # Use enhanced stress test
        result = perform_enhanced_stress_test(df, enhanced_request)
        
        # Return result directly - it's already in the correct format
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions directly
        raise
    except Exception as e:
        # Capture and log the full exception details
        stack_trace = traceback.format_exc()
        error_message = str(e)
        logger.error(f"Stress testing error: {error_message}\n{stack_trace}")
        
        # Provide a meaningful error message
        if not error_message:
            error_message = "Unknown error occurred during stress testing. Check server logs for details."
            
        raise HTTPException(
            status_code=400, 
            detail=f"Stress testing error: {error_message}"
        )

@router.post("/enhanced-stress-test/")
async def enhanced_stress_test(request_data: Dict[str, Any] = Body(...)):
    """
    Run enhanced stress test with additional parameters
    """
    try:
        # Log raw request data for debugging
        logger.info(f"Enhanced stress test raw request: {request_data}")
        
        # Try to parse and validate request data manually
        try:
            # Extract structure and scenario data
            structure_data = request_data.get("structure", {})
            scenario_data = request_data.get("scenario", {})
            
            # Format date string from frontend to date object
            start_date_str = structure_data.get("start_date")
            start_date = None
            
            if isinstance(start_date_str, str):
                try:
                    start_date = date.fromisoformat(start_date_str)
                except ValueError:
                    # Try different formats
                    try:
                        from datetime import datetime
                        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
                    except ValueError:
                        raise ValueError(f"Invalid date format: {start_date_str}. Expected YYYY-MM-DD")
            
            # Validate structure
            structure = StructureParameters(
                start_date=start_date,
                a_maturities=structure_data.get("a_maturities", []),
                a_base_rates=structure_data.get("a_base_rates", []),
                a_spreads=structure_data.get("a_spreads", []),
                a_reinvest_rates=structure_data.get("a_reinvest_rates", []),
                a_nominals=structure_data.get("a_nominals", []),
                b_maturity=structure_data.get("b_maturity"),
                b_base_rate=structure_data.get("b_base_rate"),
                b_spread=structure_data.get("b_spread"),
                b_reinvest_rate=structure_data.get("b_reinvest_rate"),
                b_nominal=structure_data.get("b_nominal"),
                ops_expenses=structure_data.get("ops_expenses", 0.0)
            )
            
            # Validate scenario
            scenario = EnhancedScenarioParameters(
                name=scenario_data.get("name", "Scenario"),
                npl_rate=scenario_data.get("npl_rate"),
                prepayment_rate=scenario_data.get("prepayment_rate"),
                reinvestment_shift=scenario_data.get("reinvestment_shift"),
                recovery_rate=scenario_data.get("recovery_rate", 0.5),
                recovery_lag=scenario_data.get("recovery_lag", 6),
                delinquency_rate=scenario_data.get("delinquency_rate"),
                delinquency_recovery_rate=scenario_data.get("delinquency_recovery_rate", 0.85),
                delinquency_to_default_rate=scenario_data.get("delinquency_to_default_rate", 0.2),
                repeat_delinquency_factor=scenario_data.get("repeat_delinquency_factor", 1.5)
            )
            
            # Create validated request
            request = EnhancedStressTestRequest(structure=structure, scenario=scenario)
            
        except ValidationError as ve:
            # Return detailed validation errors
            error_messages = str(ve).split("\n")
            logger.error(f"Validation error: {error_messages}")
            raise HTTPException(
                status_code=422,
                detail={"message": "Validation error", "errors": error_messages}
            )
        
        # Get the stored dataframe
        df = df_store.get("df")
        if df is None:
            raise HTTPException(
                status_code=400, 
                detail="No loan data found. Please upload an Excel file on the Structure Analysis page first."
            )
        
        # Perform additional validation on the structure
        # Ensure lists are of equal length
        list_lengths = [
            len(request.structure.a_maturities),
            len(request.structure.a_base_rates),
            len(request.structure.a_spreads),
            len(request.structure.a_reinvest_rates),
            len(request.structure.a_nominals)
        ]
        if len(set(list_lengths)) > 1:
            raise HTTPException(
                status_code=400, 
                detail=f"Inconsistent lengths in Class A parameters: {list_lengths}"
            )
        
        # Validate scenario parameters
        if request.scenario.npl_rate < 0 or request.scenario.npl_rate > 100:
            raise HTTPException(
                status_code=400,
                detail=f"NPL rate must be between 0 and 100, got {request.scenario.npl_rate}"
            )
            
        if request.scenario.prepayment_rate < 0 or request.scenario.prepayment_rate > 100:
            raise HTTPException(
                status_code=400,
                detail=f"Prepayment rate must be between 0 and 100, got {request.scenario.prepayment_rate}"
            )
        
        if request.scenario.recovery_rate < 0 or request.scenario.recovery_rate > 1:
            raise HTTPException(
                status_code=400,
                detail=f"Recovery rate must be between 0 and 1, got {request.scenario.recovery_rate}"
            )
        
        if request.scenario.recovery_lag <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Recovery lag must be positive, got {request.scenario.recovery_lag}"
            )
            
        if request.scenario.delinquency_recovery_rate < 0 or request.scenario.delinquency_recovery_rate > 1:
            raise HTTPException(
                status_code=400,
                detail=f"Delinquency recovery rate must be between 0 and 1, got {request.scenario.delinquency_recovery_rate}"
            )
            
        if request.scenario.delinquency_to_default_rate < 0 or request.scenario.delinquency_to_default_rate > 1:
            raise HTTPException(
                status_code=400,
                detail=f"Delinquency to default rate must be between 0 and 1, got {request.scenario.delinquency_to_default_rate}"
            )
        
        # Log inputs for debugging
        logger.info(f"Running enhanced stress test with scenario: {request.scenario.name}")
        logger.info(f"NPL rate: {request.scenario.npl_rate}%, Prepayment: {request.scenario.prepayment_rate}%, " + 
                    f"Recovery: {request.scenario.recovery_rate * 100}%")
        
        # Perform the enhanced stress test
        result = perform_enhanced_stress_test(df, request)
        
        # Return result directly - it's already in the correct format
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions directly
        raise
    except Exception as e:
        # Capture and log the full exception details
        stack_trace = traceback.format_exc()
        error_message = str(e)
        logger.error(f"Enhanced stress testing error: {error_message}\n{stack_trace}")
        
        # Provide a meaningful error message
        if not error_message:
            error_message = "Unknown error occurred during enhanced stress testing. Check server logs for details."
            
        raise HTTPException(
            status_code=400, 
            detail=f"Enhanced stress testing error: {error_message}"
        )