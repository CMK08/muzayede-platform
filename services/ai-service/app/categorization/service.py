"""
Auto-categorisation service using a pre-trained image classifier (ResNet-50).

For image uploads the service runs the image through a ResNet-50 pre-trained
on ImageNet, maps the top-K predicted ImageNet classes to auction-specific
categories via a curated mapping table, and returns confidence-ranked
suggestions.

When only text (title + description) is available it falls back to the
TF-IDF keyword scorer used previously.
"""

import io
import logging
import math
import re
import threading
from collections import defaultdict
from typing import Optional

import numpy as np
from PIL import Image

from app.database import execute_query

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# ImageNet class -> auction category mapping
# ---------------------------------------------------------------------------
# We map groups of ImageNet class *indices* (0-999) to auction categories.
# A single ImageNet class can map to multiple auction categories if ambiguous.
# The mapping covers the most common auction item types.

IMAGENET_TO_AUCTION: dict[str, list[str]] = {
    # --- Paintings / Art ---
    # ImageNet has no direct "painting" class, but several relevant ones:
    "studio_couch": ["Mobilya"],
    "altar": ["Antikalar"],
    "triumphal_arch": ["Antikalar"],
    "palace": ["Antikalar"],
    "church": ["Antikalar"],
    "mosque": ["Antikalar"],
    "analog_clock": ["Saatler"],
    "digital_clock": ["Saatler"],
    "wall_clock": ["Saatler"],
    "stopwatch": ["Saatler"],
    "hourglass": ["Saatler", "Antikalar"],
    "necklace": ["Mucevher"],
    "ring": ["Mucevher"],  # custom added below
    "chain": ["Mucevher"],
    "chest": ["Mobilya", "Antikalar"],
    "desk": ["Mobilya"],
    "dining_table": ["Mobilya"],
    "rocking_chair": ["Mobilya"],
    "throne": ["Mobilya", "Antikalar"],
    "bookcase": ["Mobilya"],
    "china_cabinet": ["Mobilya", "Antikalar"],
    "four-poster": ["Mobilya"],
    "wardrobe": ["Mobilya"],
    "folding_chair": ["Mobilya"],
    "vase": ["Seramik ve Cam"],
    "pot": ["Seramik ve Cam"],
    "pitcher": ["Seramik ve Cam"],
    "goblet": ["Seramik ve Cam", "Antikalar"],
    "wine_bottle": ["Seramik ve Cam"],
    "beer_glass": ["Seramik ve Cam"],
    "cup": ["Seramik ve Cam"],
    "coffeepot": ["Seramik ve Cam", "Antikalar"],
    "teapot": ["Seramik ve Cam", "Antikalar"],
    "persian_cat": ["Hali ve Tekstil"],  # often on rugs
    "prayer_rug": ["Hali ve Tekstil"],
    "doormat": ["Hali ve Tekstil"],
    "quilt": ["Hali ve Tekstil"],
    "velvet": ["Hali ve Tekstil"],
    "wool": ["Hali ve Tekstil"],
    "sarong": ["Hali ve Tekstil"],
    "kimono": ["Hali ve Tekstil"],
    "book_jacket": ["Kitap ve El Yazmalari"],
    "comic_book": ["Kitap ve El Yazmalari"],
    "notebook": ["Kitap ve El Yazmalari"],
    "binder": ["Kitap ve El Yazmalari"],
    "envelope": ["Kitap ve El Yazmalari"],
    "polaroid_camera": ["Fotograf"],
    "reflex_camera": ["Fotograf"],
    "Polaroid_camera": ["Fotograf"],
    "projector": ["Fotograf"],
    "screen": ["Dijital Sanat"],
    "monitor": ["Dijital Sanat"],
    "laptop": ["Dijital Sanat"],
    "desktop_computer": ["Dijital Sanat"],
    "web_site": ["Dijital Sanat"],
    "iPod": ["Dijital Sanat"],
}

