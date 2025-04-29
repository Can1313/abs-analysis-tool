import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.routers import calculation, optimization, stress_testing
import uvicorn

app = FastAPI(
    title="ABS Analysis Tool",
    description="Cash flow analysis for securitization",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression for faster responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add custom middleware for timeout and performance tracking
@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Include routers
app.include_router(calculation.router, prefix="/api", tags=["Calculation"])
app.include_router(optimization.router, prefix="/api", tags=["Optimization"])
app.include_router(stress_testing.router, prefix="/api", tags=["Stress Testing"])

@app.get("/")
async def root():
    return {"message": "ABS Analysis Tool API is running"}

# Configure server settings if run directly
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        timeout_keep_alive=600,  # 10 dakika keep-alive timeout
        workers=1,  # Optimization işlemi için tek bir işçi daha iyi olabilir
    )