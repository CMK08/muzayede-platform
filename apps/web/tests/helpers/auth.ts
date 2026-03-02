import { Page, Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock user / admin data
// ---------------------------------------------------------------------------

export const TEST_USER = {
  id: 'user-001',
  email: 'alici1@test.com',
  phone: '+905551234567',
  firstName: 'Ahmet',
  lastName: 'Yilmaz',
  role: 'user' as const,
  isVerified: true,
  createdAt: '2025-01-15T10:00:00Z',
};

export const TEST_ADMIN = {
  id: 'admin-001',
  email: 'admin@muzayede.com',
  phone: '+905559999999',
  firstName: 'Yonetici',
  lastName: 'Admin',
  role: 'admin' as const,
  isVerified: true,
  createdAt: '2024-06-01T08:00:00Z',
};

const FAKE_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzA5MTIzNDU2fQ.fake_signature';
const FAKE_REFRESH_TOKEN = 'fake-refresh-token-for-testing';
const FAKE_ADMIN_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi0wMDEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDkxMjM0NTZ9.fake_admin_signature';

// ---------------------------------------------------------------------------
// Zustand persisted store shape (matches muzayede-auth localStorage key)
// ---------------------------------------------------------------------------

function buildAuthStoreValue(user: typeof TEST_USER | typeof TEST_ADMIN, accessToken: string) {
  return JSON.stringify({
    state: {
      user,
      accessToken,
      refreshToken: FAKE_REFRESH_TOKEN,
      isAuthenticated: true,
    },
    version: 0,
  });
}

// ---------------------------------------------------------------------------
// loginAsUser  --  sets localStorage + cookie so both client & middleware see auth
// ---------------------------------------------------------------------------

export async function loginAsUser(page: Page): Promise<void> {
  // Set the cookie that the Next.js middleware checks
  await page.context().addCookies([
    {
      name: 'access_token',
      value: FAKE_ACCESS_TOKEN,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Seed localStorage with Zustand persisted auth state
  await page.addInitScript((storeValue: string) => {
    window.localStorage.setItem('muzayede-auth', storeValue);
    window.localStorage.setItem('access_token', storeValue.includes('admin') ? '' : 'fake-access-token');
    window.localStorage.setItem('refresh_token', 'fake-refresh-token-for-testing');
  }, buildAuthStoreValue(TEST_USER, FAKE_ACCESS_TOKEN));
}

// ---------------------------------------------------------------------------
// loginAsAdmin -- same approach but with admin role
// ---------------------------------------------------------------------------

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: 'access_token',
      value: FAKE_ADMIN_ACCESS_TOKEN,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.addInitScript((storeValue: string) => {
    window.localStorage.setItem('muzayede-auth', storeValue);
    window.localStorage.setItem('access_token', 'fake-admin-access-token');
    window.localStorage.setItem('refresh_token', 'fake-refresh-token-for-testing');
  }, buildAuthStoreValue(TEST_ADMIN, FAKE_ADMIN_ACCESS_TOKEN));
}

// ---------------------------------------------------------------------------
// mockApiResponse  --  intercept any API route and return a canned JSON body
// ---------------------------------------------------------------------------

export interface MockApiOptions {
  /** URL pattern to match, e.g. api/v1/auctions */
  urlPattern: string;
  /** HTTP method (default GET) */
  method?: string;
  /** HTTP status code (default 200) */
  status?: number;
  /** Response body (will be JSON-serialised) */
  body: unknown;
  /** Optional content-type override */
  contentType?: string;
}

export async function mockApiResponse(page: Page, options: MockApiOptions): Promise<void> {
  const { urlPattern, method = 'GET', status = 200, body, contentType = 'application/json' } = options;

  await page.route(urlPattern, async (route: Route) => {
    const request = route.request();
    if (method !== '*' && request.method().toUpperCase() !== method.toUpperCase()) {
      return route.fallback();
    }
    await route.fulfill({
      status,
      contentType,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  });
}

// ---------------------------------------------------------------------------
// Convenience: mock the login API to return a successful response
// ---------------------------------------------------------------------------

export async function mockLoginApi(page: Page): Promise<void> {
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auth/login',
    method: 'POST',
    body: {
      data: {
        user: TEST_USER,
        accessToken: FAKE_ACCESS_TOKEN,
        refreshToken: FAKE_REFRESH_TOKEN,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: mock the register API
// ---------------------------------------------------------------------------

export async function mockRegisterApi(page: Page): Promise<void> {
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auth/register',
    method: 'POST',
    body: {
      data: {
        user: TEST_USER,
        accessToken: FAKE_ACCESS_TOKEN,
        refreshToken: FAKE_REFRESH_TOKEN,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: mock the user profile API
// ---------------------------------------------------------------------------

export async function mockProfileApi(page: Page, user = TEST_USER): Promise<void> {
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/users/profile',
    body: { data: user },
  });
}
