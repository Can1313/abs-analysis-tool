from fastapi import APIRouter, HTTPException
from app.models.input_models import StressTestRequest  # You'll need to create this
from app.services.stress_testing_service import perform_stress_test
from app.routers.calculation import df_store
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/stress-test/", response_model=dict)
async def stress_test(request: StressTestRequest):
    try:
        # Get the stored dataframe
        df = df_store.get("df")
        if df is None:
            raise HTTPException(status_code=400, detail="No data found. Please upload Excel file first.")
        
        # Perform the stress test
        result = perform_stress_test(df, request)
        return result
    except Exception as e:
        logger.error(f"Stress testing error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stress testing error: {str(e)}")