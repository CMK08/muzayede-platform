"""Recommendation engine API routes."""

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.recommendation.service import RecommendationService

logger = logging.getLogger(__name__)

router = APIRouter()
service = RecommendationService()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class RecommendedProduct(BaseModel):
    product_id: str
    title: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    estimate_low: Optional[float] = None
    estimate_high: Optional[float] = None
    confidence: float = Field(..., ge=0, le=1)


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: list[RecommendedProduct]
    algorithm: str
    generated_at: str
    error: Optional[str] = None


class SimilarProduct(BaseModel):
    product_id: str
    title: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    artist: Optional[str] = None
    similarity_score: float = Field(..., ge=0, le=1)


class SimilarProductsResponse(BaseModel):
    product_id: str
    similar_products: list[SimilarProduct]
    algorithm: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/user/{user_id}",
    response_model=RecommendationResponse,
    summary="Personalised recommendations",
)
async def get_recommendations(
    user_id: str,
    limit: int = Query(default=10, ge=1, le=50, description="Max items to return"),
) -> Any:
    """
    Return personalised product recommendations for *user_id*.

    Uses hybrid collaborative filtering (cosine similarity on user-item matrix)
    blended with TF-IDF content-based filtering.
    """
    try:
        return await service.get_recommendations(user_id=user_id, limit=limit)
    except RuntimeError as exc:
        logger.error("Recommendation failed for user=%s: %s", user_id, exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    except Exception as exc:
        logger.exception("Unexpected error generating recommendations for user=%s", user_id)
        raise HTTPException(status_code=500, detail="Internal error") from exc


@router.get(
    "/similar/{product_id}",
    response_model=SimilarProductsResponse,
    summary="Similar products",
)
async def get_similar_products(
    product_id: str,
    limit: int = Query(default=6, ge=1, le=20, description="Max items to return"),
) -> Any:
    """
    Return products similar to *product_id*.

    Uses TF-IDF cosine similarity on product titles and descriptions, with an
    attribute-overlap fallback when the product is not yet indexed.
    """
    try:
        return await service.get_similar_products(product_id=product_id, limit=limit)
    except RuntimeError as exc:
        logger.error("Similar-products failed for product=%s: %s", product_id, exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    except Exception as exc:
        logger.exception("Unexpected error finding similar products for product=%s", product_id)
        raise HTTPException(status_code=500, detail="Internal error") from exc
