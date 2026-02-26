"""Visual search API routes - find similar items by image."""

from fastapi import APIRouter, UploadFile, File, Query
from pydantic import BaseModel
from app.visual_search.service import VisualSearchService

router = APIRouter()
service = VisualSearchService()


class IndexRequest(BaseModel):
    product_id: str
    image_url: str


@router.post("/search-by-image")
async def search_by_image(
    file: UploadFile = File(..., description="Image to search for similar items"),
    limit: int = Query(default=10, le=50),
):
    """Upload an image and find visually similar products."""
    image_data = await file.read()
    return await service.search_by_image(image_data, limit=limit)


@router.post("/search-by-url")
async def search_by_url(
    image_url: str = Query(..., description="URL of image to search"),
    limit: int = Query(default=10, le=50),
):
    """Find visually similar products by providing an image URL."""
    return await service.search_by_image(image_url, limit=limit)


@router.post("/index")
async def index_product_image(request: IndexRequest):
    """Index a product image for visual search."""
    return await service.index_product_image(request.product_id, request.image_url)


@router.post("/index-upload/{product_id}")
async def index_product_image_upload(
    product_id: str,
    file: UploadFile = File(..., description="Product image to index"),
):
    """Index a product image from upload for visual search."""
    image_data = await file.read()
    return await service.index_product_image(product_id, image_data)
