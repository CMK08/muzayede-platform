FROM python:3.12-slim AS base
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libffi-dev libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser --system --uid 1001 appuser
USER appuser

EXPOSE 3011

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3011", "--workers", "2"]
