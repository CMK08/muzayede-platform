"""
Muzayede AI Service - FastAPI Application
Provides recommendation, visual search, categorization, and fraud detection.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

from dotenv import load_dotenv

load_dotenv()

from app.database import init_pool, close_pool
from app.recommendation.router import router as recommendation_router
from app.visual_search.router import router as visual_search_router
from app.categorization.router import router as categorization_router
from app.fraud_detection.router import router as fraud_detection_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("AI Service starting up...")

    # Initialize database connection pool
    try:
        init_pool(min_connections=2, max_connections=10)
        logger.info("Database connection pool initialized")
    except Exception as e:
        logger.warning(f"Database connection pool initialization failed: {e}")
        logger.warning("Service will start without database connectivity")

    logger.info("AI Service started successfully")
    yield

    # Shutdown
    logger.info("AI Service shutting down...")
    close_pool()
    logger.info("AI Service shutdown complete")


app = FastAPI(
    title="Muzayede AI Service",
    description="AI-powered recommendation, visual search, auto-categorization, and fraud detection",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    recommendation_router,
    prefix="/api/v1/ai/recommendations",
    tags=["recommendations"],
)
app.include_router(
    visual_search_router,
    prefix="/api/v1/ai/visual-search",
    tags=["visual-search"],
)
app.include_router(
    categorization_router,
    prefix="/api/v1/ai/categorization",
    tags=["categorization"],
)
app.include_router(
    fraud_detection_router,
    prefix="/api/v1/ai/fraud-detection",
    tags=["fraud-detection"],
)


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
    }


@app.get("/api/v1/ai/status", tags=["health"])
async def ai_status():
    """AI service status with model information."""
    return {
        "status": "running",
        "models": {
            "recommendation": {
                "loaded": True,
                "type": "hybrid_collaborative_content",
                "description": "Collaborative filtering (60%) + Content-based (40%)",
            },
            "visual_search": {
                "loaded": True,
                "type": "color_edge_histogram",
                "description": "Color histogram + edge detection features with cosine similarity",
            },
            "categorization": {
                "loaded": True,
                "type": "keyword_tfidf",
                "description": "Turkish keyword matching with TF-IDF scoring",
            },
            "fraud_detection": {
                "loaded": True,
                "type": "zscore_anomaly_detection",
                "description": "Z-score based outlier detection on bid patterns",
            },
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=3011, reload=True)
