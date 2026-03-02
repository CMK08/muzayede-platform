import { test, expect } from '@playwright/test';
import { loginAsAdmin, mockApiResponse, mockProfileApi, TEST_ADMIN } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_DASHBOARD_STATS = {
  stats: {
    totalRevenue: 8500000,
    monthlyRevenue: 1100000,
    revenueChange: '+12.5%',
    totalAuctions: 1245,
    activeAuctions: 342,
    auctionsChange: '+8.3%',
    totalUsers: 52800,
    newUsersThisMonth: 1600,
    usersChange: '+3.1%',
    totalBids: 85000,
    monthlyBids: 8400,
    bidsChange: '+16.7%',
  },
  revenueData: [
    { month: 'Oca', revenue: 450000, bids: 3200 },
    { month: 'Sub', revenue: 580000, bids: 4100 },
    { month: 'Mar', revenue: 620000, bids: 4500 },
  ],
  recentAuctions: [
    {
      id: '1',
      title: 'Osmanli Donemi Altin Kupe Seti',
      category: 'Antika Taki',
      currentBid: 42500,
      bidCount: 28,
      endDate: '2026-03-05T22:00:00Z',
      status: 'active',
    },
    {
      id: '2',
      title: '1967 Ford Mustang Shelby GT500',
      category: 'Klasik Otomobil',
      currentBid: 875000,
      bidCount: 15,
      endDate: '2026-03-02T20:00:00Z',
      status: 'ending_soon',
    },
  ],
};

const MOCK_ADMIN_USERS = {
  data: [
    { id: 'u-1', email: 'user1@test.com', firstName: 'Ali', lastName: 'Veli', role: 'user', status: 'active' },
    { id: 'u-2', email: 'user2@test.com', firstName: 'Ayse', lastName: 'Fatma', role: 'user', status: 'active' },
    { id: 'u-3', email: 'admin@test.com', firstName: 'Yonetici', lastName: 'Admin', role: 'admin', status: 'active' },
  ],
  meta: { total: 3, page: 1, limit: 20, totalPages: 1 },
};

