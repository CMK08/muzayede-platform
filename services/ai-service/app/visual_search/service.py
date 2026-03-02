"""
Visual similarity search powered by CLIP (openai/clip-vit-base-patch32).

The service lazy-loads the CLIP model via ``sentence-transformers`` on first
use, encodes uploaded or URL-referenced images into 512-d embedding vectors,
and finds similar products by cosine distance against a pre-built product
embedding index.
"""

import base64
import io
import logging
import os
import threading
from typing import Optional
from urllib.request import urlopen, Request

import numpy as np
from PIL import Image
from sklearn.metrics.pairwise import cosine_similarity

from app.database import execute_query

logger = logging.getLogger(__name__)

CLIP_MODEL_NAME = os.getenv("CLIP_MODEL", "clip-ViT-B-32")
MAX_INDEX_SIZE = int(os.getenv("VS_MAX_INDEX", "5000"))


class VisualSearchService:
    """CLIP-based visual similarity search."""

    def __init__(self) -> None:
        self._model = None
        self._model_lock = threading.Lock()

        # In-memory embedding index: product_id -> np.ndarray (512-d)
        self._index: dict[str, np.ndarray] = {}
        self._index_matrix: Optional[np.ndarray] = None
        self._index_ids: list[str] = []

        logger.info(
            "VisualSearchService created (model=%s, max_index=%d)",
            CLIP_MODEL_NAME,
            MAX_INDEX_SIZE,
        )

    # ------------------------------------------------------------------
    # Model loading (lazy, thread-safe)
    # ------------------------------------------------------------------

    def _ensure_model(self) -> None:
        """Load the CLIP model from sentence-transformers if not already loaded."""
        if self._model is not None:
            return
        with self._model_lock:
            if self._model is not None:
                return
            logger.info("Loading CLIP model: %s ...", CLIP_MODEL_NAME)
            from sentence_transformers import SentenceTransformer  # heavy import
            self._model = SentenceTransformer(CLIP_MODEL_NAME)
            logger.info("CLIP model loaded successfully")

    # ------------------------------------------------------------------
    # Image helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _load_image(source: str | bytes) -> Image.Image:
        """Load an image from raw bytes, base64, data-URI, or HTTP(S) URL."""
        if isinstance(source, bytes):
            return Image.open(io.BytesIO(source)).convert("RGB")

        if isinstance(source, str):
            if source.startswith("data:image"):
                _, data = source.split(",", 1)
                return Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")
            if source.startswith(("http://", "https://")):
                req = Request(source, headers={"User-Agent": "MuzayedeAI/1.0"})
                with urlopen(req, timeout=15) as resp:
                    return Image.open(io.BytesIO(resp.read())).convert("RGB")
            # assume base64 string
            return Image.open(io.BytesIO(base64.b64decode(source))).convert("RGB")

        raise ValueError(f"Unsupported image source type: {type(source)}")

    def _encode_image(self, image: Image.Image) -> np.ndarray:
        """Return a normalised 512-d CLIP embedding for *image*."""
        self._ensure_model()
        embedding = self._model.encode(image, convert_to_numpy=True)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding.astype(np.float32)

    # ------------------------------------------------------------------
    # Index management
    # ------------------------------------------------------------------

    def _rebuild_matrix(self) -> None:
        """Rebuild the dense matrix + id list used for batch cosine similarity."""
        if not self._index:
            self._index_matrix = None
            self._index_ids = []
            return
        self._index_ids = list(self._index.keys())
        self._index_matrix = np.vstack([self._index[pid] for pid in self._index_ids])

    async def _build_index_from_db(self) -> None:
        """Fetch product images from DB, encode with CLIP, and populate the index."""
        logger.info("Building visual search index from database ...")
        try:
            products = execute_query(
                """
                SELECT p.id, pm.url
                FROM products p
                JOIN product_media pm ON pm.product_id = p.id AND pm.is_primary = true
                WHERE p.is_active = true
                ORDER BY p.created_at DESC
                LIMIT %s
                """,
                (MAX_INDEX_SIZE,),
            )
        except Exception as exc:
            logger.warning("Could not load products for VS index: %s", exc)
            return

        indexed = 0
        for row in products:
            url = row.get("url")
            if not url or not url.startswith(("http://", "https://")):
                continue
            try:
                img = self._load_image(url)
                self._index[row["id"]] = self._encode_image(img)
                indexed += 1
            except Exception:
                logger.debug("Skipping product %s for VS index", row["id"], exc_info=True)

        self._rebuild_matrix()
        logger.info("Visual search index built: %d products", indexed)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def search_by_image(
        self,
        image_source: str | bytes,
        limit: int = 10,
    ) -> dict:
        """Upload an image and find the most visually similar products."""
        logger.info("Visual search request (limit=%d)", limit)

        try:
            image = self._load_image(image_source)
        except Exception as exc:
            logger.error("Failed to load query image: %s", exc)
            return {"results": [], "total": 0, "error": f"Image load failed: {exc}"}

        query_vec = self._encode_image(image)

        # Lazy index build on first request
        if not self._index:
            await self._build_index_from_db()

        if self._index_matrix is None or len(self._index_ids) == 0:
            return {"results": [], "total": 0, "index_size": 0}

        # Cosine similarities (query is already L2-normalised, so dot product suffices)
        sims = cosine_similarity(query_vec.reshape(1, -1), self._index_matrix).flatten()

        top_k = min(limit * 2, len(sims))
        top_indices = np.argpartition(sims, -top_k)[-top_k:]
        top_indices = top_indices[np.argsort(sims[top_indices])[::-1]]

        candidates: list[tuple[str, float]] = []
        for i in top_indices:
            score = float(sims[i])
            if score > 0.05:
                candidates.append((self._index_ids[i], score))
            if len(candidates) >= limit:
                break

        # Hydrate from DB
        results = self._hydrate(candidates)

        return {
            "results": results,
            "total": len(results),
            "index_size": len(self._index),
        }

    async def search_by_product(self, product_id: str, limit: int = 10) -> dict:
        """Find visually similar products to an already-indexed product."""
        if not self._index:
            await self._build_index_from_db()

        if product_id not in self._index:
            return {
                "product_id": product_id,
                "results": [],
                "total": 0,
                "error": "Product not in visual index",
            }

        query_vec = self._index[product_id]
        sims = cosine_similarity(query_vec.reshape(1, -1), self._index_matrix).flatten()

        # Exclude self
        if product_id in self._index_ids:
            self_idx = self._index_ids.index(product_id)
            sims[self_idx] = -1.0

        top_k = min(limit * 2, len(sims))
        top_indices = np.argpartition(sims, -top_k)[-top_k:]
        top_indices = top_indices[np.argsort(sims[top_indices])[::-1]]

        candidates: list[tuple[str, float]] = []
        for i in top_indices:
            score = float(sims[i])
            if score > 0.05:
                candidates.append((self._index_ids[i], score))
            if len(candidates) >= limit:
                break

        results = self._hydrate(candidates)

        return {
            "product_id": product_id,
            "results": results,
            "total": len(results),
        }

    async def index_product_image(self, product_id: str, image_source: str | bytes) -> dict:
        """Encode and store an embedding for a single product."""
        logger.info("Indexing product image: %s", product_id)
        try:
            image = self._load_image(image_source)
            embedding = self._encode_image(image)
            self._index[product_id] = embedding
            self._rebuild_matrix()
            return {
                "product_id": product_id,
                "indexed": True,
                "embedding_dim": len(embedding),
                "index_size": len(self._index),
            }
        except Exception as exc:
            logger.error("Indexing failed for product %s: %s", product_id, exc)
            return {
                "product_id": product_id,
                "indexed": False,
                "error": str(exc),
            }

    # ------------------------------------------------------------------
    # Hydration helper
    # ------------------------------------------------------------------

    def _hydrate(self, candidates: list[tuple[str, float]]) -> list[dict]:
        """Fetch product metadata for a list of (product_id, score) tuples."""
        if not candidates:
            return []

        product_ids = [c[0] for c in candidates]
        placeholders = ", ".join(["%s"] * len(product_ids))
        try:
            rows = execute_query(
                f"""
                SELECT p.id, p.title, p.slug, p.short_description,
                       c.name AS category_name,
                       pm.url  AS image_url
                FROM products p
                LEFT JOIN categories c  ON p.category_id = c.id
                LEFT JOIN product_media pm ON pm.product_id = p.id AND pm.is_primary = true
                WHERE p.id IN ({placeholders}) AND p.is_active = true
                """,
                tuple(product_ids),
            )
        except Exception as exc:
            logger.warning("DB hydration failed: %s", exc)
            # Return results without metadata
            return [
                {"product_id": pid, "similarity_score": round(score, 4)}
                for pid, score in candidates
            ]

        pmap = {r["id"]: r for r in rows}
        results: list[dict] = []
        for pid, score in candidates:
            entry: dict = {"product_id": pid, "similarity_score": round(score, 4)}
            if pid in pmap:
                p = pmap[pid]
                entry.update({
                    "title": p["title"],
                    "slug": p["slug"],
                    "description": p["short_description"],
                    "image_url": p.get("image_url"),
                    "category": p.get("category_name"),
                })
            results.append(entry)
        return results
