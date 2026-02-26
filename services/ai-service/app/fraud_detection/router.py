"""Fraud detection API routes."""

from fastapi import APIRouter
from pydantic import BaseModel
from app.fraud_detection.service import FraudDetectionService

router = APIRouter()
service = FraudDetectionService()


class BidAnalysisRequest(BaseModel):
    auction_id: str
    bidder_id: str
    bid_amount: float
    bidder_ip: str | None = None
    device_fingerprint: str | None = None


class BidAnalysisResponse(BaseModel):
    risk_score: float
    risk_level: str
    risk_factors: list[str]
    is_suspicious: bool
    recommendation: str
    features: dict


@router.post("/analyze-bid", response_model=BidAnalysisResponse)
async def analyze_bid(request: BidAnalysisRequest):
    """Analyze a bid for potential fraud patterns."""
    return await service.analyze_bid(request.model_dump())
