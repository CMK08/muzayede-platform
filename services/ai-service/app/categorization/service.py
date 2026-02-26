"""Auto-categorization service using Turkish keyword matching and TF-IDF."""

import logging
import re
import math
from collections import defaultdict

logger = logging.getLogger(__name__)

# Turkish category definitions with associated keywords
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Tablolar": [
        "tablo", "resim", "yagli boya", "akrilik", "suluboya", "tuval", "canvas",
        "painting", "portrait", "portre", "peyzaj", "landscape", "natürmort",
        "still life", "modern sanat", "empresyonist", "soyut", "abstract",
        "figüratif", "minyatür", "hat", "ebru", "karakalem", "pastel",
    ],
    "Heykeller": [
        "heykel", "sculpture", "büst", "bust", "figür", "figure", "bronz",
        "bronze", "mermer", "marble", "seramik heykel", "ahsap heykel",
        "wood carving", "tas oyma", "stone carving", "rölyef", "relief",
        "modern heykel", "kinetik", "anit", "monument",
    ],
    "Antikalar": [
        "antika", "antique", "vintage", "eski", "tarihi", "osmanlı", "ottoman",
        "koleksiyon", "collection", "nadir", "rare", "klasik", "classic",
        "retro", "nostaljik", "dekoratif", "decorative", "orijinal", "original",
        "eski dönem", "period", "restorasyon", "restored",
    ],
    "Mücevher": [
        "mücevher", "jewel", "jewelry", "pirlanta", "diamond", "altin", "gold",
        "gümüs", "silver", "yakut", "ruby", "zümrüt", "emerald", "safir",
        "sapphire", "kolye", "necklace", "yüzük", "ring", "bilezik", "bracelet",
        "küpe", "earring", "broslar", "brooch", "inci", "pearl", "karat",
    ],
    "Saatler": [
        "saat", "watch", "clock", "kronograf", "chronograph", "otomatik",
        "automatic", "mekanik", "mechanical", "kol saati", "wristwatch",
        "cep saati", "pocket watch", "duvar saati", "wall clock", "masa saati",
        "table clock", "rolex", "omega", "patek", "cartier", "swiss", "isvicre",
    ],
    "Mobilya": [
        "mobilya", "furniture", "sandalye", "chair", "masa", "table", "koltuk",
        "armchair", "sofa", "kanepe", "dolap", "cabinet", "konsol", "console",
        "sehpa", "coffee table", "yatak", "bed", "komodin", "nightstand",
        "ahsap", "wood", "cilali", "polished", "el yapimi", "handmade",
    ],
    "Fotoğraf": [
        "fotograf", "photograph", "photo", "baskı", "print", "vintage fotograf",
        "sanat fotografı", "art photography", "siyah beyaz", "black white",
        "portre fotograf", "portrait photography", "manzara", "landscape",
        "belgesel", "documentary", "dijital baski", "digital print",
    ],
    "Kitap ve El Yazmaları": [
        "kitap", "book", "el yazması", "manuscript", "elyazma", "ilk baski",
        "first edition", "nadir kitap", "rare book", "antika kitap", "osmanlıca",
        "hat sanatı", "calligraphy", "minyatür", "miniature", "mushaf",
        "divan", "matbu", "printed", "lithography", "litografi",
    ],
    "Seramik ve Cam": [
        "seramik", "ceramic", "porselen", "porcelain", "cam", "glass",
        "çini", "tile", "iznik", "kütahya", "vazo", "vase", "tabak", "plate",
        "kase", "bowl", "sürahi", "pitcher", "murano", "kristal", "crystal",
        "emaye", "enamel", "fayans",
    ],
    "Halı ve Tekstil": [
        "halı", "carpet", "rug", "kilim", "kilim", "cicim", "sumak",
        "tekstil", "textile", "ipek", "silk", "yün", "wool", "dokuma",
        "weaving", "el dokuma", "handwoven", "nakis", "embroidery",
        "goblein", "gobelin", "tapestry", "hereke", "uşak", "kayseri",
    ],
    "Dijital Sanat": [
        "dijital", "digital", "nft", "kripto sanat", "crypto art",
        "dijital sanat", "digital art", "pixel", "generatif", "generative",
        "ai art", "yapay zeka sanat", "3d", "animasyon", "animation",
        "motion", "video art",
    ],
    "Diğer": [
        "diger", "other", "çeşitli", "various", "karma", "mixed",
    ],
}

