"""Fraud detection service using z-score anomaly detection and behavioral analysis."""

import logging
from datetime import datetime, timezone, timedelta

import numpy as np

from app.database import execute_query, execute_query_one

logger = logging.getLogger(__name__)


class FraudDetectionService:
    """Anomaly detection for bids using z-score based outlier detection."""

    RISK_THRESHOLDS = {
        "minimal": 0.0,
        "low": 0.3,
        "medium": 0.6,
        "high": 0.8,
        "critical": 0.95,
    }

    def __init__(self):
        self.model_loaded = True

    async def analyze_bid(self, bid_data: dict) -> dict:
        """
        Analyze a bid for fraud using feature-based anomaly detection.

        Features:
        - bid_amount: the amount of the bid
        - time_since_last_bid: seconds since the last bid in this auction
        - bidder_account_age: days since account creation
        - bidder_bid_count: total bids by this user
        - same_seller_bid_count: how many bids this user placed on this seller's auctions
        - ip_match_count: number of other users bidding from same IP
        - device_match_count: number of other users bidding from same device
        """
        logger.info(f"Analyzing bid: {bid_data}")

        risk_score = 0.0
        risk_factors: list[str] = []

        auction_id = bid_data.get("auction_id", "")
        bidder_id = bid_data.get("bidder_id", "")
        bid_amount = float(bid_data.get("bid_amount", 0))
        bidder_ip = bid_data.get("bidder_ip")
        device_fingerprint = bid_data.get("device_fingerprint")

        # Feature 1: Bid amount anomaly (z-score)
        amount_z = self._check_bid_amount_anomaly(auction_id, bid_amount)
        if abs(amount_z) > 3.0:
            risk_score += 0.25
            risk_factors.append(f"BID_AMOUNT_OUTLIER (z-score: {amount_z:.2f})")
        elif abs(amount_z) > 2.0:
            risk_score += 0.10
            risk_factors.append(f"BID_AMOUNT_UNUSUAL (z-score: {amount_z:.2f})")

        # Feature 2: Bid velocity (too many bids too fast)
        velocity = self._check_bid_velocity(bidder_id, auction_id)
        if velocity > 10:
            risk_score += 0.20
            risk_factors.append(f"HIGH_BID_VELOCITY ({velocity} bids in last 5 min)")
        elif velocity > 5:
            risk_score += 0.08
            risk_factors.append(f"ELEVATED_BID_VELOCITY ({velocity} bids in last 5 min)")

        # Feature 3: Account age check
        account_age_days = self._get_account_age(bidder_id)
        if account_age_days is not None:
            if account_age_days < 1:
                risk_score += 0.15
                risk_factors.append(f"NEW_ACCOUNT (age: {account_age_days:.1f} days)")
            elif account_age_days < 7:
                risk_score += 0.05
                risk_factors.append(f"YOUNG_ACCOUNT (age: {account_age_days:.1f} days)")

        # Feature 4: Bidder history
        bidder_stats = self._get_bidder_stats(bidder_id)
        if bidder_stats["total_bids"] == 0:
            risk_score += 0.10
            risk_factors.append("FIRST_TIME_BIDDER")

        # Feature 5: Same seller bid concentration
        seller_bid_ratio = self._get_same_seller_ratio(bidder_id, auction_id)
        if seller_bid_ratio > 0.8 and bidder_stats["total_bids"] > 5:
            risk_score += 0.20
            risk_factors.append(
                f"SELLER_BID_CONCENTRATION ({seller_bid_ratio:.0%} of bids on same seller)"
            )

        # Feature 6: IP match check
        if bidder_ip:
            ip_match_count = self._check_ip_match(auction_id, bidder_id, bidder_ip)
            if ip_match_count > 0:
                risk_score += 0.30
                risk_factors.append(
                    f"IP_MATCH_WITH_OTHER_BIDDERS (count: {ip_match_count})"
                )

        # Feature 7: Device fingerprint match
        if device_fingerprint:
            device_match_count = self._check_device_match(
                auction_id, bidder_id, device_fingerprint
            )
            if device_match_count > 0:
                risk_score += 0.25
                risk_factors.append(
                    f"DEVICE_MATCH_WITH_OTHER_BIDDERS (count: {device_match_count})"
                )

        risk_score = min(risk_score, 1.0)
        risk_level = self._determine_risk_level(risk_score)

        return {
            "risk_score": round(risk_score, 4),
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "is_suspicious": risk_score >= self.RISK_THRESHOLDS["medium"],
            "recommendation": self._get_recommendation(risk_level),
            "features": {
                "amount_z_score": round(amount_z, 4),
                "bid_velocity_5min": velocity,
                "account_age_days": account_age_days,
                "total_bids": bidder_stats["total_bids"],
                "seller_bid_ratio": round(seller_bid_ratio, 4) if seller_bid_ratio else 0,
            },
        }

    def _check_bid_amount_anomaly(self, auction_id: str, bid_amount: float) -> float:
        """Calculate z-score of bid amount relative to auction bid history."""
        bids = execute_query(
            """
            SELECT CAST(amount AS FLOAT) as amount
            FROM bids
            WHERE auction_id = %s AND is_retracted = false
            ORDER BY created_at ASC
            """,
            (auction_id,),
        )

        if len(bids) < 3:
            return 0.0

        amounts = np.array([float(b["amount"]) for b in bids])
        mean = np.mean(amounts)
        std = np.std(amounts)

        if std == 0:
            return 0.0

        # Also check the increment pattern
        if len(amounts) >= 2:
            increments = np.diff(amounts)
            inc_mean = np.mean(increments)
            inc_std = np.std(increments)

            if inc_std > 0:
                current_increment = bid_amount - amounts[-1]
                inc_z = (current_increment - inc_mean) / inc_std
                amount_z = (bid_amount - mean) / std
                # Return the worse of the two
                return max(abs(amount_z), abs(inc_z)) * np.sign(inc_z) if abs(inc_z) > abs(amount_z) else amount_z

        return (bid_amount - mean) / std

    def _check_bid_velocity(self, bidder_id: str, auction_id: str) -> int:
        """Count bids from this bidder in the last 5 minutes."""
        five_min_ago = datetime.now(timezone.utc) - timedelta(minutes=5)

        result = execute_query_one(
            """
            SELECT COUNT(*) as cnt
            FROM bids
            WHERE user_id = %s AND auction_id = %s
                  AND created_at >= %s AND is_retracted = false
            """,
            (bidder_id, auction_id, five_min_ago),
        )

        return int(result["cnt"]) if result else 0

    def _get_account_age(self, user_id: str) -> float | None:
        """Get user account age in days."""
        user = execute_query_one(
            "SELECT created_at FROM users WHERE id = %s",
            (user_id,),
        )

        if not user:
            return None

        created = user["created_at"]
        if hasattr(created, 'tzinfo') and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = now - created
        return delta.total_seconds() / 86400

    def _get_bidder_stats(self, bidder_id: str) -> dict:
        """Get bidder's historical statistics."""
        result = execute_query_one(
            """
            SELECT COUNT(*) as total_bids,
                   COUNT(DISTINCT auction_id) as unique_auctions,
                   SUM(CASE WHEN is_winning THEN 1 ELSE 0 END) as winning_bids
            FROM bids
            WHERE user_id = %s AND is_retracted = false
            """,
            (bidder_id,),
        )

        if not result:
            return {"total_bids": 0, "unique_auctions": 0, "winning_bids": 0}

        return {
            "total_bids": int(result["total_bids"]),
            "unique_auctions": int(result["unique_auctions"]),
            "winning_bids": int(result["winning_bids"] or 0),
        }

    def _get_same_seller_ratio(self, bidder_id: str, auction_id: str) -> float:
        """
        Calculate what ratio of the bidder's total bids are on auctions
        by the same seller.
        """
        seller_info = execute_query_one(
            "SELECT created_by FROM auctions WHERE id = %s",
            (auction_id,),
        )

        if not seller_info:
            return 0.0

        seller_id = seller_info["created_by"]

        result = execute_query_one(
            """
            SELECT
                COUNT(*) as total_bids,
                SUM(CASE WHEN a.created_by = %s THEN 1 ELSE 0 END) as seller_bids
            FROM bids b
            JOIN auctions a ON a.id = b.auction_id
            WHERE b.user_id = %s AND b.is_retracted = false
            """,
            (seller_id, bidder_id),
        )

        if not result or int(result["total_bids"]) == 0:
            return 0.0

        return int(result["seller_bids"] or 0) / int(result["total_bids"])

    def _check_ip_match(
        self, auction_id: str, bidder_id: str, ip_address: str
    ) -> int:
        """Check if other bidders on this auction share the same IP."""
        result = execute_query_one(
            """
            SELECT COUNT(DISTINCT user_id) as cnt
            FROM bids
            WHERE auction_id = %s
                  AND user_id != %s
                  AND ip_address = %s
                  AND is_retracted = false
            """,
            (auction_id, bidder_id, ip_address),
        )

        return int(result["cnt"]) if result else 0

    def _check_device_match(
        self, auction_id: str, bidder_id: str, device_fingerprint: str
    ) -> int:
        """Check if other bidders on this auction share the same device fingerprint."""
        result = execute_query_one(
            """
            SELECT COUNT(DISTINCT user_id) as cnt
            FROM bids
            WHERE auction_id = %s
                  AND user_id != %s
                  AND device_fingerprint = %s
                  AND is_retracted = false
            """,
            (auction_id, bidder_id, device_fingerprint),
        )

        return int(result["cnt"]) if result else 0

    def _determine_risk_level(self, score: float) -> str:
        """Map risk score to risk level."""
        if score >= self.RISK_THRESHOLDS["critical"]:
            return "critical"
        if score >= self.RISK_THRESHOLDS["high"]:
            return "high"
        if score >= self.RISK_THRESHOLDS["medium"]:
            return "medium"
        if score >= self.RISK_THRESHOLDS["low"]:
            return "low"
        return "minimal"

    def _get_recommendation(self, risk_level: str) -> str:
        """Get recommended action based on risk level."""
        recommendations = {
            "minimal": "allow",
            "low": "allow_with_monitoring",
            "medium": "require_additional_verification",
            "high": "block_and_review",
            "critical": "block_immediately",
        }
        return recommendations.get(risk_level, "allow")
