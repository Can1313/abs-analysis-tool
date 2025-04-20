import time
import traceback
import logging
import asyncio
from fastapi.responses import JSONResponse
from fastapi import APIRouter, HTTPException, Path
from app.models.input_models import OptimizationSettings, GeneralSettings
from app.models.output_models import OptimizationResult

# Import the optimization_progress object and all optimization functions
from app.services.optimization_service import (
    optimization_progress,  # Import the progress tracker
    perform_optimization, 
    perform_genetic_optimization
)
from app.routers.calculation import df_store  # Import the shared dataframe store

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/optimize/classic/", response_model=OptimizationResult)
async def optimize_classic(
    optimization_settings: OptimizationSettings,
    general_settings: GeneralSettings
):
    try:
        # Reset progress tracker
        optimization_progress.reset()
        
        # Get the stored dataframe
        df = df_store.get("df")
        if df is None:
            raise HTTPException(status_code=400, detail="No data found. Please upload Excel file first.")
        
        # Log the request including the selected default model
        logger.info(f"Starting classic optimization with parameters: {optimization_settings}")
        logger.info(f"Using default model: {optimization_settings.selected_default_model}")
        
        # Perform the optimization with classic method in a separate thread
        # to not block the event loop and allow progress updates
        def run_optimization():
            return perform_optimization(df, general_settings, optimization_settings)
        
        # Run the CPU-bound optimization task in a thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, run_optimization)
        
        # Log success
        logger.info("Classic optimization completed successfully")
        
        # Ensure progress is set to 100% when complete
        optimization_progress.update(
            step=100,
            phase="Complete",
            message="Optimization completed successfully"
        )
        
        return result
    except Exception as e:
        # Log the error
        logger.error(f"Classic optimization error: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Update progress tracker in case of error (don't reset)
        optimization_progress.update(
            phase="Error",
            message=f"Classic optimization error: {str(e)}",
            step=100
        )
        
        raise HTTPException(status_code=500, detail=f"Classic optimization error: {str(e)}")

@router.post("/optimize/genetic/", response_model=OptimizationResult)
async def optimize_genetic(
    optimization_settings: OptimizationSettings,
    general_settings: GeneralSettings
):
    try:
        # Reset progress tracker
        optimization_progress.reset()
        
        df = df_store.get("df")
        if df is None:
            raise HTTPException(status_code=400, detail="No data found. Please upload Excel file first.")
        
        # Log the request including the selected default model
        logger.info(f"Starting genetic optimization with parameters: {optimization_settings}")
        logger.info(f"Using default model: {optimization_settings.selected_default_model}")
        
        # Perform the optimization in a separate thread
        def run_optimization():
            return perform_genetic_optimization(df, general_settings, optimization_settings)
        
        # Run the CPU-bound optimization task in a thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, run_optimization)
        
        # Log success
        logger.info("Genetic optimization completed successfully")
        
        # Ensure progress is set to 100% when complete
        optimization_progress.update(
            step=100,
            phase="Complete",
            message="Optimization completed successfully"
        )
        
        return result
    except Exception as e:
        # Log the error
        logger.error(f"Genetic optimization error: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Update progress tracker in case of error (don't reset)
        optimization_progress.update(
            phase="Error",
            message=f"Genetic optimization error: {str(e)}",
            step=100
        )
        
        raise HTTPException(status_code=500, detail=f"Genetic optimization error: {str(e)}")

# Backward compatibility main endpoint - updated to only support classic and genetic
@router.post("/optimize/", response_model=OptimizationResult)
async def optimize(
    optimization_settings: OptimizationSettings,
    general_settings: GeneralSettings
):
    method = getattr(optimization_settings, "optimization_method", "classic")
    logger.info(f"Optimizing with method: {method}")
    logger.info(f"Using default model: {optimization_settings.selected_default_model}")
    
    # Reset progress before starting
    optimization_progress.reset()
    
    # Add timeout handling
    try:
        # Sınırlı kombinasyon sayısı ve iterasyon
        if hasattr(optimization_settings, "maturity_range") and len(optimization_settings.maturity_range) == 2:
            # İşlem süresini azaltmak için parametreleri sınırla
            range_diff = optimization_settings.maturity_range[1] - optimization_settings.maturity_range[0]
            if range_diff > 200 and optimization_settings.maturity_step < 15:
                logger.warning(f"Large maturity range ({range_diff}) with small step ({optimization_settings.maturity_step}). Adjusting step.")
                optimization_settings.maturity_step = max(15, optimization_settings.maturity_step)
        
        if method == "classic":
            return await optimize_classic(optimization_settings, general_settings)
        elif method == "genetic":
            return await optimize_genetic(optimization_settings, general_settings)
        else:
            # Default to classic method for any unsupported types
            logger.warning(f"Unknown optimization method: {method}, defaulting to classic")
            optimization_settings.optimization_method = "classic"
            return await optimize_classic(optimization_settings, general_settings)
    except Exception as e:
        # Güncelleme yapmak için hata durumunda progress'i güncelle
        optimization_progress.update(
            phase="Error", 
            message=f"Optimization error: {str(e)}",
            step=100
        )
        
        logger.error(f"Error in main optimize endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

@router.get("/optimize/progress/")
async def get_optimization_progress():
    """Get the current status of the optimization process"""
    # İlerleme sıfırlanmış olabileceğinden force_update
    progress_data = optimization_progress.get_info()
    logger.debug(f"Progress data: {progress_data}")  # Debugging için loglama ekleyin
    return progress_data