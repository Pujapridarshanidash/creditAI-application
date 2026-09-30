from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import joblib
import os
from pathlib import Path

# ML Model storage
ml_model = {}

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models
    ml_model['model'] = joblib.load("credit_risk_model.pkl")
    ml_model['threshold'] = joblib.load("threshold.pkl")
    print("✓ Models loaded successfully")
    
    yield
    
    # Shutdown: Clear resources
    ml_model.clear()
    print("✓ Resources cleared")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="CreditAI API",
    description="AI-Powered Credit Risk Assessment",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
# In production, replace "*" with specific domains
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    # Add your production frontend domain here:
    # "https://creditai.example.com",
    # "https://www.creditai.example.com",
]

# For production: Use specific origins
# For development: You can use ["*"] but it's not recommended
if os.getenv("ENVIRONMENT") == "production":
    CORS_ORIGINS = [
        "https://creditai.example.com",  # Update with your domain
        "https://www.creditai.example.com",
    ]
else:
    CORS_ORIGINS = ["*"]  # Development only

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for request validation
class LoanApplication(BaseModel):
    """Loan application data model"""
    person_age: int
    person_income: float
    person_home_ownership: str
    person_emp_length: str
    loan_intent: str
    loan_grade: str
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: float

    class Config:
        json_schema_extra = {
            "example": {
                "person_age": 35,
                "person_income": 50000,
                "person_home_ownership": "MORTGAGE",
                "person_emp_length": "5",
                "loan_intent": "PERSONAL",
                "loan_grade": "B",
                "loan_amnt": 10000,
                "loan_int_rate": 12.5,
                "loan_percent_income": 20,
                "cb_person_default_on_file": "N",
                "cb_person_cred_hist_length": 10
            }
        }

# Routes

@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint"""
    return {
        "message": "Hello, World!",
        "status": "OK",
        "service": "CreditAI API"
    }

@app.get("/health", tags=["Health"])
def health_detailed():
    """Detailed health check"""
    return {
        "status": "healthy",
        "models_loaded": len(ml_model) > 0,
        "service": "credit-risk-assessment"
    }

@app.post("/predict", tags=["Prediction"])
def predict(data: LoanApplication):
    """
    Predict credit risk for a loan application
    
    Returns:
    - prediction_proba: Probability of default (0-1)
    - prediction: Binary prediction (0=Low Risk, 1=High Risk)
    - threshold: Decision threshold used
    - Result: Human-readable risk assessment
    """
    try:
        # Convert input data to DataFrame
        input_df = pd.DataFrame([data.dict()])
        
        # Get prediction probability
        prediction_proba = ml_model['model'].predict_proba(input_df)[:, 1][0]
        
        # Get decision based on threshold
        threshold = ml_model['threshold']
        prediction = 1 if prediction_proba > threshold else 0
        
        # Return results
        return {
            "prediction_proba": round(prediction_proba, 4),
            "prediction": prediction,
            "threshold": round(threshold, 4),
            "Result": "High Risk" if prediction == 1 else "Low Risk",
            "confidence": round(abs(prediction_proba - threshold) * 100, 2)
        }
    
    except Exception as e:
        return {
            "error": str(e),
            "status": "error"
        }

@app.post("/batch-predict", tags=["Prediction"])
def batch_predict(applications: list[LoanApplication]):
    """
    Predict credit risk for multiple applications
    """
    try:
        results = []
        
        for app_data in applications:
            input_df = pd.DataFrame([app_data.dict()])
            prediction_proba = ml_model['model'].predict_proba(input_df)[:, 1][0]
            threshold = ml_model['threshold']
            prediction = 1 if prediction_proba > threshold else 0
            
            results.append({
                "prediction_proba": round(prediction_proba, 4),
                "prediction": prediction,
                "Result": "High Risk" if prediction == 1 else "Low Risk"
            })
        
        return {"results": results, "count": len(results)}
    
    except Exception as e:
        return {"error": str(e), "status": "error"}

# Optional: Serve static files if hosting frontend with backend
# Uncomment the following lines to enable static file serving
"""
# Create static directory if it doesn't exist
STATIC_DIR = Path("static")
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")
    
    @app.get("/")
    async def serve_root():
        return FileResponse("static/index.html")
"""

# API Documentation
@app.get("/docs-info", tags=["Documentation"])
def api_info():
    """Get API information"""
    return {
        "name": "CreditAI",
        "version": "1.0.0",
        "description": "AI-Powered Credit Risk Assessment API",
        "endpoints": {
            "health": "GET /",
            "predict": "POST /predict",
            "batch_predict": "POST /batch-predict",
            "interactive_docs": "GET /docs",
            "openapi_spec": "GET /openapi.json"
        }
    }

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return {
        "error": "Internal server error",
        "detail": str(exc),
        "status": "error"
    }

if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload during development
        log_level="info"
    )