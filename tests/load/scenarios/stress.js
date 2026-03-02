import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE_URL, API_PREFIX } from '../config.js';
import { login, authHeaders } from '../helpers.js';

// Custom metrics
const requestDuration = new Trend('custom_req_duration', true);
const errorRate = new Rate('errors');
const errorCount = new Counter('error_count');

export const options = {
  stages: [
    { duration: '1m', target: 10 },    // warm up
    { duration: '1m', target: 50 },    // moderate load
    { duration: '2m', target: 100 },   // high load
    { duration: '2m', target: 200 },   // stress level
    { duration: '1m', target: 100 },   // scale down
    { duration: '1m', target: 50 },    // recovery
    { duration: '2m', target: 0 },     // cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.10'],      // Allow up to 10% errors under stress
    errors: ['rate<0.15'],
    custom_req_duration: ['p(95)<2000'],
  },
};

// Weighted scenario selection (same mix as load test)
// 40% browse auctions, 30% browse products, 15% search, 10% login, 5% view artists
function pickScenario() {
  const rand = Math.random() * 100;
  if (rand < 40) return 'browse_auctions';
  if (rand < 70) return 'browse_products';
  if (rand < 85) return 'search';
  if (rand < 95) return 'login';
  return 'view_artists';
}

export default function () {
  const scenario = pickScenario();

  switch (scenario) {
    case 'browse_auctions':
      browseAuctions();
      break;
    case 'browse_products':
      browseProducts();
      break;
    case 'search':
      performSearch();
      break;
    case 'login':
      performLogin();
      break;
    case 'view_artists':
      viewArtists();
      break;
  }

  sleep(Math.random() * 1.5 + 0.5); // 0.5-2 seconds think time (faster than load test)
}

function browseAuctions() {
  group('Stress - Browse Auctions', function () {
    const res = http.get(`${BASE_URL}${API_PREFIX}/auctions`);
    requestDuration.add(res.timings.duration);

    const success = check(res, {
      'auctions: status is 2xx': (r) => r.status >= 200 && r.status < 300,
      'auctions: response time < 2000ms': (r) => r.timings.duration < 2000,
      'auctions: body is not empty': (r) => r.body && r.body.length > 0,
    });
    if (!success) {
      errorRate.add(1);
      errorCount.add(1);
    } else {
      errorRate.add(0);
    }

    // Drill into a random auction detail
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const auctions = body.data || body.items || body;
        if (Array.isArray(auctions) && auctions.length > 0) {
          const randomAuction = auctions[Math.floor(Math.random() * auctions.length)];
          const auctionId = randomAuction.id || randomAuction._id;
          if (auctionId) {
            sleep(0.3);
            const detailRes = http.get(`${BASE_URL}${API_PREFIX}/auctions/${auctionId}`);
            requestDuration.add(detailRes.timings.duration);
            check(detailRes, {
              'auction detail: status is 2xx': (r) => r.status >= 200 && r.status < 300,
            });
          }
        }
      } catch (e) {
        // Parsing failed under stress, expected
      }
    }
  });
}

function browseProducts() {
  group('Stress - Browse Products', function () {
    const res = http.get(`${BASE_URL}${API_PREFIX}/products`);
    requestDuration.add(res.timings.duration);

    const success = check(res, {
      'products: status is 2xx': (r) => r.status >= 200 && r.status < 300,
      'products: response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    if (!success) {
      errorRate.add(1);
      errorCount.add(1);
    } else {
      errorRate.add(0);
    }

    // Also hit categories
    sleep(0.3);
    const catRes = http.get(`${BASE_URL}${API_PREFIX}/categories`);
    requestDuration.add(catRes.timings.duration);
    check(catRes, {
      'categories: status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  });
}

function performSearch() {
  group('Stress - Search', function () {
    const searchTerms = ['vazo', 'tablo', 'heykel', 'seramik', 'antika', 'koleksiyon', 'cam', 'bronz'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    const res = http.get(`${BASE_URL}${API_PREFIX}/search?q=${encodeURIComponent(term)}`);
    requestDuration.add(res.timings.duration);

    const success = check(res, {
      'search: status is 2xx': (r) => r.status >= 200 && r.status < 300,
      'search: response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    if (!success) {
      errorRate.add(1);
      errorCount.add(1);
    } else {
      errorRate.add(0);
    }
  });
}

function performLogin() {
  group('Stress - Login', function () {
    const userIndex = Math.floor(Math.random() * 3);
    const token = login(userIndex);

    const success = check(token, {
      'login: token received': (t) => t !== null,
    });
    if (!success) {
      errorRate.add(1);
      errorCount.add(1);
    } else {
      errorRate.add(0);
    }

    // After login, access authenticated endpoint
    if (token) {
      sleep(0.3);
      const usersRes = http.get(
        `${BASE_URL}${API_PREFIX}/users`,
        authHeaders(token)
      );
      requestDuration.add(usersRes.timings.duration);
      check(usersRes, {
        'users: status is 2xx': (r) => r.status >= 200 && r.status < 300,
      });
    }
  });
}

function viewArtists() {
  group('Stress - View Artists', function () {
    const res = http.get(`${BASE_URL}${API_PREFIX}/artists`);
    requestDuration.add(res.timings.duration);

    const success = check(res, {
      'artists: status is 2xx': (r) => r.status >= 200 && r.status < 300,
      'artists: response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    if (!success) {
      errorRate.add(1);
      errorCount.add(1);
    } else {
      errorRate.add(0);
    }
  });
}