CATEGORIES = list(CATEGORY_KEYWORDS.keys())


def _normalize_turkish(text: str) -> str:
    """Normalize Turkish text for comparison."""
    text = text.lower()
    replacements = {
        "ş": "s", "ç": "c", "ğ": "g", "ü": "u", "ö": "o", "ı": "i",
        "Ş": "s", "Ç": "c", "Ğ": "g", "Ü": "u", "Ö": "o", "İ": "i",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


class CategorizationService:
    """Automatic product categorization using keyword matching and TF-IDF."""

    def __init__(self):
        self._idf_cache: dict[str, float] = {}
        self._build_idf()

    def _build_idf(self) -> None:
        """Build IDF (Inverse Document Frequency) scores for category keywords."""
        all_terms: set[str] = set()
        for keywords in CATEGORY_KEYWORDS.values():
            for kw in keywords:
                all_terms.add(_normalize_turkish(kw))

        num_categories = len(CATEGORIES)
        for term in all_terms:
            doc_count = 0
            for keywords in CATEGORY_KEYWORDS.values():
                normalized_keywords = [_normalize_turkish(k) for k in keywords]
                if term in normalized_keywords:
                    doc_count += 1
            self._idf_cache[term] = math.log(num_categories / max(doc_count, 1))

    def _tokenize(self, text: str) -> list[str]:
        """Simple whitespace and punctuation tokenizer."""
        text = _normalize_turkish(text)
        tokens = re.findall(r'\b[a-z0-9]+\b', text)
        return tokens

    def _compute_tf(self, tokens: list[str]) -> dict[str, float]:
        """Compute term frequency for a list of tokens."""
        tf: dict[str, float] = defaultdict(float)
        total = len(tokens) if tokens else 1
        for token in tokens:
            tf[token] += 1
        for token in tf:
            tf[token] /= total
        return dict(tf)

    async def categorize(
        self,
        title: str,
        description: str,
        image_url: str | None = None,
    ) -> dict:
        """Categorize a product based on title and description using keyword + TF-IDF."""
        logger.info(f"Categorizing: title='{title[:50]}...'")

        combined_text = f"{title} {title} {description}"  # title weighted 2x
        tokens = self._tokenize(combined_text)
        tf = self._compute_tf(tokens)

        category_scores: dict[str, float] = {}

        for category, keywords in CATEGORY_KEYWORDS.items():
            score = 0.0
            matched_keywords = []

            for keyword in keywords:
                norm_keyword = _normalize_turkish(keyword)
                kw_tokens = norm_keyword.split()

                if len(kw_tokens) == 1:
                    token = kw_tokens[0]
                    if token in tf:
                        idf = self._idf_cache.get(token, 1.0)
                        token_score = tf[token] * idf
                        score += token_score
                        matched_keywords.append(keyword)
                else:
                    # Multi-word keyword: check if all tokens appear
                    norm_text = _normalize_turkish(combined_text)
                    if norm_keyword in norm_text:
                        avg_idf = sum(
                            self._idf_cache.get(t, 1.0) for t in kw_tokens
                        ) / len(kw_tokens)
                        score += 0.5 * avg_idf
                        matched_keywords.append(keyword)

            # Bonus for title-only matches (stronger signal)
            title_tokens = self._tokenize(title)
            for keyword in keywords:
                norm_kw = _normalize_turkish(keyword)
                for tt in title_tokens:
                    if tt == norm_kw:
                        score += 0.3

            category_scores[category] = score

        # Normalize scores to confidence values
        max_score = max(category_scores.values()) if category_scores else 0
        if max_score > 0:
            for cat in category_scores:
                category_scores[cat] = min(category_scores[cat] / max_score, 1.0)

        # Sort by score descending
        sorted_categories = sorted(
            category_scores.items(), key=lambda x: x[1], reverse=True
        )

        top_category = sorted_categories[0][0] if sorted_categories else "Diğer"
        top_confidence = sorted_categories[0][1] if sorted_categories else 0.0

        # If confidence is very low, default to "Diğer"
        if top_confidence < 0.05:
            top_category = "Diğer"
            top_confidence = 0.5

        return {
            "predicted_category": top_category,
            "confidence": round(top_confidence, 4),
            "top_categories": [
                {
                    "category": cat,
                    "confidence": round(conf, 4),
                }
                for cat, conf in sorted_categories[:3]
            ],
        }
