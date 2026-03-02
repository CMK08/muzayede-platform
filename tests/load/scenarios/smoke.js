import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, API_PREFIX } from '../config.js';
import { login, authHeaders } from '../helpers.js';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Step 1: Login
  const token = login(0);
  check(token, {
    'login successful': (t) => t !== null,
  });
  sleep(1);

  // Step 2: Browse auctions
  const auctionsRes = http.get(`${BASE_URL}${API_PREFIX}/auctions`);
  check(auctionsRes, {
    'auctions status 200': (r) => r.status === 200,
    'auctions response has body': (r) => r.body && r.body.length > 0,
  });
  sleep(1);

  // Step 3: Browse products
  const productsRes = http.get(`${BASE_URL}${API_PREFIX}/products`);
  check(productsRes, {
    'products status 200': (r) => r.status === 200,
    'products response has body': (r) => r.body && r.body.length > 0,
  });
  sleep(1);

  // Step 4: Browse categories
  const categoriesRes = http.get(`${BASE_URL}${API_PREFIX}/categories`);
  check(categoriesRes, {
    'categories status 200': (r) => r.status === 200,
    'categories response has body': (r) => r.body && r.body.length > 0,
  });
  sleep(1);

  // Step 5: Search
  const searchRes = http.get(`${BASE_URL}${API_PREFIX}/search?q=vazo`);
  check(searchRes, {
    'search status 200': (r) => r.status === 200,
    'search response has body': (r) => r.body && r.body.length > 0,
  });
  sleep(1);

  // Step 6: View artists
  const artistsRes = http.get(`${BASE_URL}${API_PREFIX}/artists`);
  check(artistsRes, {
    'artists status 200': (r) => r.status === 200,
    'artists response has body': (r) => r.body && r.body.length > 0,
  });
  sleep(1);

  // Step 7: View users (authenticated)
  if (token) {
    const usersRes = http.get(
      `${BASE_URL}${API_PREFIX}/users`,
      authHeaders(token)
    );
    check(usersRes, {
      'users status 200': (r) => r.status === 200,
    });
  }
  sleep(1);
}
