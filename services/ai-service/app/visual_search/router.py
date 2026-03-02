"""Visual search API routes -- find similar products by image."""

import logging
from typing import Any, Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.visual_search.service import VisualSearchService

logger = logging.getLogger(__name__)

router = APIRouter()
service = VisualSearchService()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class VisualSearchResult(BaseModel):
    product_id: str
    similarity_score: float
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None


class VisualSearchResponse(BaseModel):
    results: list[VisualSearchResult]
    total: int
    index_size: Optional[int] = None
    error: Optional[str] = None


class IndexRequest(BaseModel):
    product_id: str
    image_url: str


class IndexResponse(BaseModel):
    product_id: str
    indexed: bool
    embedding_dim: Optional[int] = None
    index_size: Optional[int] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    response_model=VisualSearchResponse,
    summary="Search by uploaded image",
)
async def search_by_upload(
    file: UploadFile = File(..., description="Image file (JPEG / PNG / WebP)"),
    limit: int = Query(default=10, ge=1, le=50),
) -> Any:
    """
    Upload an image and retrieve the most visually similar products.

    Uses CLIP (ViT-B/32) embeddings with cosine similarity.
    """
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_data = await file.read()
    if len(image_data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds 20 MB limit")

    try:
        return await service.search_by_image(image_data, limit=limit)
    except Exception as exc:
        logger.exception("Visual search failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post(
    "/search-by-url",
    response_model=VisualSearchResponse,
    summary="Search by image URL",
)
async def search_by_url(
    image_url: str = Query(..., description="Public URL of the query image"),
    limit: int = Query(default=10, ge=1, le=50),
) -> Any:
    """Download an image from *image_url* and find visually similar products."""
    try:
        return await service.search_by_image(image_url, limit=limit)
    except Exception as exc:
        logger.exception("Visual search by URL failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get(
    "/similar/{product_id}",
    response_model=VisualSearchResponse,
    summary="Visually similar products",
)
async def similar_by_product(
    product_id: str,
    limit: int = Query(default=10, ge=1, le=50),
) -> Any:
    """Find products visually similar to an already-indexed product."""
    try:
        return await service.search_by_product(product_id, limit=limit)
    except Exception as exc:
        logger.exception("Visual similarity lookup failed for product=%s", product_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post(
    "/index",
    response_model=IndexResponse,
    summary="Index a product image by URL",
)
async def index_product(request: IndexRequest) -> Any:
    """Compute and store the CLIP embedding for a product image (by URL)."""
    try:
        return await service.index_product_image(request.product_id, request.image_url)
    except Exception as exc:
        logger.exception("Indexing failed for product=%s", request.product_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post(
    "/index-upload/{product_id}",
    response_model=IndexResponse,
    summary="Index a product image by upload",
)
async def index_product_upload(
    product_id: str,
    file: UploadFile = File(..., description="Product image to index"),
) -> Any:
    """Compute and store the CLIP embedding for a product image (by upload)."""
    image_data = await file.read()
    try:
        return await service.index_product_image(product_id, image_data)
    except Exception as exc:
        logger.exception("Indexing upload failed for product=%s", product_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
