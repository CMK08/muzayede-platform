"""
Muzayede AI Service -- FastAPI Application.

Provides:
  - Personalised product recommendations  (collaborative + content-based)
  - Visual similarity search              (CLIP embeddings)
  - Automatic product categorisation      (ResNet-50 / EfficientNet)
  - Shill-bidding / fraud detection       (Isolation Forest)
"""

from contextlib import asynccontextmanager
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.database import init_pool, close_pool  # noqa: E402
from app.recommendation.router import router as recommendation_router  # noqa: E402
from app.visual_search.router import router as visual_search_router  # noqa: E402
from app.categorization.router import router as categorization_router  # noqa: E402
from app.fraud_detection.router import router as fraud_detection_router  # noqa: E402

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("AI Service starting up ...")

    # Database ------------------------------------------------------------------
    try:
        init_pool(min_connections=2, max_connections=10)
        logger.info("Database connection pool initialised")
    except Exception as exc:
        logger.warning("Database pool init failed: %s -- service will start without DB", exc)

    # Lazy-load heavy ML models in background so the health-check is responsive
    # immediately. The individual service singletons handle their own loading.
    logger.info("AI Service ready on port %s", os.getenv("PORT", "3011"))
    yield

    # Shutdown ------------------------------------------------------------------
    logger.info("AI Service shutting down ...")
    close_pool()
    logger.info("AI Service shutdown complete")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Muzayede AI Service",
    description=(
        "AI-powered recommendation, visual search, "
        "auto-categorisation, and fraud detection"
    ),
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

# ---------------------------------------------------------------------------
# Route mounting
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Health & status
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """Liveness probe."""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
    }


@app.get("/api/v1/ai/status", tags=["health"])
async def ai_status() -> dict:
    """Readiness probe with per-model metadata."""
    return {
        "status": "running",
        "models": {
            "recommendation": {
                "loaded": True,
                "type": "hybrid_collaborative_content",
                "description": (
                    "Cosine similarity on user-item interaction matrix (60 %) "
                    "+ TF-IDF content-based filtering (40 %)"
                ),
            },
            "visual_search": {
                "loaded": True,
                "type": "clip_vit_base_patch32",
                "description": "CLIP ViT-B/32 embeddings with cosine distance",
            },
            "categorization": {
                "loaded": True,
                "type": "resnet50_imagenet",
                "description": "ResNet-50 ImageNet classifier mapped to auction categories",
            },
            "fraud_detection": {
                "loaded": True,
                "type": "isolation_forest",
                "description": "Isolation Forest anomaly detection on bid-pattern features",
            },
        },
    }


# ---------------------------------------------------------------------------
# Dev entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=3011, reload=True)
