"""Recommendation engine service using collaborative filtering and content-based methods."""

import logging
from datetime import datetime, timezone
from collections import defaultdict

import numpy as np

from app.database import execute_query, execute_query_one

logger = logging.getLogger(__name__)


class RecommendationService:
    """Hybrid recommendation system combining collaborative and content-based filtering."""

    COLLABORATIVE_WEIGHT = 0.6
    CONTENT_WEIGHT = 0.4

    def __init__(self):
        self.model_loaded = False
        self.algorithm = "hybrid_collaborative_content"

    async def get_recommendations(self, user_id: str, limit: int = 10) -> dict:
        """Generate personalized recommendations using hybrid approach."""
        logger.info(f"Generating recommendations for user: {user_id}, limit: {limit}")

        user = execute_query_one(
            'SELECT id FROM users WHERE id = %s', (user_id,)
        )
        if not user:
            return {
                "user_id": user_id,
                "recommendations": [],
                "algorithm": self.algorithm,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "error": "User not found",
            }

        user_history = self._get_user_history(user_id)
        purchased_ids = set(user_history["purchased_product_ids"])
        bid_product_ids = set(user_history["bid_product_ids"])
        exclude_ids = purchased_ids | bid_product_ids

        collaborative_scores = self._collaborative_filter(user_id, user_history, exclude_ids)
        content_scores = self._content_based_filter(user_id, user_history, exclude_ids)

        all_product_ids = set(collaborative_scores.keys()) | set(content_scores.keys())
        hybrid_scores = {}

        for pid in all_product_ids:
            cf_score = collaborative_scores.get(pid, 0.0)
            cb_score = content_scores.get(pid, 0.0)
            hybrid_scores[pid] = (
                self.COLLABORATIVE_WEIGHT * cf_score + self.CONTENT_WEIGHT * cb_score
            )

        ranked = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)[:limit]

        recommendations = []
        if ranked:
            product_ids = [r[0] for r in ranked]
            placeholders = ", ".join(["%s"] * len(product_ids))
            products = execute_query(
                f"""
                SELECT p.id, p.title, p.slug, p.short_description,
                       p.estimate_low, p.estimate_high, p.condition,
                       c.name as category_name,
                       pm.url as image_url
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_media pm ON pm.product_id = p.id AND pm.is_primary = true
                WHERE p.id IN ({placeholders}) AND p.is_active = true
                """,
                tuple(product_ids),
            )

            product_map = {p["id"]: p for p in products}
            for pid, score in ranked:
                if pid in product_map:
                    p = product_map[pid]
                    recommendations.append({
                        "product_id": p["id"],
                        "title": p["title"],
                        "slug": p["slug"],
                        "description": p["short_description"],
                        "image_url": p["image_url"],
                        "category": p["category_name"],
                        "estimate_low": float(p["estimate_low"]) if p["estimate_low"] else None,
                        "estimate_high": float(p["estimate_high"]) if p["estimate_high"] else None,
                        "confidence": round(score, 4),
                    })

        return {
            "user_id": user_id,
            "recommendations": recommendations,
            "algorithm": self.algorithm,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    async def get_similar_products(self, product_id: str, limit: int = 6) -> dict:
        """Find products similar to a given product using content-based features."""
        logger.info(f"Finding similar products for: {product_id}")

        product = execute_query_one(
            """
            SELECT p.id, p.title, p.category_id, p.artist_id, p.condition,
                   p.estimate_low, p.estimate_high
            FROM products p
            WHERE p.id = %s
            """,
            (product_id,),
        )

        if not product:
            return {
                "product_id": product_id,
                "similar_products": [],
                "algorithm": "content_feature_overlap",
            }

        candidates = execute_query(
            """
            SELECT p.id, p.title, p.slug, p.short_description,
                   p.category_id, p.artist_id, p.condition,
                   p.estimate_low, p.estimate_high,
                   c.name as category_name,
                   a.name as artist_name,
                   pm.url as image_url
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN artists a ON p.artist_id = a.id
            LEFT JOIN product_media pm ON pm.product_id = p.id AND pm.is_primary = true
            WHERE p.id != %s AND p.is_active = true
            ORDER BY p.created_at DESC
            LIMIT 200
            """,
            (product_id,),
        )

        scored_candidates = []
        for candidate in candidates:
            score = 0.0

            if product["category_id"] and candidate["category_id"] == product["category_id"]:
                score += 0.4

            if product["artist_id"] and candidate["artist_id"] == product["artist_id"]:
                score += 0.3

            if candidate["condition"] == product["condition"]:
                score += 0.1

            if product["estimate_low"] and candidate["estimate_low"]:
                target_low = float(product["estimate_low"])
                target_high = float(product["estimate_high"] or target_low * 2)
                cand_low = float(candidate["estimate_low"])
                cand_high = float(candidate["estimate_high"] or cand_low * 2)

                target_mid = (target_low + target_high) / 2
                cand_mid = (cand_low + cand_high) / 2

                if target_mid > 0:
                    price_ratio = min(cand_mid, target_mid) / max(cand_mid, target_mid)
                    score += 0.2 * price_ratio

            if score > 0:
                scored_candidates.append({
                    "product_id": candidate["id"],
                    "title": candidate["title"],
                    "slug": candidate["slug"],
                    "description": candidate["short_description"],
                    "image_url": candidate["image_url"],
                    "category": candidate["category_name"],
                    "artist": candidate["artist_name"],
                    "similarity_score": round(score, 4),
                })

        scored_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)

        return {
            "product_id": product_id,
            "similar_products": scored_candidates[:limit],
            "algorithm": "content_feature_overlap",
        }

    def _get_user_history(self, user_id: str) -> dict:
        """Get user's purchase and bid history from database."""
        purchased = execute_query(
            """
            SELECT DISTINCT al.product_id
            FROM orders o
            JOIN auction_lots al ON al.auction_id = o.auction_id
            WHERE o.buyer_id = %s AND o.status = 'COMPLETED'
            """,
            (user_id,),
        )
        purchased_product_ids = [r["product_id"] for r in purchased]

        bid_products = execute_query(
            """
            SELECT DISTINCT al.product_id
            FROM bids b
            JOIN auction_lots al ON al.auction_id = b.auction_id
            WHERE b.user_id = %s
            """,
            (user_id,),
        )
        bid_product_ids = [r["product_id"] for r in bid_products]

        favorites = execute_query(
            "SELECT product_id FROM favorites WHERE user_id = %s",
            (user_id,),
        )
        favorite_product_ids = [r["product_id"] for r in favorites]

        all_ids = set(purchased_product_ids + bid_product_ids + favorite_product_ids)
        categories = []
        artists = []
        price_ranges = []

        if all_ids:
            placeholders = ", ".join(["%s"] * len(all_ids))
            products = execute_query(
                f"""
                SELECT category_id, artist_id, estimate_low, estimate_high
                FROM products WHERE id IN ({placeholders})
                """,
                tuple(all_ids),
            )
            categories = [p["category_id"] for p in products if p["category_id"]]
            artists = [p["artist_id"] for p in products if p["artist_id"]]
            price_ranges = [
                (float(p["estimate_low"]), float(p["estimate_high"] or p["estimate_low"]))
                for p in products
                if p["estimate_low"]
            ]

        return {
            "purchased_product_ids": purchased_product_ids,
            "bid_product_ids": bid_product_ids,
            "favorite_product_ids": favorite_product_ids,
            "preferred_categories": categories,
            "preferred_artists": artists,
            "price_ranges": price_ranges,
        }

    def _collaborative_filter(
        self, user_id: str, user_history: dict, exclude_ids: set
    ) -> dict[str, float]:
        """
        Collaborative filtering: find users with similar behavior and recommend
        what they purchased/bid on.
        """
        all_interacted = (
            set(user_history["purchased_product_ids"])
            | set(user_history["bid_product_ids"])
            | set(user_history["favorite_product_ids"])
        )

        if not all_interacted:
            return {}

        placeholders = ", ".join(["%s"] * len(all_interacted))

        similar_users = execute_query(
            f"""
            SELECT user_id, COUNT(DISTINCT product_id) as overlap_count
            FROM (
                SELECT f.user_id, f.product_id FROM favorites f
                WHERE f.product_id IN ({placeholders}) AND f.user_id != %s
                UNION ALL
                SELECT b.user_id, al.product_id
                FROM bids b
                JOIN auction_lots al ON al.auction_id = b.auction_id
                WHERE al.product_id IN ({placeholders}) AND b.user_id != %s
            ) interactions
            GROUP BY user_id
            HAVING COUNT(DISTINCT product_id) >= 2
            ORDER BY overlap_count DESC
            LIMIT 50
            """,
            tuple(all_interacted) + (user_id,) + tuple(all_interacted) + (user_id,),
        )

        if not similar_users:
            return {}

        similar_user_ids = [u["user_id"] for u in similar_users]
        similarity_scores = {
            u["user_id"]: u["overlap_count"] / max(len(all_interacted), 1)
            for u in similar_users
        }

        su_placeholders = ", ".join(["%s"] * len(similar_user_ids))

        their_products = execute_query(
            f"""
            SELECT user_id, product_id FROM (
                SELECT f.user_id, f.product_id FROM favorites f
                WHERE f.user_id IN ({su_placeholders})
                UNION ALL
                SELECT b.user_id, al.product_id
                FROM bids b
                JOIN auction_lots al ON al.auction_id = b.auction_id
                WHERE b.user_id IN ({su_placeholders})
                UNION ALL
                SELECT o.buyer_id as user_id, al.product_id
                FROM orders o
                JOIN auction_lots al ON al.auction_id = o.auction_id
                WHERE o.buyer_id IN ({su_placeholders}) AND o.status = 'COMPLETED'
            ) sub
            """,
            tuple(similar_user_ids) * 3,
        )

        product_scores: dict[str, float] = defaultdict(float)
        for row in their_products:
            pid = row["product_id"]
            uid = row["user_id"]
            if pid not in exclude_ids:
                product_scores[pid] += similarity_scores.get(uid, 0)

        if product_scores:
            max_score = max(product_scores.values())
            if max_score > 0:
                for pid in product_scores:
                    product_scores[pid] /= max_score

        return dict(product_scores)

    def _content_based_filter(
        self, user_id: str, user_history: dict, exclude_ids: set
    ) -> dict[str, float]:
        """
        Content-based filtering: recommend products with similar attributes
        to what the user has interacted with.
        """
        categories = user_history["preferred_categories"]
        artists = user_history["preferred_artists"]
        price_ranges = user_history["price_ranges"]

        if not categories and not artists:
            return {}

        cat_counts = defaultdict(int)
        for cat in categories:
            cat_counts[cat] += 1

        artist_counts = defaultdict(int)
        for art in artists:
            artist_counts[art] += 1

        avg_low = 0.0
        avg_high = 0.0
        if price_ranges:
            avg_low = sum(pr[0] for pr in price_ranges) / len(price_ranges)
            avg_high = sum(pr[1] for pr in price_ranges) / len(price_ranges)

        candidates = execute_query(
            """
            SELECT id, category_id, artist_id, estimate_low, estimate_high
            FROM products
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT 500
            """,
        )

        scores: dict[str, float] = {}
        total_interactions = len(categories) + len(artists)

        for product in candidates:
            pid = product["id"]
            if pid in exclude_ids:
                continue

            score = 0.0

            if product["category_id"] and product["category_id"] in cat_counts:
                cat_weight = cat_counts[product["category_id"]] / max(total_interactions, 1)
                score += 0.5 * cat_weight

            if product["artist_id"] and product["artist_id"] in artist_counts:
                art_weight = artist_counts[product["artist_id"]] / max(total_interactions, 1)
                score += 0.3 * art_weight

            if price_ranges and product["estimate_low"]:
                p_low = float(product["estimate_low"])
                p_high = float(product["estimate_high"] or p_low * 2)
                p_mid = (p_low + p_high) / 2
                avg_mid = (avg_low + avg_high) / 2

                if avg_mid > 0:
                    ratio = min(p_mid, avg_mid) / max(p_mid, avg_mid)
                    score += 0.2 * ratio

            if score > 0:
                scores[pid] = score

        if scores:
            max_score = max(scores.values())
            if max_score > 0:
                for pid in scores:
                    scores[pid] /= max_score

        return scores
