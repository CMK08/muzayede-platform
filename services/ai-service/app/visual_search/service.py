"""Visual search service using image feature extraction for similarity search."""

import logging
import io
import base64
from typing import Optional
from urllib.request import urlopen

import numpy as np
from PIL import Image

from app.database import execute_query

logger = logging.getLogger(__name__)


class VisualSearchService:
    """Image-based similarity search using color histogram and edge features."""

    def __init__(self):
        self.feature_index: dict[str, np.ndarray] = {}
        self.feature_dim = 256 + 64  # 256 color histogram bins + 64 edge histogram bins
        logger.info("VisualSearchService initialized (feature_dim=%d)", self.feature_dim)

    def _load_image(self, image_source: str | bytes) -> Image.Image:
        """Load an image from URL, base64 string, or raw bytes."""
        if isinstance(image_source, bytes):
            return Image.open(io.BytesIO(image_source)).convert("RGB")

        if image_source.startswith("data:image"):
            header, data = image_source.split(",", 1)
            image_bytes = base64.b64decode(data)
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")

        if image_source.startswith("http://") or image_source.startswith("https://"):
            try:
                response = urlopen(image_source, timeout=10)
                image_bytes = response.read()
                return Image.open(io.BytesIO(image_bytes)).convert("RGB")
            except Exception as e:
                logger.error(f"Failed to download image from {image_source}: {e}")
                raise ValueError(f"Could not download image: {e}")

        image_bytes = base64.b64decode(image_source)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")

    def _extract_features(self, image: Image.Image) -> np.ndarray:
        """
        Extract feature vector from image using:
        - Color histogram (256 bins across RGB channels combined)
        - Edge detection histogram using Sobel-like gradient approximation
        """
        img = image.resize((224, 224))
        img_array = np.array(img, dtype=np.float32)

        # Color histogram: flatten all channels and compute histogram
        color_hist = np.zeros(256, dtype=np.float32)
        for channel in range(3):
            channel_data = img_array[:, :, channel].flatten()
            hist, _ = np.histogram(channel_data, bins=256, range=(0, 256))
            color_hist += hist.astype(np.float32)

        color_hist_norm = np.linalg.norm(color_hist)
        if color_hist_norm > 0:
            color_hist = color_hist / color_hist_norm

        # Edge detection using simple gradient approximation
        gray = np.mean(img_array, axis=2)

        # Horizontal and vertical gradients
        gx = np.zeros_like(gray)
        gy = np.zeros_like(gray)
        gx[:, 1:] = gray[:, 1:] - gray[:, :-1]
        gy[1:, :] = gray[1:, :] - gray[:-1, :]

        magnitude = np.sqrt(gx**2 + gy**2)
        direction = np.arctan2(gy, gx)

        # Edge histogram: 8 direction bins x 8 spatial regions (4x2 grid)
        edge_hist = np.zeros(64, dtype=np.float32)
        h, w = magnitude.shape
        region_h, region_w = h // 4, w // 2

        for ry in range(4):
            for rx in range(2):
                y_start = ry * region_h
                y_end = (ry + 1) * region_h
                x_start = rx * region_w
                x_end = (rx + 1) * region_w

                region_mag = magnitude[y_start:y_end, x_start:x_end].flatten()
                region_dir = direction[y_start:y_end, x_start:x_end].flatten()

                # Bin directions into 8 bins
                dir_bins = ((region_dir + np.pi) / (2 * np.pi) * 8).astype(int)
                dir_bins = np.clip(dir_bins, 0, 7)

                region_idx = ry * 2 + rx
                for b in range(8):
                    mask = dir_bins == b
                    edge_hist[region_idx * 8 + b] = np.sum(region_mag[mask])

        edge_hist_norm = np.linalg.norm(edge_hist)
        if edge_hist_norm > 0:
            edge_hist = edge_hist / edge_hist_norm

        features = np.concatenate([color_hist, edge_hist])
        return features

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two vectors."""
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))

    async def search_by_image(self, image_source: str | bytes, limit: int = 10) -> dict:
        """Find visually similar products by image."""
        logger.info(f"Visual search: limit={limit}")

        try:
            image = self._load_image(image_source)
        except Exception as e:
            logger.error(f"Failed to load image: {e}")
            return {
                "results": [],
                "total": 0,
                "error": f"Failed to load image: {str(e)}",
            }

        query_features = self._extract_features(image)

        if not self.feature_index:
            await self._build_index_from_db()

        results = []
        for product_id, stored_features in self.feature_index.items():
            similarity = self._cosine_similarity(query_features, stored_features)
            if similarity > 0.1:
                results.append({
                    "product_id": product_id,
                    "similarity_score": round(similarity, 4),
                })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        top_results = results[:limit]

        if top_results:
            product_ids = [r["product_id"] for r in top_results]
            placeholders = ", ".join(["%s"] * len(product_ids))
            products = execute_query(
                f"""
                SELECT p.id, p.title, p.slug, p.short_description,
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

            for result in top_results:
                if result["product_id"] in product_map:
                    p = product_map[result["product_id"]]
                    result["title"] = p["title"]
                    result["slug"] = p["slug"]
                    result["description"] = p["short_description"]
                    result["image_url"] = p["image_url"]
                    result["category"] = p["category_name"]

        return {
            "results": top_results,
            "total": len(top_results),
            "index_size": len(self.feature_index),
        }

    async def index_product_image(self, product_id: str, image_url: str) -> dict:
        """Download and index a product image for future visual searches."""
        logger.info(f"Indexing image for product: {product_id}, url: {image_url}")

        try:
            image = self._load_image(image_url)
            features = self._extract_features(image)
            self.feature_index[product_id] = features

            return {
                "product_id": product_id,
                "indexed": True,
                "feature_dimension": self.feature_dim,
                "index_size": len(self.feature_index),
            }
        except Exception as e:
            logger.error(f"Failed to index image for product {product_id}: {e}")
            return {
                "product_id": product_id,
                "indexed": False,
                "error": str(e),
            }

    async def _build_index_from_db(self) -> None:
        """Build feature index from product images in the database."""
        logger.info("Building visual search index from database...")

        products = execute_query(
            """
            SELECT p.id, pm.url
            FROM products p
            JOIN product_media pm ON pm.product_id = p.id AND pm.is_primary = true
            WHERE p.is_active = true
            ORDER BY p.created_at DESC
            LIMIT 1000
            """
        )

        indexed = 0
        for product in products:
            if product["url"] and (
                product["url"].startswith("http://") or product["url"].startswith("https://")
            ):
                try:
                    image = self._load_image(product["url"])
                    features = self._extract_features(image)
                    self.feature_index[product["id"]] = features
                    indexed += 1
                except Exception as e:
                    logger.debug(f"Skipping product {product['id']}: {e}")

        logger.info(f"Visual search index built: {indexed} products indexed")
