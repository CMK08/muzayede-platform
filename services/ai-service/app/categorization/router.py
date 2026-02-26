"""Auto-categorization API routes."""

from fastapi import APIRouter
from pydantic import BaseModel
from app.categorization.service import CategorizationService

router = APIRouter()
service = CategorizationService()


class CategorizationRequest(BaseModel):
    title: str
    description: str
    image_url: str | None = None


class CategoryPrediction(BaseModel):
    category: str
    confidence: float


class CategorizationResponse(BaseModel):
    predicted_category: str
    confidence: float
    top_categories: list[CategoryPrediction]


@router.post("/predict", response_model=CategorizationResponse)
async def categorize(request: CategorizationRequest):
    """Predict category from product title, description, and optionally image."""
    return await service.categorize(
        title=request.title,
        description=request.description,
        image_url=request.image_url,
    )
