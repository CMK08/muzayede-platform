import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, API_PREFIX } from '../config.js';
import { login, authHeaders } from '../helpers.js';

// Custom metrics
const spikeLatency = new Trend('spike_latency', true);
const errorRate = new Rate('errors');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // baseline at 10 VUs
    { duration: '10s', target: 500 },   // spike to 500 VUs in 10 seconds
    { duration: '30s', target: 500 },   // hold at 500 VUs for 30 seconds
    { duration: '10s', target: 10 },    // drop back to 10
    { duration: '1m', target: 10 },     // recovery period
    { duration: '20s', target: 0 },     // cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],   // More lenient during spikes
    http_req_failed: ['rate<0.20'],       // Allow up to 20% failures during spike
    errors: ['rate<0.25'],
    spike_latency: ['p(95)<5000'],
  },
};

export default function () {
  // Simulate a flash sale / popular auction start scenario
  // Users rush to view and bid on a popular auction

  group('Spike - Auction Rush', function () {
    // Step 1: Browse auctions (everyone looking for the hot auction)
    const auctionsRes = http.get(`${BASE_URL}${API_PREFIX}/auctions`);
    spikeLatency.add(auctionsRes.timings.duration);

    const auctionsOk = check(auctionsRes, {
      'auctions: status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    if (auctionsOk) {
      successfulRequests.add(1);
      errorRate.add(0);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }
    sleep(0.2);

    // Step 2: Search for specific items
    const searchTerms = ['vazo', 'antika', 'tablo'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchRes = http.get(`${BASE_URL}${API_PREFIX}/search?q=${encodeURIComponent(term)}`);
    spikeLatency.add(searchRes.timings.duration);

    const searchOk = check(searchRes, {
      'search: status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    if (searchOk) {
      successfulRequests.add(1);
      errorRate.add(0);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }
    sleep(0.2);

    // Step 3: Login to place bid (50% of users attempt login)
    if (Math.random() < 0.5) {
      const userIndex = Math.floor(Math.random() * 3);
      const token = login(userIndex);

      const loginOk = check(token, {
        'login: token received': (t) => t !== null,
      });
      if (loginOk) {
        successfulRequests.add(1);
        errorRate.add(0);
      } else {
        failedRequests.add(1);
        errorRate.add(1);
      }

      // Step 4: Authenticated users browse user data
      if (token) {
        sleep(0.2);
        const usersRes = http.get(
          `${BASE_URL}${API_PREFIX}/users`,
          authHeaders(token)
        );
        spikeLatency.add(usersRes.timings.duration);

        const usersOk = check(usersRes, {
          'users: status is 2xx': (r) => r.status >= 200 && r.status < 300,
        });
        if (usersOk) {
          successfulRequests.add(1);
          errorRate.add(0);
        } else {
          failedRequests.add(1);
          errorRate.add(1);
        }
      }
    }

    // Step 5: Browse products and categories (additional browsing)
    sleep(0.3);
    const productsRes = http.get(`${BASE_URL}${API_PREFIX}/products`);
    spikeLatency.add(productsRes.timings.duration);

    const productsOk = check(productsRes, {
      'products: status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    if (productsOk) {
      successfulRequests.add(1);
      errorRate.add(0);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }
  });

  sleep(Math.random() * 0.5 + 0.1); // Very short think time during rush
}
