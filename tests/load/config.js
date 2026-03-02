export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
export const API_PREFIX = '/api/v1';

export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
  http_reqs: ['rate>100'],
};

export const TEST_USERS = [
  { email: 'alici1@test.com', password: 'Test1234!' },
  { email: 'alici2@test.com', password: 'Test1234!' },
  { email: 'alici3@test.com', password: 'Test1234!' },
];
