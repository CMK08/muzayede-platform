#!/bin/bash
###############################################################################
# Muzayede Platform — Start All Backend Services
# Usage: ./scripts/start-services.sh
###############################################################################

export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES_DIR="$BASE_DIR/services"
LOGS_DIR="$BASE_DIR/logs"

mkdir -p "$LOGS_DIR"

# Common environment variables
export DATABASE_URL="postgresql://muzayede:muzayede_dev_2026@localhost:5432/muzayede_dev"
export REDIS_URL="redis://localhost:6379"
export MONGODB_URL="mongodb://muzayede:muzayede_dev_2026@localhost:27017/muzayede_dev?authSource=admin"
export ELASTICSEARCH_URL="http://localhost:9200"
export JWT_SECRET="muzayede-dev-jwt-secret-2026"
export JWT_REFRESH_SECRET="muzayede-dev-refresh-secret-2026"
export JWT_EXPIRES_IN="15m"
export JWT_REFRESH_EXPIRES_IN="7d"
export BCRYPT_ROUNDS=12
export S3_ENDPOINT="http://localhost:9000"
export S3_ACCESS_KEY="muzayede_minio"
export S3_SECRET_KEY="muzayede_minio_2026"
export S3_BUCKET_MEDIA="muzayede-media"
export S3_REGION="eu-central-1"
export S3_FORCE_PATH_STYLE=true
export NODE_ENV=development
export KAFKA_BROKERS="localhost:9092"

# Service definitions: name:port
SERVICES=(
  "auth-service:3001"
  "user-service:3002"
  "auction-service:3003"
  "bid-service:3004"
  "product-service:3005"
  "notification-service:3006"
  "search-service:3007"
  "payment-service:3008"
  "shipping-service:3009"
  "live-service:3010"
  "blockchain-service:3012"
  "analytics-service:3013"
  "cms-service:3014"
  "api-gateway:4000"
)

echo "🚀 Starting Muzayede Platform Backend Services..."
echo ""

PIDS=()

for entry in "${SERVICES[@]}"; do
  IFS=':' read -r svc port <<< "$entry"
  echo "  Starting $svc on port $port..."
  PORT=$port node "$SERVICES_DIR/$svc/dist/main.js" > "$LOGS_DIR/$svc.log" 2>&1 &
  PIDS+=($!)
done

echo ""
echo "⏳ Waiting for services to start..."
sleep 3

echo ""
echo "📊 Service Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for entry in "${SERVICES[@]}"; do
  IFS=':' read -r svc port <<< "$entry"
  if curl -s "http://localhost:$port/api/v1" > /dev/null 2>&1 || lsof -i :"$port" > /dev/null 2>&1; then
    echo "  ✅ $svc → http://localhost:$port"
  else
    echo "  ❌ $svc → FAILED (check logs/$svc.log)"
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Swagger docs available at: http://localhost:{port}/api/docs"
echo "📁 Logs directory: $LOGS_DIR/"
echo ""
echo "To stop all services: kill ${PIDS[*]}"
echo "Or run: pkill -f 'node.*dist/main.js'"