# Broad keyword groups for the text-based fallback
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Tablolar": [
        "tablo", "resim", "yagli boya", "akrilik", "suluboya", "tuval",
        "painting", "portrait", "portre", "peyzaj", "landscape", "soyut",
        "abstract", "figuratif", "minyatur", "hat", "ebru", "karakalem",
    ],
    "Heykeller": [
        "heykel", "sculpture", "bust", "figur", "bronz", "mermer",
        "marble", "seramik heykel", "ahsap heykel", "rolyef", "relief",
    ],
    "Antikalar": [
        "antika", "antique", "vintage", "tarihi", "osmanli", "ottoman",
        "koleksiyon", "nadir", "rare", "klasik", "retro", "dekoratif",
    ],
    "Mucevher": [
        "mucevher", "jewel", "pirlanta", "diamond", "altin", "gold",
        "gumus", "silver", "yakut", "zumrut", "safir", "kolye",
        "yuzuk", "bilezik", "kupe", "inci", "pearl",
    ],
    "Saatler": [
        "saat", "watch", "clock", "kronograf", "otomatik", "mekanik",
        "kol saati", "cep saati", "rolex", "omega", "patek",
    ],
    "Mobilya": [
        "mobilya", "furniture", "sandalye", "masa", "koltuk", "dolap",
        "konsol", "sehpa", "yatak", "ahsap", "el yapimi",
    ],
    "Fotograf": [
        "fotograf", "photograph", "baski", "print", "siyah beyaz",
    ],
    "Kitap ve El Yazmalari": [
        "kitap", "book", "el yazmasi", "manuscript", "ilk baski",
        "nadir kitap", "hat sanati", "calligraphy", "mushaf",
    ],
    "Seramik ve Cam": [
        "seramik", "ceramic", "porselen", "porcelain", "cam", "glass",
        "cini", "iznik", "vazo", "kristal",
    ],
    "Hali ve Tekstil": [
        "hali", "carpet", "kilim", "tekstil", "ipek", "silk", "yun",
        "wool", "dokuma", "nakis", "hereke",
    ],
    "Dijital Sanat": [
        "dijital", "digital", "nft", "kripto", "pixel", "generatif",
        "ai art", "3d", "animasyon",
    ],
    "Diger": [
        "diger", "other", "cesitli", "karma",
    ],
}

CATEGORIES = list(CATEGORY_KEYWORDS.keys())


def _normalize_turkish(text: str) -> str:
    text = text.lower()
    for old, new in {"s": "s", "c": "c", "g": "g", "u": "u", "o": "o", "i": "i",
                     "S": "s", "C": "c", "G": "g", "U": "u", "O": "o", "I": "i"}.items():
        text = text.replace(old, new)
    return text