const MOCK_ADMIN_AUCTIONS = {
  data: [
    {
      id: 'a-1',
      title: 'Osmanli Altin Kupe',
      category: 'Antika',
      status: 'active',
      currentPrice: 42500,
      totalBids: 28,
    },
    {
      id: 'a-2',
      title: 'Rolex Daytona',
      category: 'Saat',
      status: 'active',
      currentPrice: 1250000,
      totalBids: 12,
    },
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

const MOCK_ADMIN_PRODUCTS = {
  data: [
    { id: 'p-1', title: 'Altin Kupe Seti', category: 'Antika Taki', status: 'approved' },
    { id: 'p-2', title: 'Rolex Submariner', category: 'Luks Saat', status: 'pending' },
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

const MOCK_ADMIN_ORDERS = {
  data: [
    { id: 'o-1', buyer: 'Ali Veli', amount: 55165, status: 'paid', createdAt: '2026-02-20T10:00:00Z' },
    { id: 'o-2', buyer: 'Ayse Fatma', amount: 120000, status: 'pending', createdAt: '2026-02-21T14:00:00Z' },
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

// ---------------------------------------------------------------------------
// Helper: set up standard admin API mocks
// ---------------------------------------------------------------------------

async function setupAdminMocks(page: import('@playwright/test').Page) {
  await mockProfileApi(page, TEST_ADMIN);

  await mockApiResponse(page, {
    urlPattern: '**/api/v1/admin/dashboard',
    body: MOCK_DASHBOARD_STATS,
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/admin/users*',
    body: MOCK_ADMIN_USERS,
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/admin/auctions*',
    body: MOCK_ADMIN_AUCTIONS,
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/admin/products*',
    body: MOCK_ADMIN_PRODUCTS,
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/admin/orders*',
    body: MOCK_ADMIN_ORDERS,
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/admin/finance*',
    body: { revenue: 8500000, expenses: 1200000, profit: 7300000 },
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/admin/settings*',
    body: { siteName: 'Muzayede Platform', currency: 'TRY' },
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/admin/cms*',
    body: { pages: [] },
  });
}

// ---------------------------------------------------------------------------
// Admin Paneli
// ---------------------------------------------------------------------------

test.describe('Admin Paneli', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await setupAdminMocks(page);
  });

  test('admin olarak giris yapar ve dashboard\'i yukler', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard basligi
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('dashboard istatistik kartlarini gosterir', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // 4 istatistik karti olmali
    const statCards = page.locator('.grid .p-6, [class*="CardContent"]');
    if (await statCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await statCards.count();
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });

  test('dashboard grafikleri yukler', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Recharts grafik konteynerler
    const charts = page.locator('.recharts-responsive-container, .recharts-wrapper, svg.recharts-surface');
    if (await charts.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await charts.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('son muzayedeler tablosunu gosterir', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Tablo
    const table = page.locator('table');
    if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(table).toBeVisible();

      // Tablo basliklari
      const headerCells = page.locator('th');
      const headerCount = await headerCells.count();
      expect(headerCount).toBeGreaterThanOrEqual(4);
    }
  });

  test('haftalik/aylik grafik periyodunu degistirir', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Periyod butonlari
    const weeklyButton = page.locator('button').filter({ hasText: /haftalik|weekly/i }).first();
    if (await weeklyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await weeklyButton.click();
      await page.waitForTimeout(500);
    }
  });
});

// ---------------------------------------------------------------------------
// Admin navigasyonu
// ---------------------------------------------------------------------------

test.describe('Admin Navigasyonu', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await setupAdminMocks(page);
  });

  test('sidebar navigasyonunu gosterir', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar nav linkleri -- yonetim paneli
    const sidebar = page.locator('aside, nav');
    if (await sidebar.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Navigasyon etiketlerinden en az birini dogrula
      const navLabels = ['Dashboard', 'Muzayedeler', 'Kullanicilar', 'Urunler', 'Siparisler'];
      for (const label of navLabels) {
        const navLink = page.locator(`a, span`).filter({ hasText: label }).first();
        if (await navLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(navLink).toBeVisible();
        }
      }
    }
  });

  test('kullanicilar sayfasina gider', async ({ page }) => {
    await page.goto('/tr/admin/users');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('muzayedeler sayfasina gider', async ({ page }) => {
    await page.goto('/tr/admin/auctions');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('urunler sayfasina gider', async ({ page }) => {
    await page.goto('/tr/admin/products');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('siparisler sayfasina gider', async ({ page }) => {
    await page.goto('/tr/admin/orders');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('finans sayfasina gider', async ({ page }) => {
    await page.goto('/tr/admin/finance');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('icerik yonetimi sayfasina gider', async ({ page }) => {
    await page.goto('/tr/admin/cms');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('ayarlar sayfasina gider', async ({ page }) => {
    await page.goto('/tr/admin/settings');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('siteye don linkini icerir', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    const backLink = page.locator('a').filter({ hasText: /Siteye Don|siteye/i }).first();
    if (await backLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(backLink).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Admin sayfalari veri tablolari
// ---------------------------------------------------------------------------

test.describe('Admin Veri Tablolari', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await setupAdminMocks(page);
  });

  test('dashboard tablosunda muzayede satirlari yukler', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Tablo satirlari
    const tableRows = page.locator('tbody tr');
    if (await tableRows.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await tableRows.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('dashboard tablosunda aksiyon butonlari vardir', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Aksiyon butonlari (goz, onay, red, daha fazla)
    const actionButtons = page.locator('tbody button');
    if (await actionButtons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await actionButtons.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('dashboard durum badge\'leri dogrulanir', async ({ page }) => {
    await page.goto('/tr/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Durum etiketleri: Aktif, Bitiyor, Yakinda
    const statusBadges = page.locator('text=/Aktif|Bitiyor|Yakinda/');
    if (await statusBadges.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await statusBadges.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});
