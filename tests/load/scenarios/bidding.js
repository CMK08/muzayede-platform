import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { BASE_URL, API_PREFIX, TEST_USERS } from '../config.js';
import { login, authHeaders } from '../helpers.js';

// Custom metrics
const bidLatency = new Trend('bid_latency', true);
const bidSuccessRate = new Rate('bid_success_rate');
const bidConflictRate = new Rate('bid_conflict_rate');
const totalBidsPlaced = new Counter('total_bids_placed');
const totalBidsFailed = new Counter('total_bids_failed');

export const options = {
  scenarios: {
    bidding_war: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 25 },   // ramp up first batch
        { duration: '15s', target: 50 },   // more bidders join
        { duration: '30s', target: 100 },  // full bidding war
        { duration: '1m', target: 100 },   // sustained bidding
        { duration: '30s', target: 50 },   // bidders drop off
        { duration: '30s', target: 0 },    // auction ends
      ],
    },
  },
  thresholds: {
    bid_latency: ['p(95)<1000', 'p(99)<2000'],
    bid_success_rate: ['rate>0.50'],           // At least 50% of bids should succeed
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.30'],
  },
};

// Base bid amount in TRY (Turkish Lira)
const BASE_BID_AMOUNT = 1000;
const BID_INCREMENT = 50;

export function setup() {
  // During setup, login and find an active auction to bid on
  console.log('Setting up bidding test...');

  // Login as first test user to discover auctions
  const token = login(0);
  if (!token) {
    console.error('Setup: Could not login. Tests will attempt login per-VU.');
    return { auctionId: null, startingBid: BASE_BID_AMOUNT };
  }

  // Fetch available auctions
  const auctionsRes = http.get(`${BASE_URL}${API_PREFIX}/auctions`);
  if (auctionsRes.status === 200) {
    try {
      const body = JSON.parse(auctionsRes.body);
      const auctions = body.data || body.items || body;
      if (Array.isArray(auctions) && auctions.length > 0) {
        // Pick the first active auction
        const targetAuction = auctions.find(
          (a) => a.status === 'active' || a.status === 'ACTIVE' || a.status === 'live'
        ) || auctions[0];

        const auctionId = targetAuction.id || targetAuction._id;
        const currentBid = targetAuction.currentBid || targetAuction.currentPrice ||
                           targetAuction.highestBid || targetAuction.startingPrice || BASE_BID_AMOUNT;

        console.log(`Setup: Target auction ID = ${auctionId}, current bid = ${currentBid}`);
        return { auctionId, startingBid: currentBid };
      }
    } catch (e) {
      console.error('Setup: Failed to parse auctions response');
    }
  }

  console.warn('Setup: No auctions found. Using placeholder auction ID.');
  return { auctionId: 'test-auction-1', startingBid: BASE_BID_AMOUNT };
}

export default function (data) {
  const vuId = __VU;
  const iterationId = __ITER;
  const userIndex = vuId % TEST_USERS.length;

  group('Bidding War', function () {
    // Step 1: Login
    const token = login(userIndex);
    const loginOk = check(token, {
      'bidding: login successful': (t) => t !== null,
    });

    if (!loginOk) {
      totalBidsFailed.add(1);
      bidSuccessRate.add(0);
      console.warn(`VU ${vuId}: Login failed, skipping bid`);
      sleep(1);
      return;
    }

    sleep(0.3);

    // Step 2: Get current auction state
    let targetAuctionId = data.auctionId;
    let currentHighestBid = data.startingBid;

    if (targetAuctionId) {
      const auctionRes = http.get(
        `${BASE_URL}${API_PREFIX}/auctions/${targetAuctionId}`,
        authHeaders(token)
      );

      if (auctionRes.status === 200) {
        try {
          const auction = JSON.parse(auctionRes.body);
          const auctionData = auction.data || auction;
          currentHighestBid = auctionData.currentBid || auctionData.currentPrice ||
                              auctionData.highestBid || currentHighestBid;
        } catch (e) {
          // Use fallback bid amount
        }
      }
    }

    sleep(0.2);

    // Step 3: Place a bid
    // Each VU calculates a bid based on current highest + increment * VU factor
    const bidAmount = currentHighestBid + BID_INCREMENT + (vuId * 10) + (iterationId * BID_INCREMENT);

    const bidPayload = JSON.stringify({
      auctionId: targetAuctionId,
      amount: bidAmount,
    });

    const bidStart = Date.now();
    const bidRes = http.post(
      `${BASE_URL}${API_PREFIX}/bids`,
      bidPayload,
      authHeaders(token)
    );
    const bidDuration = Date.now() - bidStart;

    bidLatency.add(bidDuration);
    totalBidsPlaced.add(1);

    // Check bid result
    const bidSuccess = check(bidRes, {
      'bid: status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    const bidConflict = bidRes.status === 409 || bidRes.status === 422;

    if (bidSuccess) {
      bidSuccessRate.add(1);
      bidConflictRate.add(0);
      console.log(`VU ${vuId}: Bid of ${bidAmount} TRY placed successfully`);
    } else if (bidConflict) {
      // Bid conflict (outbid or invalid amount) is expected in a bidding war
      bidSuccessRate.add(0);
      bidConflictRate.add(1);
      console.log(`VU ${vuId}: Bid conflict (${bidRes.status}) - amount ${bidAmount} TRY`);
    } else {
      bidSuccessRate.add(0);
      bidConflictRate.add(0);
      totalBidsFailed.add(1);
      console.warn(`VU ${vuId}: Bid failed with status ${bidRes.status}`);
    }

    sleep(0.5);

    // Step 4: Check auction state after bidding (verify bid went through)
    if (targetAuctionId) {
      const verifyRes = http.get(
        `${BASE_URL}${API_PREFIX}/auctions/${targetAuctionId}`,
        authHeaders(token)
      );

      check(verifyRes, {
        'verify: auction still accessible': (r) => r.status >= 200 && r.status < 300,
      });
    }
  });

  // Short pause between bid attempts to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('Bidding test completed.');
  console.log(`Target auction: ${data.auctionId}`);
  console.log(`Starting bid was: ${data.startingBid} TRY`);
}
