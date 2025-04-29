from fastapi import APIRouter, HTTPException
from app.models.input_models import StressTestRequest
from app.services.stress_testing_service import perform_stress_test
from app.routers.calculation import df_store
import logging
import traceback

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/stress-test/", response_model=dict)
async def stress_test(request: StressTestRequest):
    try:
        # Get the stored dataframe with better error message
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
        
        # Basic validation of input data
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
        
        # Perform the stress test
        result = perform_stress_test(df, request)
        
        # Log results for debugging
        logger.info(f"Stress test completed. Baseline rate: {result['baseline']['class_b_coupon_rate']}%, Stress rate: {result['stress_test']['class_b_coupon_rate']}%")
        logger.info(f"Difference: {result['difference']['class_b_coupon_rate']}%")
        
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