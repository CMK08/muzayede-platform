"""Auto-categorisation API routes."""

import logging
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.categorization.service import CategorizationService

logger = logging.getLogger(__name__)

router = APIRouter()
service = CategorizationService()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CategoryPrediction(BaseModel):
    category: str
    confidence: float


class ImageNetPrediction(BaseModel):
    class_name: str = ""
    probability: float = 0.0


class CategorizationResponse(BaseModel):
    predicted_category: str
    confidence: float
    top_categories: list[CategoryPrediction]
    imagenet_predictions: Optional[list[dict]] = None


class TextCategorizationRequest(BaseModel):
    title: str
    description: str = ""
    image_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/image",
    response_model=CategorizationResponse,
    summary="Categorise by image upload",
)
async def categorize_image(
    file: UploadFile = File(..., description="Product image (JPEG / PNG / WebP)"),
    title: str = Form(default="", description="Optional product title for text blending"),
    description: str = Form(default="", description="Optional product description"),
) -> Any:
    """
    Upload an image and receive suggested auction categories.

    Uses ResNet-50 (ImageNet) for image classification, mapped to auction
    categories, blended with keyword TF-IDF scoring on the optional text fields.
    """
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_data = await file.read()
    if len(image_data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds 20 MB limit")

    try:
        return await service.categorize(
            title=title,
            description=description,
            image_data=image_data,
        )
    except Exception as exc:
        logger.exception("Image categorisation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post(
    "/predict",
    response_model=CategorizationResponse,
    summary="Categorise by text (+ optional image URL)",
)
async def categorize_text(request: TextCategorizationRequest) -> Any:
    """
    Predict auction category from product title and description.

    If *image_url* is provided the service will download the image and blend
    ResNet-50 predictions with the text-based score.
    """
    try:
        return await service.categorize(
            title=request.title,
            description=request.description,
            image_url=request.image_url,
        )
    except Exception as exc:
        logger.exception("Text categorisation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
