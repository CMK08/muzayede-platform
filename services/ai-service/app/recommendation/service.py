"""
Recommendation engine -- hybrid collaborative + content-based filtering.

Collaborative filtering:
    Build a sparse user-item interaction matrix from bids, purchases, and
    favourites.  Compute pairwise cosine similarity between the target user
    and all other users, then score candidate items by the weighted sum of
    similar-user interactions.

Content-based filtering:
    Build TF-IDF vectors from product titles + descriptions.  Given the set
    of products the user has interacted with, compute an averaged "profile"
    vector and rank candidates by cosine similarity to that profile.
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.database import execute_query, execute_query_one

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Interaction weights (used when constructing the user-item matrix)
# ---------------------------------------------------------------------------
WEIGHT_PURCHASE = 5.0
WEIGHT_BID = 3.0
WEIGHT_FAVOURITE = 1.0

# Hybrid blend ratio
COLLABORATIVE_WEIGHT = 0.6
CONTENT_WEIGHT = 0.4

# Upper bound on neighbours / candidates to keep queries tractable
MAX_SIMILAR_USERS = 80
MAX_CANDIDATE_PRODUCTS = 500


class RecommendationService:
    """Hybrid recommendation system combining collaborative and content-based filtering."""

    def __init__(self) -> None:
        self._tfidf: Optional[TfidfVectorizer] = None
        self._tfidf_matrix = None
        self._tfidf_product_ids: list[str] = []
        self.algorithm = "hybrid_cosine_tfidf"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_recommendations(self, user_id: str, limit: int = 10) -> dict:
        """Return *limit* personalised product recommendations for *user_id*."""
        logger.info("Generating recommendations for user=%s limit=%d", user_id, limit)

        user = execute_query_one("SELECT id FROM users WHERE id = %s", (user_id,))
        if not user:
            return self._empty_response(user_id, error="User not found")

        user_history = self._load_user_history(user_id)
        exclude_ids = (
            set(user_history["purchased_product_ids"])
            | set(user_history["bid_product_ids"])
        )

        # --- Collaborative filtering (cosine similarity on interaction matrix) ---
        cf_scores = self._collaborative_filter(user_id, exclude_ids)

        # --- Content-based filtering (TF-IDF on descriptions) ---
        cb_scores = self._content_based_filter(user_history, exclude_ids)

        # --- Merge ---
        all_pids = set(cf_scores.keys()) | set(cb_scores.keys())
        hybrid: dict[str, float] = {}
        for pid in all_pids:
            hybrid[pid] = (
                COLLABORATIVE_WEIGHT * cf_scores.get(pid, 0.0)
                + CONTENT_WEIGHT * cb_scores.get(pid, 0.0)
            )

        ranked = sorted(hybrid.items(), key=lambda x: x[1], reverse=True)[:limit]
        recommendations = self._hydrate_products(ranked)

        return {
            "user_id": user_id,
            "recommendations": recommendations,
            "algorithm": self.algorithm,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    async def get_similar_products(self, product_id: str, limit: int = 6) -> dict:
        """Find products most similar to *product_id* via TF-IDF cosine similarity."""
        logger.info("Finding similar products for product=%s", product_id)

        product = execute_query_one(
            """
            SELECT p.id, p.title, p.short_description, p.category_id,
                   p.artist_id, p.condition, p.estimate_low, p.estimate_high
            FROM products p
            WHERE p.id = %s
            """,
            (product_id,),
        )
        if not product:
            return {
                "product_id": product_id,
                "similar_products": [],
                "algorithm": "tfidf_cosine",
            }

        # Ensure the TF-IDF index is built
        self._ensure_tfidf_index()

        if product_id not in self._tfidf_product_ids:
            # Product not in index -- fall back to attribute overlap
            return self._attribute_similarity(product, product_id, limit)

        idx = self._tfidf_product_ids.index(product_id)
        query_vec = self._tfidf_matrix[idx]
        sims = cosine_similarity(query_vec, self._tfidf_matrix).flatten()

        # Zero out self
        sims[idx] = -1.0

        top_indices = np.argsort(sims)[::-1][:limit * 3]

        candidates: list[tuple[str, float]] = []
        for i in top_indices:
            pid = self._tfidf_product_ids[i]
            if pid != product_id and sims[i] > 0.01:
                candidates.append((pid, float(sims[i])))
            if len(candidates) >= limit:
                break

        # Hydrate
        if not candidates:
            return {
                "product_id": product_id,
                "similar_products": [],
                "algorithm": "tfidf_cosine",
            }

        product_ids = [c[0] for c in candidates]
        placeholders = ", ".join(["%s"] * len(product_ids))
        rows = execute_query(
            f"""
            SELECT p.id, p.title, p.slug, p.short_description,
                   p.estimate_low, p.estimate_high,
                   c.name AS category_name,
                   a.name AS artist_name,
                   pm.url  AS image_url
            FROM products p
            LEFT JOIN categories c  ON p.category_id = c.id
            LEFT JOIN artists a     ON p.artist_id   = a.id
            LEFT JOIN product_media pm ON pm.product_id = p.id AND pm.is_primary = true
            WHERE p.id IN ({placeholders}) AND p.is_active = true
            """,
            tuple(product_ids),
        )
        pmap = {r["id"]: r for r in rows}

        similar: list[dict] = []
        for pid, score in candidates:
            if pid in pmap:
                p = pmap[pid]
                similar.append({
                    "product_id": p["id"],
                    "title": p["title"],
                    "slug": p["slug"],
                    "description": p["short_description"],
                    "image_url": p.get("image_url"),
                    "category": p.get("category_name"),
                    "artist": p.get("artist_name"),
                    "similarity_score": round(score, 4),
                })

        return {
            "product_id": product_id,
            "similar_products": similar[:limit],
            "algorithm": "tfidf_cosine",
        }

    # ------------------------------------------------------------------
    # Collaborative filtering (cosine similarity on user-item matrix)
    # ------------------------------------------------------------------

    def _collaborative_filter(
        self,
        user_id: str,
        exclude_ids: set[str],
    ) -> dict[str, float]:
        """
        Build a user-item interaction matrix from DB, compute cosine
        similarity between *user_id* and other users, and score products
        by the weighted sum of neighbour interactions.
        """
        # 1. Load all interactions
        interactions = execute_query(
            """
            SELECT user_id, product_id, interaction_type FROM (
                SELECT f.user_id, f.product_id, 'favourite' AS interaction_type
                FROM favorites f
                UNION ALL
                SELECT b.user_id, al.product_id, 'bid' AS interaction_type
                FROM bids b
                JOIN auction_lots al ON al.auction_id = b.auction_id
                WHERE b.is_retracted = false
                UNION ALL
                SELECT o.buyer_id AS user_id, al.product_id, 'purchase' AS interaction_type
                FROM orders o
                JOIN auction_lots al ON al.auction_id = o.auction_id
                WHERE o.status = 'COMPLETED'
            ) sub
            """
        )

        if not interactions:
            return {}

        # 2. Encode users and products to integer indices
        user_set: set[str] = set()
        product_set: set[str] = set()
        for row in interactions:
            user_set.add(row["user_id"])
            product_set.add(row["product_id"])

        if user_id not in user_set:
            return {}

        user_index = {uid: i for i, uid in enumerate(sorted(user_set))}
        product_index = {pid: i for i, pid in enumerate(sorted(product_set))}
        inv_product_index = {i: pid for pid, i in product_index.items()}

        n_users = len(user_index)
        n_products = len(product_index)

        # 3. Fill sparse matrix
        rows_list: list[int] = []
        cols_list: list[int] = []
        vals_list: list[float] = []

        weight_map = {
            "purchase": WEIGHT_PURCHASE,
            "bid": WEIGHT_BID,
            "favourite": WEIGHT_FAVOURITE,
        }

        for row in interactions:
            uid_idx = user_index[row["user_id"]]
            pid_idx = product_index[row["product_id"]]
            w = weight_map.get(row["interaction_type"], 1.0)
            rows_list.append(uid_idx)
            cols_list.append(pid_idx)
            vals_list.append(w)

        matrix = csr_matrix(
            (vals_list, (rows_list, cols_list)),
            shape=(n_users, n_products),
        )

        # 4. Compute cosine similarity between target user and everyone else
        target_idx = user_index[user_id]
        target_vec = matrix[target_idx]

        similarities = cosine_similarity(target_vec, matrix).flatten()
        similarities[target_idx] = -1.0  # exclude self

        top_neighbour_indices = np.argsort(similarities)[::-1][:MAX_SIMILAR_USERS]

        # 5. Score products by neighbour interactions weighted by similarity
        product_scores: dict[str, float] = defaultdict(float)
        for n_idx in top_neighbour_indices:
            sim = similarities[n_idx]
            if sim <= 0:
                continue
            neighbour_row = matrix[n_idx].toarray().flatten()
            for p_idx in np.nonzero(neighbour_row)[0]:
                pid = inv_product_index[int(p_idx)]
                if pid not in exclude_ids:
                    product_scores[pid] += sim * neighbour_row[p_idx]

        # 6. Normalise to [0, 1]
        if product_scores:
            max_val = max(product_scores.values())
            if max_val > 0:
                for pid in product_scores:
                    product_scores[pid] /= max_val

        return dict(product_scores)

    # ------------------------------------------------------------------
    # Content-based filtering (TF-IDF on product descriptions)
    # ------------------------------------------------------------------

    def _ensure_tfidf_index(self) -> None:
        """Build the TF-IDF matrix if it has not been built yet."""
        if self._tfidf_matrix is not None:
            return

        products = execute_query(
            """
            SELECT id, title, short_description
            FROM products
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (MAX_CANDIDATE_PRODUCTS,),
        )

        if not products:
            self._tfidf_product_ids = []
            return

        corpus: list[str] = []
        self._tfidf_product_ids = []
        for p in products:
            text = f"{p['title'] or ''} {p['title'] or ''} {p['short_description'] or ''}"
            corpus.append(text)
            self._tfidf_product_ids.append(p["id"])

        self._tfidf = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words=None,  # multilingual -- keep all tokens
            sublinear_tf=True,
        )
        self._tfidf_matrix = self._tfidf.fit_transform(corpus)
        logger.info(
            "TF-IDF index built: %d products, %d features",
            len(self._tfidf_product_ids),
            self._tfidf_matrix.shape[1],
        )

    def _content_based_filter(
        self,
        user_history: dict,
        exclude_ids: set[str],
    ) -> dict[str, float]:
        """
        Build a user "profile" vector by averaging TF-IDF vectors of
        products the user interacted with, then rank candidates by
        cosine similarity to that profile.
        """
        self._ensure_tfidf_index()
        if self._tfidf_matrix is None or not self._tfidf_product_ids:
            return {}

        interacted_ids = (
            set(user_history["purchased_product_ids"])
            | set(user_history["bid_product_ids"])
            | set(user_history.get("favorite_product_ids", []))
        )

        # Gather indices that belong to the user's history
        indices: list[int] = []
        for pid in interacted_ids:
            if pid in self._tfidf_product_ids:
                indices.append(self._tfidf_product_ids.index(pid))

        if not indices:
            return {}

        # Average profile vector
        profile_vec = self._tfidf_matrix[indices].mean(axis=0)
        # profile_vec is a matrix (1, n_features) -- convert for cosine_similarity
        profile_arr = np.asarray(profile_vec)

        sims = cosine_similarity(profile_arr, self._tfidf_matrix).flatten()

        scores: dict[str, float] = {}
        for i, sim in enumerate(sims):
            pid = self._tfidf_product_ids[i]
            if pid not in exclude_ids and sim > 0.01:
                scores[pid] = float(sim)

        # Normalise
        if scores:
            max_val = max(scores.values())
            if max_val > 0:
                for pid in scores:
                    scores[pid] /= max_val

        return scores

    # ------------------------------------------------------------------
    # Attribute-based fallback for similar products
    # ------------------------------------------------------------------

    def _attribute_similarity(
        self, product: dict, product_id: str, limit: int
    ) -> dict:
        """Fallback when product is not in the TF-IDF index."""
        candidates = execute_query(
            """
            SELECT p.id, p.title, p.slug, p.short_description,
                   p.category_id, p.artist_id, p.condition,
                   p.estimate_low, p.estimate_high,
                   c.name  AS category_name,
                   a.name  AS artist_name,
                   pm.url  AS image_url
            FROM products p
            LEFT JOIN categories c  ON p.category_id = c.id
            LEFT JOIN artists a     ON p.artist_id   = a.id
            LEFT JOIN product_media pm ON pm.product_id = p.id AND pm.is_primary = true
            WHERE p.id != %s AND p.is_active = true
            ORDER BY p.created_at DESC
            LIMIT 200
            """,
            (product_id,),
        )

        scored: list[dict] = []
        for c in candidates:
            score = 0.0
            if product["category_id"] and c["category_id"] == product["category_id"]:
                score += 0.4
            if product["artist_id"] and c["artist_id"] == product["artist_id"]:
                score += 0.3
            if c["condition"] == product["condition"]:
                score += 0.1
            if product["estimate_low"] and c["estimate_low"]:
                t_mid = (float(product["estimate_low"]) + float(product["estimate_high"] or product["estimate_low"])) / 2
                c_mid = (float(c["estimate_low"]) + float(c["estimate_high"] or c["estimate_low"])) / 2
                if t_mid > 0:
                    score += 0.2 * (min(c_mid, t_mid) / max(c_mid, t_mid))
            if score > 0:
                scored.append({
                    "product_id": c["id"],
                    "title": c["title"],
                    "slug": c["slug"],
                    "description": c["short_description"],
                    "image_url": c.get("image_url"),
                    "category": c.get("category_name"),
                    "artist": c.get("artist_name"),
                    "similarity_score": round(score, 4),
                })

        scored.sort(key=lambda x: x["similarity_score"], reverse=True)
        return {
            "product_id": product_id,
            "similar_products": scored[:limit],
            "algorithm": "attribute_overlap_fallback",
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _load_user_history(self, user_id: str) -> dict:
        """Load purchase / bid / favourite history for a user."""
        purchased = execute_query(
            """
            SELECT DISTINCT al.product_id
            FROM orders o
            JOIN auction_lots al ON al.auction_id = o.auction_id
            WHERE o.buyer_id = %s AND o.status = 'COMPLETED'
            """,
            (user_id,),
        )
        bid_products = execute_query(
            """
            SELECT DISTINCT al.product_id
            FROM bids b
            JOIN auction_lots al ON al.auction_id = b.auction_id
            WHERE b.user_id = %s
            """,
            (user_id,),
        )
        favourites = execute_query(
            "SELECT product_id FROM favorites WHERE user_id = %s",
            (user_id,),
        )

        return {
            "purchased_product_ids": [r["product_id"] for r in purchased],
            "bid_product_ids": [r["product_id"] for r in bid_products],
            "favorite_product_ids": [r["product_id"] for r in favourites],
        }

    def _hydrate_products(self, ranked: list[tuple[str, float]]) -> list[dict]:
        """Fetch full product rows for a ranked list of (product_id, score)."""
        if not ranked:
            return []

        product_ids = [r[0] for r in ranked]
        placeholders = ", ".join(["%s"] * len(product_ids))
        rows = execute_query(
            f"""
            SELECT p.id, p.title, p.slug, p.short_description,
                   p.estimate_low, p.estimate_high, p.condition,
                   c.name  AS category_name,
                   pm.url  AS image_url
            FROM products p
            LEFT JOIN categories c  ON p.category_id = c.id
            LEFT JOIN product_media pm ON pm.product_id = p.id AND pm.is_primary = true
            WHERE p.id IN ({placeholders}) AND p.is_active = true
            """,
            tuple(product_ids),
        )

        pmap = {r["id"]: r for r in rows}
        results: list[dict] = []
        for pid, score in ranked:
            if pid in pmap:
                p = pmap[pid]
                results.append({
                    "product_id": p["id"],
                    "title": p["title"],
                    "slug": p["slug"],
                    "description": p["short_description"],
                    "image_url": p.get("image_url"),
                    "category": p.get("category_name"),
                    "estimate_low": float(p["estimate_low"]) if p["estimate_low"] else None,
                    "estimate_high": float(p["estimate_high"]) if p["estimate_high"] else None,
                    "confidence": round(score, 4),
                })
        return results

    @staticmethod
    def _empty_response(user_id: str, error: str = "") -> dict:
        resp: dict = {
            "user_id": user_id,
            "recommendations": [],
            "algorithm": "hybrid_cosine_tfidf",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        if error:
            resp["error"] = error
        return resp
