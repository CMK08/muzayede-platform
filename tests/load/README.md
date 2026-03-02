# Muzayede Platform - k6 Load Tests

Performance and load testing infrastructure for the Muzayede auction platform using [k6](https://k6.io/).

## Prerequisites

### Install k6

**macOS (Homebrew):**

```bash
brew install k6
```

**Windows (Chocolatey):**

```bash
choco install k6
```

**Linux (Debian/Ubuntu):**

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**

```bash
docker run --rm -i grafana/k6 run - <tests/load/scenarios/smoke.js
```

### Verify Installation

```bash
k6 version
```

## Project Structure

```
tests/load/
  config.js               # Shared configuration (base URL, thresholds, test users)
  helpers.js              # Auth helper functions (login, authHeaders)
  package.json            # NPM scripts for convenience
  README.md               # This file
  scenarios/
    smoke.js              # Quick validation test
    load.js               # Normal load simulation
    stress.js             # System limit stress test
    spike.js              # Flash sale spike simulation
    bidding.js            # Concurrent bidding war simulation
```

## Running Tests

All commands should be run from the repository root (`/Users/cemkotanoglu/Desktop/muzayede-platform/`).

Make sure the API Gateway is running at `http://localhost:4000` before executing tests.

### Smoke Test

Quick validation that all endpoints respond correctly. Runs 1 virtual user for 10 seconds.

```bash
k6 run --vus 1 --duration 10s tests/load/scenarios/smoke.js
```

**Use when:** After deployments, to verify basic endpoint health.

### Load Test

Simulates normal production traffic with a realistic mix of user actions.

- Ramps up to 50 virtual users over 1 minute
- Sustains 50 VUs for 3 minutes
- Ramps down over 1 minute
- Traffic mix: 40% auctions, 30% products, 15% search, 10% login, 5% artists

```bash
k6 run tests/load/scenarios/load.js
```

**Use when:** Before releases, to validate the system handles expected traffic levels.

### Stress Test

Gradually increases load beyond normal capacity to find the system's breaking point.

- Stages from 10 to 200 VUs and back down over 10 minutes
- Uses the same endpoint mix as the load test
- More lenient thresholds to observe degradation patterns

```bash
k6 run tests/load/scenarios/stress.js
```

**Use when:** To determine maximum capacity and identify bottlenecks under extreme load.

### Spike Test

Simulates a sudden traffic spike, such as a flash sale or popular auction going live.

- Baseline at 10 VUs, then spikes to 500 VUs within 10 seconds
- Holds at 500 VUs for 30 seconds
- Drops back to 10 VUs to observe recovery

```bash
k6 run tests/load/scenarios/spike.js
```

**Use when:** To verify the system can handle sudden traffic surges and recover gracefully.

### Bidding Simulation

Simulates 100 concurrent users placing competing bids on the same auction.

- Ramps up to 100 VUs placing bids
- Each VU logs in, fetches auction state, and places incrementally higher bids
- Tracks bid-specific latency and success rates

```bash
k6 run tests/load/scenarios/bidding.js
```

**Use when:** To validate bid processing under contention and verify data consistency.

## Custom Base URL

To test against a different environment, set the `BASE_URL` environment variable:

```bash
k6 run -e BASE_URL=https://staging.muzayede.com tests/load/scenarios/smoke.js
```

## Understanding Results

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `http_req_duration` | Total request time (includes DNS, TLS, transfer) | p95 < 500ms |
| `http_req_failed` | Percentage of failed HTTP requests | < 1% (load), < 10% (stress) |
| `http_reqs` | Total requests per second throughput | > 100 req/s |
| `iteration_duration` | Time for one complete VU iteration | Varies by scenario |
| `vus` | Current number of active virtual users | As configured |

### Custom Metrics (per scenario)

**Load test:**
- `auction_browse_duration` - Auction listing response time
- `product_browse_duration` - Product listing response time
- `search_duration` - Search endpoint response time
- `login_duration` - Authentication response time

**Spike test:**
- `spike_latency` - Response time during spike conditions
- `successful_requests` / `failed_requests` - Request outcome counters

**Bidding test:**
- `bid_latency` - Time to process a bid submission
- `bid_success_rate` - Percentage of bids accepted
- `bid_conflict_rate` - Percentage of bids rejected due to conflicts (409/422)

### Interpreting Threshold Results

After each test run, k6 prints threshold results:

```
  http_req_duration...............: avg=120ms  min=45ms  med=110ms  max=890ms  p(90)=250ms  p(95)=380ms
    { expected_response:true }...: avg=115ms  min=45ms  med=105ms  max=650ms  p(90)=240ms  p(95)=350ms
  http_req_failed.................: 0.35%  ✓ 12   ✗ 3388
```

- A green checkmark means the threshold passed.
- A red cross means the threshold was breached, indicating a performance issue.

### Common Issues

| Symptom | Possible Cause | Action |
|---------|---------------|--------|
| High p99 latency | Database queries slow under load | Add indexes, optimize queries |
| Login failures > 5% | Auth service bottleneck | Scale auth service, add connection pooling |
| Bid conflicts > 50% | Race conditions in bid logic | Review optimistic locking implementation |
| Spike test > 20% errors | No auto-scaling or rate limiting | Configure horizontal scaling, add request queuing |
| Timeouts during stress | Connection pool exhaustion | Increase pool size, add circuit breakers |

## Extending Tests

### Adding a New Scenario

1. Create a new file in `tests/load/scenarios/`
2. Import shared config and helpers from `../config.js` and `../helpers.js`
3. Define `options` with stages and thresholds
4. Export a `default` function with the test logic
5. Add a script entry to `package.json`

### Adding Test Users

Edit `tests/load/config.js` and add entries to the `TEST_USERS` array. Make sure the corresponding users exist in your test database.

### Adjusting Thresholds

Edit `tests/load/config.js` to update the shared `THRESHOLDS` object, or override thresholds directly in individual scenario files.
