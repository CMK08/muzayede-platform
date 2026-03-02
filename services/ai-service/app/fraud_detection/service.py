"""
Shill-bidding / fraud detection using Isolation Forest anomaly detection.

For each auction the service:
  1. Loads the full bid history from PostgreSQL.
  2. Engineers per-bidder features:
       - bid_count               total bids in this auction
       - avg_increment           mean bid increment (relative to previous bid)
       - avg_time_gap            mean seconds between consecutive bids
       - min_time_gap            fastest consecutive bids
       - last_minute_ratio       fraction of bids placed in the final 10 % of auction duration
       - bid_amount_stddev       standard deviation of this bidder's amounts
       - account_age_days        bidder account age
       - seller_bid_ratio        fraction of all bidder's bids on the same seller's auctions
       - ip_cluster_size         number of distinct bidders sharing the same IP on this auction
  3. Fits an Isolation Forest on the per-bidder feature matrix.
  4. Returns an anomaly score per bidder plus an overall auction risk assessment.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.database import execute_query, execute_query_one

logger = logging.getLogger(__name__)

# Isolation Forest hyper-parameters
IF_CONTAMINATION = 0.1  # expected fraction of outliers
IF_N_ESTIMATORS = 100
IF_RANDOM_STATE = 42

# Risk thresholds on the final auction-level score
RISK_THRESHOLDS = {
    "minimal": 0.0,
    "low": 0.25,
    "medium": 0.50,
    "high": 0.75,
    "critical": 0.90,
}

FEATURE_NAMES = [
    "bid_count",
    "avg_increment",
    "avg_time_gap_sec",
    "min_time_gap_sec",
    "last_minute_ratio",
    "bid_amount_stddev",
    "account_age_days",
    "seller_bid_ratio",
    "ip_cluster_size",
]


class FraudDetectionService:
    """Isolation-Forest-based shill bidding detection."""

    def __init__(self) -> None:
        self._scaler = StandardScaler()
        logger.info("FraudDetectionService initialised")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def analyze_auction(self, auction_id: str) -> dict:
        """
        Analyse an auction for shill-bidding patterns.

        Returns per-bidder anomaly details and an overall auction risk score.
        """
        logger.info("Analysing auction %s for fraud", auction_id)

        # 1. Fetch auction metadata
        auction = execute_query_one(
            """
            SELECT id, created_by AS seller_id, start_time, end_time
            FROM auctions
            WHERE id = %s
            """,
            (auction_id,),
        )
        if not auction:
            return self._error_response(auction_id, "Auction not found")

        seller_id: str = auction["seller_id"]

        # 2. Fetch all bids for the auction
        bids = execute_query(
            """
            SELECT b.id, b.user_id, CAST(b.amount AS FLOAT) AS amount,
                   b.created_at, b.ip_address, b.device_fingerprint
            FROM bids b
            WHERE b.auction_id = %s AND b.is_retracted = false
            ORDER BY b.created_at ASC
            """,
            (auction_id,),
        )

        if len(bids) < 4:
            return {
                "auction_id": auction_id,
                "risk_score": 0.0,
                "risk_level": "minimal",
                "bidder_count": len(set(b["user_id"] for b in bids)),
                "bid_count": len(bids),
                "suspicious_bidders": [],
                "recommendation": "allow",
                "message": "Too few bids for anomaly detection",
            }

        # 3. Engineer per-bidder features
        features_by_bidder = self._engineer_features(
            bids, auction, seller_id
        )

        if len(features_by_bidder) < 3:
            return {
                "auction_id": auction_id,
                "risk_score": 0.0,
                "risk_level": "minimal",
                "bidder_count": len(features_by_bidder),
                "bid_count": len(bids),
                "suspicious_bidders": [],
                "recommendation": "allow",
                "message": "Too few distinct bidders for anomaly detection",
            }

        # 4. Build feature matrix
        bidder_ids = list(features_by_bidder.keys())
        X = np.array([features_by_bidder[uid] for uid in bidder_ids])

        # 5. Scale
        X_scaled = self._scaler.fit_transform(X)

        # 6. Fit Isolation Forest
        contamination = min(IF_CONTAMINATION, (len(bidder_ids) - 1) / len(bidder_ids))
        iso = IsolationForest(
            n_estimators=IF_N_ESTIMATORS,
            contamination=contamination,
            random_state=IF_RANDOM_STATE,
        )
        iso.fit(X_scaled)

        # decision_function: the lower the score, the more abnormal
        raw_scores = iso.decision_function(X_scaled)
        predictions = iso.predict(X_scaled)  # -1 = anomaly, 1 = normal

        # Convert raw_scores to [0, 1] anomaly scores (higher = more anomalous)
        # decision_function values typically range from -0.5 (anomaly) to 0.5 (normal)
        anomaly_scores = self._normalise_scores(raw_scores)

        # 7. Build per-bidder results
        suspicious_bidders: list[dict] = []
        for i, uid in enumerate(bidder_ids):
            is_anomaly = int(predictions[i]) == -1
            score = float(anomaly_scores[i])
            factors = self._explain_factors(uid, features_by_bidder[uid], X_scaled[i])

            if is_anomaly or score > 0.5:
                suspicious_bidders.append({
                    "bidder_id": uid,
                    "anomaly_score": round(score, 4),
                    "is_anomaly": is_anomaly,
                    "risk_factors": factors,
                    "features": {
                        name: round(float(features_by_bidder[uid][j]), 4)
                        for j, name in enumerate(FEATURE_NAMES)
                    },
                })

        suspicious_bidders.sort(key=lambda x: x["anomaly_score"], reverse=True)

        # 8. Auction-level risk score: max bidder score, boosted if many anomalies
        if suspicious_bidders:
            max_score = suspicious_bidders[0]["anomaly_score"]
            anomaly_ratio = sum(1 for s in suspicious_bidders if s["is_anomaly"]) / len(bidder_ids)
            auction_risk = min(max_score + 0.15 * anomaly_ratio, 1.0)
        else:
            auction_risk = 0.0

        risk_level = self._risk_level(auction_risk)

        return {
            "auction_id": auction_id,
            "risk_score": round(auction_risk, 4),
            "risk_level": risk_level,
            "bidder_count": len(bidder_ids),
            "bid_count": len(bids),
            "suspicious_bidders": suspicious_bidders,
            "recommendation": self._recommendation(risk_level),
            "model": {
                "type": "IsolationForest",
                "n_estimators": IF_N_ESTIMATORS,
                "contamination": round(contamination, 4),
                "features": FEATURE_NAMES,
            },
        }

    # ------------------------------------------------------------------
    # Single bid quick-check (lightweight, no IF fitting)
    # ------------------------------------------------------------------

    async def analyze_bid(self, bid_data: dict) -> dict:
        """Quick heuristic check for a single incoming bid (used at bid-time)."""
        logger.info("Quick-check bid: auction=%s bidder=%s",
                     bid_data.get("auction_id"), bid_data.get("bidder_id"))

        risk_score = 0.0
        risk_factors: list[str] = []

        auction_id = bid_data.get("auction_id", "")
        bidder_id = bid_data.get("bidder_id", "")
        bid_amount = float(bid_data.get("bid_amount", 0))
        bidder_ip = bid_data.get("bidder_ip")

        # Z-score on bid amount
        z = self._bid_amount_zscore(auction_id, bid_amount)
        if abs(z) > 3.0:
            risk_score += 0.25
            risk_factors.append(f"BID_AMOUNT_OUTLIER (z={z:.2f})")
        elif abs(z) > 2.0:
            risk_score += 0.10
            risk_factors.append(f"BID_AMOUNT_UNUSUAL (z={z:.2f})")

        # Velocity
        velocity = self._bid_velocity(bidder_id, auction_id)
        if velocity > 10:
            risk_score += 0.20
            risk_factors.append(f"HIGH_VELOCITY ({velocity}/5min)")
        elif velocity > 5:
            risk_score += 0.08
            risk_factors.append(f"ELEVATED_VELOCITY ({velocity}/5min)")

        # Account age
        age = self._account_age(bidder_id)
        if age is not None and age < 1:
            risk_score += 0.15
            risk_factors.append(f"NEW_ACCOUNT ({age:.1f}d)")
        elif age is not None and age < 7:
            risk_score += 0.05
            risk_factors.append(f"YOUNG_ACCOUNT ({age:.1f}d)")

        # IP overlap
        if bidder_ip:
            ip_others = self._ip_overlap(auction_id, bidder_id, bidder_ip)
            if ip_others > 0:
                risk_score += 0.30
                risk_factors.append(f"IP_MATCH ({ip_others} other bidders)")

        risk_score = min(risk_score, 1.0)
        risk_level = self._risk_level(risk_score)

        return {
            "risk_score": round(risk_score, 4),
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "is_suspicious": risk_score >= RISK_THRESHOLDS["medium"],
            "recommendation": self._recommendation(risk_level),
        }

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------

    def _engineer_features(
        self,
        bids: list[dict],
        auction: dict,
        seller_id: str,
    ) -> dict[str, np.ndarray]:
        """Build a feature vector for each distinct bidder."""
        # Group bids by bidder
        bidder_bids: dict[str, list[dict]] = defaultdict(list)
        for b in bids:
            bidder_bids[b["user_id"]].append(b)

        # Auction duration in seconds
        start = auction.get("start_time")
        end = auction.get("end_time")
        if start and end:
            duration_sec = max((end - start).total_seconds(), 1.0)
        else:
            duration_sec = 86400.0  # default 24h

        last_10pct = duration_sec * 0.9  # threshold for "last minute" bids

        # Ordered amounts for increment calculation
        all_amounts = [float(b["amount"]) for b in bids]

        # Account ages (batch)
        all_user_ids = list(bidder_bids.keys())
        account_ages = self._batch_account_ages(all_user_ids)

        # Seller bid ratios (batch)
        seller_ratios = self._batch_seller_ratios(all_user_ids, seller_id)

        # IP clusters
        ip_clusters = self._ip_cluster_sizes(bids)

        features: dict[str, np.ndarray] = {}

        for uid, user_bids in bidder_bids.items():
            user_bids_sorted = sorted(user_bids, key=lambda x: x["created_at"])
            amounts = [float(b["amount"]) for b in user_bids_sorted]
            times = [b["created_at"] for b in user_bids_sorted]

            # bid_count
            bid_count = len(amounts)

            # avg_increment (relative to previous auction bid, not just this user's)
            increments = []
            for b in user_bids_sorted:
                idx = all_amounts.index(float(b["amount"]))
                if idx > 0:
                    increments.append(float(b["amount"]) - all_amounts[idx - 1])
            avg_increment = float(np.mean(increments)) if increments else 0.0

            # Time gaps
            time_gaps = []
            for j in range(1, len(times)):
                gap = (times[j] - times[j - 1]).total_seconds()
                time_gaps.append(gap)
            avg_time_gap = float(np.mean(time_gaps)) if time_gaps else duration_sec
            min_time_gap = float(min(time_gaps)) if time_gaps else duration_sec

            # Last-minute ratio
            if start:
                late_bids = sum(
                    1 for t in times
                    if (t - start).total_seconds() >= last_10pct
                )
                last_minute_ratio = late_bids / max(bid_count, 1)
            else:
                last_minute_ratio = 0.0

            # Bid amount stddev
            bid_stddev = float(np.std(amounts)) if len(amounts) > 1 else 0.0

            # Account age
            age = account_ages.get(uid, 365.0)

            # Seller ratio
            seller_ratio = seller_ratios.get(uid, 0.0)

            # IP cluster
            ip_addr = user_bids_sorted[0].get("ip_address", "")
            ip_cluster = ip_clusters.get(ip_addr, 1) if ip_addr else 1

            features[uid] = np.array([
                bid_count,
                avg_increment,
                avg_time_gap,
                min_time_gap,
                last_minute_ratio,
                bid_stddev,
                age,
                seller_ratio,
                ip_cluster,
            ], dtype=np.float64)

        return features

    # ------------------------------------------------------------------
    # Batch DB lookups for feature engineering
    # ------------------------------------------------------------------

    def _batch_account_ages(self, user_ids: list[str]) -> dict[str, float]:
        if not user_ids:
            return {}
        ph = ", ".join(["%s"] * len(user_ids))
        rows = execute_query(
            f"SELECT id, created_at FROM users WHERE id IN ({ph})",
            tuple(user_ids),
        )
        now = datetime.now(timezone.utc)
        result: dict[str, float] = {}
        for r in rows:
            created = r["created_at"]
            if hasattr(created, "tzinfo") and created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            result[r["id"]] = max((now - created).total_seconds() / 86400, 0.0)
        return result

    def _batch_seller_ratios(
        self, user_ids: list[str], seller_id: str
    ) -> dict[str, float]:
        if not user_ids:
            return {}
        ph = ", ".join(["%s"] * len(user_ids))
        rows = execute_query(
            f"""
            SELECT b.user_id,
                   COUNT(*) AS total,
                   SUM(CASE WHEN a.created_by = %s THEN 1 ELSE 0 END) AS seller_bids
            FROM bids b
            JOIN auctions a ON a.id = b.auction_id
            WHERE b.user_id IN ({ph}) AND b.is_retracted = false
            GROUP BY b.user_id
            """,
            (seller_id,) + tuple(user_ids),
        )
        result: dict[str, float] = {}
        for r in rows:
            total = int(r["total"])
            seller = int(r["seller_bids"] or 0)
            result[r["user_id"]] = seller / max(total, 1)
        return result

    @staticmethod
    def _ip_cluster_sizes(bids: list[dict]) -> dict[str, int]:
        """Count distinct bidders per IP address within this auction."""
        ip_users: dict[str, set[str]] = defaultdict(set)
        for b in bids:
            ip = b.get("ip_address")
            if ip:
                ip_users[ip].add(b["user_id"])
        return {ip: len(users) for ip, users in ip_users.items()}

    # ------------------------------------------------------------------
    # Score normalisation & explanation
    # ------------------------------------------------------------------

    @staticmethod
    def _normalise_scores(raw: np.ndarray) -> np.ndarray:
        """Map Isolation Forest decision_function values to [0, 1] anomaly scores."""
        # decision_function: large positive = normal, large negative = anomaly
        # We invert and shift so that 1 = most anomalous, 0 = most normal
        if raw.max() == raw.min():
            return np.zeros_like(raw)
        normalised = (raw.max() - raw) / (raw.max() - raw.min())
        return np.clip(normalised, 0.0, 1.0)

    @staticmethod
    def _explain_factors(
        bidder_id: str, raw_features: np.ndarray, scaled_features: np.ndarray
    ) -> list[str]:
        """Generate human-readable risk factor descriptions."""
        factors: list[str] = []
        bid_count = raw_features[0]
        avg_time_gap = raw_features[2]
        min_time_gap = raw_features[3]
        last_minute_ratio = raw_features[4]
        account_age = raw_features[6]
        seller_ratio = raw_features[7]
        ip_cluster = raw_features[8]

        if bid_count > 15:
            factors.append(f"HIGH_BID_COUNT ({int(bid_count)} bids)")
        if avg_time_gap < 30:
            factors.append(f"RAPID_BIDDING (avg {avg_time_gap:.0f}s between bids)")
        if min_time_gap < 5:
            factors.append(f"SUSPICIOUSLY_FAST (min {min_time_gap:.1f}s gap)")
        if last_minute_ratio > 0.6:
            factors.append(f"LAST_MINUTE_SNIPER ({last_minute_ratio:.0%} late bids)")
        if account_age < 3:
            factors.append(f"NEW_ACCOUNT ({account_age:.1f} days)")
        if seller_ratio > 0.7:
            factors.append(f"SELLER_CONCENTRATION ({seller_ratio:.0%} bids on same seller)")
        if ip_cluster > 1:
            factors.append(f"SHARED_IP ({int(ip_cluster)} bidders on same IP)")
        return factors

    # ------------------------------------------------------------------
    # Quick-check helpers (single bid)
    # ------------------------------------------------------------------

    def _bid_amount_zscore(self, auction_id: str, amount: float) -> float:
        rows = execute_query(
            """
            SELECT CAST(amount AS FLOAT) AS amount FROM bids
            WHERE auction_id = %s AND is_retracted = false
            ORDER BY created_at
            """,
            (auction_id,),
        )
        if len(rows) < 3:
            return 0.0
        amounts = np.array([r["amount"] for r in rows])
        std = float(np.std(amounts))
        if std == 0:
            return 0.0
        return float((amount - np.mean(amounts)) / std)

    def _bid_velocity(self, bidder_id: str, auction_id: str) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        row = execute_query_one(
            """
            SELECT COUNT(*) AS cnt FROM bids
            WHERE user_id = %s AND auction_id = %s AND created_at >= %s AND is_retracted = false
            """,
            (bidder_id, auction_id, cutoff),
        )
        return int(row["cnt"]) if row else 0

    def _account_age(self, user_id: str) -> Optional[float]:
        row = execute_query_one("SELECT created_at FROM users WHERE id = %s", (user_id,))
        if not row:
            return None
        created = row["created_at"]
        if hasattr(created, "tzinfo") and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        return max((datetime.now(timezone.utc) - created).total_seconds() / 86400, 0.0)

    def _ip_overlap(self, auction_id: str, bidder_id: str, ip: str) -> int:
        row = execute_query_one(
            """
            SELECT COUNT(DISTINCT user_id) AS cnt FROM bids
            WHERE auction_id = %s AND user_id != %s AND ip_address = %s AND is_retracted = false
            """,
            (auction_id, bidder_id, ip),
        )
        return int(row["cnt"]) if row else 0

    # ------------------------------------------------------------------
    # Risk level mapping
    # ------------------------------------------------------------------

    @staticmethod
    def _risk_level(score: float) -> str:
        if score >= RISK_THRESHOLDS["critical"]:
            return "critical"
        if score >= RISK_THRESHOLDS["high"]:
            return "high"
        if score >= RISK_THRESHOLDS["medium"]:
            return "medium"
        if score >= RISK_THRESHOLDS["low"]:
            return "low"
        return "minimal"

    @staticmethod
    def _recommendation(level: str) -> str:
        return {
            "minimal": "allow",
            "low": "allow_with_monitoring",
            "medium": "require_additional_verification",
            "high": "block_and_review",
            "critical": "block_immediately",
        }.get(level, "allow")

    @staticmethod
    def _error_response(auction_id: str, message: str) -> dict:
        return {
            "auction_id": auction_id,
            "risk_score": 0.0,
            "risk_level": "unknown",
            "bidder_count": 0,
            "bid_count": 0,
            "suspicious_bidders": [],
            "recommendation": "manual_review",
            "error": message,
        }
