# ---------------------------------------------------------------------------
# Stage 1 -- build wheels and install dependencies
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc g++ libffi-dev libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2 -- lean runtime image
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
ENV SENTENCE_TRANSFORMERS_HOME=/app/.cache/sentence-transformers
ENV TORCH_HOME=/app/.cache/torch

# Runtime-only system libs (libpq for psycopg2, libjpeg/zlib for Pillow)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 libjpeg62-turbo zlib1g libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Create non-root user and writable cache directories
RUN adduser --system --uid 1001 appuser && \
    mkdir -p /app/.cache/huggingface \
             /app/.cache/sentence-transformers \
             /app/.cache/torch && \
    chown -R appuser:nogroup /app/.cache

USER appuser

EXPOSE 3011

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3011/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3011", "--workers", "2", "--timeout-keep-alive", "120"]
