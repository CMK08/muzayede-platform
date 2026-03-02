import http from 'k6/http';
import { BASE_URL, API_PREFIX, TEST_USERS } from './config.js';

export function login(userIndex = 0) {
  const user = TEST_USERS[userIndex % TEST_USERS.length];
  const res = http.post(
    `${BASE_URL}${API_PREFIX}/auth/login`,
    JSON.stringify(user),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status === 200) {
    const body = JSON.parse(res.body);
    return body.accessToken || body.token || null;
  }
  console.warn(`Login failed for ${user.email}: status=${res.status}`);
  return null;
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}
