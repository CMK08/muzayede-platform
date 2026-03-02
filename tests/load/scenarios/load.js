import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE_URL, API_PREFIX, THRESHOLDS } from '../config.js';
import { login, authHeaders } from '../helpers.js';

// Custom metrics
const auctionBrowseDuration = new Trend('auction_browse_duration', true);
const productBrowseDuration = new Trend('product_browse_duration', true);
const searchDuration = new Trend('search_duration', true);
const loginDuration = new Trend('login_duration', true);
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up to 50 VUs over 1 minute
    { duration: '3m', target: 50 },   // hold at 50 VUs for 3 minutes
    { duration: '1m', target: 0 },    // ramp down to 0 over 1 minute
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    auction_browse_duration: ['p(95)<400'],
    product_browse_duration: ['p(95)<400'],
    search_duration: ['p(95)<600'],
    login_duration: ['p(95)<800'],
    errors: ['rate<0.01'],
  },
};

// Weighted scenario selection
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

  sleep(Math.random() * 2 + 1); // 1-3 seconds think time
}

function browseAuctions() {
  group('Browse Auctions', function () {
    const res = http.get(`${BASE_URL}${API_PREFIX}/auctions`);
    auctionBrowseDuration.add(res.timings.duration);

    const success = check(res, {
      'auctions: status 200': (r) => r.status === 200,
      'auctions: response time < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!success);

    // Simulate browsing individual auctions if the list returns items
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const auctions = body.data || body.items || body;
        if (Array.isArray(auctions) && auctions.length > 0) {
          const randomAuction = auctions[Math.floor(Math.random() * auctions.length)];
          if (randomAuction.id || randomAuction._id) {
            const auctionId = randomAuction.id || randomAuction._id;
            sleep(0.5);
            const detailRes = http.get(`${BASE_URL}${API_PREFIX}/auctions/${auctionId}`);
            check(detailRes, {
              'auction detail: status 200': (r) => r.status === 200,
            });
          }
        }
      } catch (e) {
        // Response parsing failed, continue
      }
    }
  });
}

function browseProducts() {
  group('Browse Products', function () {
    const res = http.get(`${BASE_URL}${API_PREFIX}/products`);
    productBrowseDuration.add(res.timings.duration);

    const success = check(res, {
      'products: status 200': (r) => r.status === 200,
      'products: response time < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!success);

    // Browse categories as a related action
    sleep(0.5);
    const catRes = http.get(`${BASE_URL}${API_PREFIX}/categories`);
    check(catRes, {
      'categories: status 200': (r) => r.status === 200,
    });
  });
}

function performSearch() {
  group('Search', function () {
    const searchTerms = ['vazo', 'tablo', 'heykel', 'seramik', 'antika', 'koleksiyon'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    const res = http.get(`${BASE_URL}${API_PREFIX}/search?q=${encodeURIComponent(term)}`);
    searchDuration.add(res.timings.duration);

    const success = check(res, {
      'search: status 200': (r) => r.status === 200,
      'search: response time < 600ms': (r) => r.timings.duration < 600,
    });
    errorRate.add(!success);
  });
}

function performLogin() {
  group('Login', function () {
    const userIndex = Math.floor(Math.random() * 3);
    const startTime = Date.now();
    const token = login(userIndex);
    loginDuration.add(Date.now() - startTime);

    const success = check(token, {
      'login: token received': (t) => t !== null,
    });
    errorRate.add(!success);

    // After login, view user profile (authenticated endpoint)
    if (token) {
      sleep(0.5);
      const profileRes = http.get(
        `${BASE_URL}${API_PREFIX}/users`,
        authHeaders(token)
      );
      check(profileRes, {
        'users: status 200': (r) => r.status === 200,
      });
    }
  });
}

function viewArtists() {
  group('View Artists', function () {
    const res = http.get(`${BASE_URL}${API_PREFIX}/artists`);

    const success = check(res, {
      'artists: status 200': (r) => r.status === 200,
      'artists: response time < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!success);
  });
}