class CategorizationService:
    """Image + text based auto-categorisation."""

    def __init__(self) -> None:
        self._model = None
        self._transforms = None
        self._imagenet_classes: list[str] = []
        self._model_lock = threading.Lock()

        # Text-based IDF cache
        self._idf_cache: dict[str, float] = {}
        self._build_idf()

    # ------------------------------------------------------------------
    # ResNet-50 model loading (lazy)
    # ------------------------------------------------------------------

    def _ensure_model(self) -> None:
        """Load ResNet-50 (ImageNet) weights on first call."""
        if self._model is not None:
            return
        with self._model_lock:
            if self._model is not None:
                return

            logger.info("Loading ResNet-50 for categorisation ...")
            import torch
            import torchvision.models as models
            import torchvision.transforms as T

            self._model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
            self._model.eval()

            self._transforms = T.Compose([
                T.Resize(256),
                T.CenterCrop(224),
                T.ToTensor(),
                T.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ])

            # ImageNet class labels (from torchvision meta)
            meta = models.ResNet50_Weights.IMAGENET1K_V2.meta
            self._imagenet_classes = meta.get("categories", [])
            if not self._imagenet_classes:
                # fallback: load from torchvision
                try:
                    from torchvision.models import ResNet50_Weights
                    self._imagenet_classes = ResNet50_Weights.IMAGENET1K_V2.meta["categories"]
                except Exception:
                    self._imagenet_classes = [str(i) for i in range(1000)]

            logger.info("ResNet-50 loaded (%d classes)", len(self._imagenet_classes))

    # ------------------------------------------------------------------
    # Image classification
    # ------------------------------------------------------------------

    def _classify_image(self, image: Image.Image, top_k: int = 10) -> list[tuple[str, float]]:
        """
        Run ResNet-50 inference and return the top-K (class_name, probability) pairs.
        """
        import torch

        self._ensure_model()
        img_tensor = self._transforms(image).unsqueeze(0)

        with torch.no_grad():
            logits = self._model(img_tensor)
            probs = torch.nn.functional.softmax(logits, dim=1).squeeze()

        top_probs, top_indices = torch.topk(probs, top_k)
        results: list[tuple[str, float]] = []
        for prob, idx in zip(top_probs, top_indices):
            class_name = (
                self._imagenet_classes[idx.item()]
                if idx.item() < len(self._imagenet_classes)
                else str(idx.item())
            )
            results.append((class_name, float(prob)))
        return results

    def _map_imagenet_to_auction(
        self, predictions: list[tuple[str, float]]
    ) -> dict[str, float]:
        """
        Aggregate ImageNet predictions into auction category scores.

        Each ImageNet class that has a mapping contributes its softmax
        probability to the mapped auction categories.
        """
        scores: dict[str, float] = defaultdict(float)

        for class_name, prob in predictions:
            # Exact match
            if class_name in IMAGENET_TO_AUCTION:
                for cat in IMAGENET_TO_AUCTION[class_name]:
                    scores[cat] += prob
                continue
            # Fuzzy match (underscore / space normalisation)
            normalised = class_name.replace("_", " ").lower()
            for key, cats in IMAGENET_TO_AUCTION.items():
                if key.replace("_", " ").lower() in normalised:
                    for cat in cats:
                        scores[cat] += prob
                    break

        return dict(scores)

    # ------------------------------------------------------------------
    # Text-based fallback (TF-IDF keyword scoring)
    # ------------------------------------------------------------------

    def _build_idf(self) -> None:
        all_terms: set[str] = set()
        for keywords in CATEGORY_KEYWORDS.values():
            for kw in keywords:
                all_terms.add(_normalize_turkish(kw))

        num_cats = len(CATEGORIES)
        for term in all_terms:
            doc_count = sum(
                1
                for keywords in CATEGORY_KEYWORDS.values()
                if term in [_normalize_turkish(k) for k in keywords]
            )
            self._idf_cache[term] = math.log(num_cats / max(doc_count, 1))

    def _text_score(self, title: str, description: str) -> dict[str, float]:
        """Score categories using TF-IDF on title + description."""
        combined = f"{title} {title} {description}"
        tokens = re.findall(r"\b[a-z0-9]+\b", _normalize_turkish(combined))
        if not tokens:
            return {}

        tf: dict[str, float] = defaultdict(float)
        for t in tokens:
            tf[t] += 1
        total = len(tokens)
        for t in tf:
            tf[t] /= total

        scores: dict[str, float] = {}
        for category, keywords in CATEGORY_KEYWORDS.items():
            score = 0.0
            for kw in keywords:
                norm_kw = _normalize_turkish(kw)
                kw_tokens = norm_kw.split()
                if len(kw_tokens) == 1:
                    if kw_tokens[0] in tf:
                        score += tf[kw_tokens[0]] * self._idf_cache.get(kw_tokens[0], 1.0)
                else:
                    if norm_kw in _normalize_turkish(combined):
                        avg_idf = sum(self._idf_cache.get(t, 1.0) for t in kw_tokens) / len(kw_tokens)
                        score += 0.5 * avg_idf
            # Title bonus
            title_tokens = re.findall(r"\b[a-z0-9]+\b", _normalize_turkish(title))
            for kw in keywords:
                norm_kw = _normalize_turkish(kw)
                if norm_kw in title_tokens:
                    score += 0.3
            scores[category] = score

        return scores

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def categorize(
        self,
        title: str = "",
        description: str = "",
        image_data: Optional[bytes] = None,
        image_url: Optional[str] = None,
    ) -> dict:
        """
        Predict the auction category.

        Priority:
         1. If an image is provided, use ResNet-50 image classification.
         2. Always compute text scores and blend them in.
        """
        logger.info("Categorising: title='%s'", title[:60])

        image_scores: dict[str, float] = {}
        text_scores: dict[str, float] = {}
        imagenet_predictions: list[dict] = []

        # --- Image classification ---
        if image_data or image_url:
            try:
                if image_data:
                    img = Image.open(io.BytesIO(image_data)).convert("RGB")
                else:
                    from urllib.request import urlopen, Request
                    req = Request(image_url, headers={"User-Agent": "MuzayedeAI/1.0"})
                    with urlopen(req, timeout=15) as resp:
                        img = Image.open(io.BytesIO(resp.read())).convert("RGB")

                preds = self._classify_image(img, top_k=10)
                imagenet_predictions = [
                    {"class": cls, "probability": round(prob, 4)}
                    for cls, prob in preds
                ]
                image_scores = self._map_imagenet_to_auction(preds)
            except Exception as exc:
                logger.warning("Image classification failed: %s", exc)

        # --- Text scoring ---
        if title or description:
            text_scores = self._text_score(title, description)

        # --- Blend ---
        all_cats = set(image_scores.keys()) | set(text_scores.keys()) | set(CATEGORIES)
        blended: dict[str, float] = {}

        image_weight = 0.65 if image_scores else 0.0
        text_weight = 1.0 - image_weight

        for cat in all_cats:
            blended[cat] = (
                image_weight * image_scores.get(cat, 0.0)
                + text_weight * text_scores.get(cat, 0.0)
            )

        # Normalise to max = 1
        max_score = max(blended.values()) if blended else 0
        if max_score > 0:
            for cat in blended:
                blended[cat] = min(blended[cat] / max_score, 1.0)

        sorted_cats = sorted(blended.items(), key=lambda x: x[1], reverse=True)
        top_category = sorted_cats[0][0] if sorted_cats else "Diger"
        top_confidence = sorted_cats[0][1] if sorted_cats else 0.0

        if top_confidence < 0.05:
            top_category = "Diger"
            top_confidence = 0.5

        result: dict = {
            "predicted_category": top_category,
            "confidence": round(top_confidence, 4),
            "top_categories": [
                {"category": cat, "confidence": round(conf, 4)}
                for cat, conf in sorted_cats[:5]
            ],
        }

        if imagenet_predictions:
            result["imagenet_predictions"] = imagenet_predictions

        return result
