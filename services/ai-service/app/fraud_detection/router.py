"""Fraud detection API routes."""

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.fraud_detection.service import FraudDetectionService

logger = logging.getLogger(__name__)

router = APIRouter()
service = FraudDetectionService()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class BidderFeatures(BaseModel):
    bid_count: float
    avg_increment: float
    avg_time_gap_sec: float
    min_time_gap_sec: float
    last_minute_ratio: float
    bid_amount_stddev: float
    account_age_days: float
    seller_bid_ratio: float
    ip_cluster_size: float


class SuspiciousBidder(BaseModel):
    bidder_id: str
    anomaly_score: float = Field(..., ge=0, le=1)
    is_anomaly: bool
    risk_factors: list[str]
    features: dict


class ModelInfo(BaseModel):
    type: str
    n_estimators: int
    contamination: float
    features: list[str]


class AuctionAnalysisResponse(BaseModel):
    auction_id: str
    risk_score: float = Field(..., ge=0, le=1)
    risk_level: str
    bidder_count: int
    bid_count: int
    suspicious_bidders: list[SuspiciousBidder]
    recommendation: str
    message: Optional[str] = None
    error: Optional[str] = None
    model: Optional[ModelInfo] = None


class BidAnalysisRequest(BaseModel):
    auction_id: str
    bidder_id: str
    bid_amount: float
    bidder_ip: Optional[str] = None
    device_fingerprint: Optional[str] = None


class BidAnalysisResponse(BaseModel):
    risk_score: float = Field(..., ge=0, le=1)
    risk_level: str
    risk_factors: list[str]
    is_suspicious: bool
    recommendation: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/analyze-auction/{auction_id}",
    response_model=AuctionAnalysisResponse,
    summary="Full auction fraud analysis",
)
async def analyze_auction(auction_id: str) -> Any:
    """
    Run Isolation Forest anomaly detection on the bid patterns of
    *auction_id* and flag suspicious bidders.

    Engineered features include bid velocity, time gaps, last-minute ratio,
    seller concentration, IP clustering, and account age.
    """
    try:
        return await service.analyze_auction(auction_id)
    except RuntimeError as exc:
        logger.error("Fraud analysis DB error for auction=%s: %s", auction_id, exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    except Exception as exc:
        logger.exception("Fraud analysis failed for auction=%s", auction_id)
        raise HTTPException(status_code=500, detail="Internal error") from exc


@router.post(
    "/analyze-bid",
    response_model=BidAnalysisResponse,
    summary="Quick single-bid risk check",
)
async def analyze_bid(request: BidAnalysisRequest) -> Any:
    """
    Lightweight heuristic check for a single incoming bid.

    Designed to run synchronously in the bid-acceptance pipeline.
    Uses z-score on bid amount, velocity checks, account age, and IP overlap.
    """
    try:
        return await service.analyze_bid(request.model_dump())
    except RuntimeError as exc:
        logger.error("Bid analysis DB error: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    except Exception as exc:
        logger.exception("Bid analysis failed")
        raise HTTPException(status_code=500, detail="Internal error") from exc
