"""Recommendation engine API routes."""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.recommendation.service import RecommendationService

router = APIRouter()
service = RecommendationService()


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: list[dict]
    algorithm: str
    generated_at: str


class SimilarProductsResponse(BaseModel):
    product_id: str
    similar_products: list[dict]
    algorithm: str


@router.post("/{user_id}", response_model=RecommendationResponse)
async def get_recommendations(
    user_id: str,
    limit: int = Query(default=10, le=50),
):
    """Get personalized product recommendations for a user."""
    return await service.get_recommendations(user_id=user_id, limit=limit)


@router.post("/similar/{product_id}", response_model=SimilarProductsResponse)
async def get_similar_products(
    product_id: str,
    limit: int = Query(default=6, le=20),
):
    """Get products similar to a given product."""
    return await service.get_similar_products(product_id=product_id, limit=limit)
