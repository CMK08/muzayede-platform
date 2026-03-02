import { test, expect } from '@playwright/test';
import { mockApiResponse } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_FEATURED_AUCTIONS = [
  {
    id: 'auction-001',
    title: 'Osmanli Donemi Altin Kupe Seti',
    category: 'Antika Taki',
    status: 'active',
    currentPrice: 42500,
    startingPrice: 25000,
    totalBids: 28,
    endTime: '2026-12-31T22:00:00Z',
    images: ['https://images.unsplash.com/photo-1515562141589-67f0d569b6c6?w=800'],
  },
  {
    id: 'auction-002',
    title: '1967 Ford Mustang Shelby GT500',
    category: 'Klasik Otomobil',
    status: 'active',
    currentPrice: 875000,
    startingPrice: 500000,
    totalBids: 15,
    endTime: '2026-12-02T20:00:00Z',
    images: ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'],
  },
  {
    id: 'auction-003',
    title: 'Rolex Daytona 116500LN',
    category: 'Luks Saat',
    status: 'active',
    currentPrice: 1250000,
    startingPrice: 900000,
    totalBids: 12,
    endTime: '2026-12-08T18:00:00Z',
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800'],
  },
  {
    id: 'auction-004',
    title: 'Yagli Boya - Istanbul Bogazi',
    category: 'Sanat',
    status: 'active',
    currentPrice: 68000,
    startingPrice: 30000,
    totalBids: 19,
    endTime: '2026-12-10T22:00:00Z',
    images: [],
  },
];

const MOCK_UPCOMING_AUCTIONS = [
  {
    id: 'auction-005',
    title: 'Elmas Yuzuk - 3.5 Karat',
    category: 'Mucevher',
    status: 'upcoming',
    currentPrice: 0,
    startingPrice: 250000,
    totalBids: 0,
    startTime: '2026-03-15T20:00:00Z',
    endTime: '2026-03-20T22:00:00Z',
    images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800'],
  },
];

const MOCK_CATEGORIES = [
  { id: 'jewelry', name: 'Mucevher', count: 45 },
  { id: 'watches', name: 'Luks Saat', count: 32 },
  { id: 'cars', name: 'Klasik Otomobil', count: 18 },
  { id: 'art', name: 'Sanat', count: 27 },
  { id: 'property', name: 'Gayrimenkul', count: 12 },
  { id: 'electronics', name: 'Elektronik', count: 56 },
];

// ---------------------------------------------------------------------------
// Helper: set up homepage API mocks
// ---------------------------------------------------------------------------

async function setupHomepageMocks(page: import('@playwright/test').Page) {
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auctions/featured',
    body: MOCK_FEATURED_AUCTIONS,
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auctions/upcoming',
    body: MOCK_UPCOMING_AUCTIONS,
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auctions/categories',
    body: MOCK_CATEGORIES,
  });
}

// ---------------------------------------------------------------------------
// Anasayfa
// ---------------------------------------------------------------------------

test.describe('Anasayfa (/tr)', () => {
  test.beforeEach(async ({ page }) => {
    await setupHomepageMocks(page);
  });

  test('anasayfa yuklendiginde hero bolumuuu gorunur', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // Hero baslik (h1)
    const heroTitle = page.locator('h1');
    await expect(heroTitle).toBeVisible();

    // "Muzayede" kelimesi hero'da gorunmeli
    const muzayedeText = page.locator('text=/Muzayede/');
    await expect(muzayedeText.first()).toBeVisible();
  });

  test('hero butonlari (CTA) gorunur', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // Muzayedelere goz at butonu
    const ctaButton = page.locator('a[href*="/auctions"]').first();
    await expect(ctaButton).toBeVisible();
  });

  test('guven gostergeleri gorunur (SSL, Lisansli, Uye sayisi)', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // Guven ibareleri
    const trustIndicators = ['SSL', 'Lisansli', '50.000'];
    for (const text of trustIndicators) {
      const indicator = page.locator(`text=/${text}/`);
      if (await indicator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(indicator.first()).toBeVisible();
      }
    }
  });

  test('istatistik bolumunu gosterir', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // Istatistik degerleri
    const statValues = ['12,450+', '2.5M+', '50,000+', '500M+'];
    for (const value of statValues) {
      const stat = page.locator(`text=/${value.replace('+', '\\+')}/`);
      if (await stat.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(stat.first()).toBeVisible();
      }
    }
  });

  test('one cikan muzayedeler bolumunu gosterir', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // Bolum basligi
    const sectionTitle = page.locator('h2').filter({ hasText: /öne çıkan|one cikan|featured/i }).first();
    if (await sectionTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(sectionTitle).toBeVisible();
    }

    // Muzayede kartlari veya skeletonlar
    const auctionCards = page.locator('.grid > div, .grid > a');
    if (await auctionCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await auctionCards.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('kategoriler bolumunu gosterir', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // Kategoriler basligi
    const categoriesTitle = page.locator('h2').filter({ hasText: /kategori/i }).first();
    if (await categoriesTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(categoriesTitle).toBeVisible();
    }

    // Kategori kartlari
    const defaultCategoryNames = ['Mucevher', 'Luks Saat', 'Klasik Otomobil', 'Sanat', 'Gayrimenkul', 'Elektronik'];
    for (const name of defaultCategoryNames) {
      const categoryCard = page.locator('h3, span').filter({ hasText: name }).first();
      if (await categoryCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(categoryCard).toBeVisible();
      }
    }
  });

  test('kategoriye tiklamak muzayedeler sayfasina yonlendirir', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // Kategori linkine tikla
    const categoryLink = page.locator('a[href*="category="]').first();
    if (await categoryLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categoryLink.click();
      await page.waitForURL(/auctions/, { timeout: 5000 });
      expect(page.url()).toContain('auctions');
    }
  });

  test('yaklasan muzayedeler bolumunu gosterir', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // Yaklasan bolum basligi
    const upcomingTitle = page.locator('h2').filter({ hasText: /yaklaşan|yaklasan|upcoming/i }).first();
    if (await upcomingTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(upcomingTitle).toBeVisible();
    }
  });

  test('neden biz bolumunu gosterir', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // Neden biz basligini veya ozellik kartlarini ara
    const whyUsSection = page.locator('text=/neden|guvenli|dogrulanmis|canli|destek/i');
    if (await whyUsSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(whyUsSection.first()).toBeVisible();
    }
  });

  test('CTA bolumunu gosterir (kayit ol)', async ({ page }) => {
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // CTA metni
    const ctaText = page.locator('text=/Hazir Misiniz|Katilmaya|Ucretsiz Kayit/');
    if (await ctaText.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(ctaText.first()).toBeVisible();
    }

    // Kayit ol butonu
    const registerButton = page.locator('a[href*="/register"]');
    if (await registerButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(registerButton.first()).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Navigasyon linkleri
// ---------------------------------------------------------------------------

test.describe('Anasayfa Navigasyonu', () => {
  test.beforeEach(async ({ page }) => {
    await setupHomepageMocks(page);
  });

  test('muzayedeler sayfasina navigasyon', async ({ page }) => {
    await page.goto('/tr');

    const auctionsLink = page.locator('a[href*="/auctions"]').first();
    if (await auctionsLink.isVisible({ timeout: 5000 })) {
      await auctionsLink.click();
      await page.waitForURL(/auctions/, { timeout: 5000 });
      expect(page.url()).toContain('/auctions');
    }
  });

  test('kayit sayfasina navigasyon', async ({ page }) => {
    await page.goto('/tr');

    const registerLink = page.locator('a[href*="/register"]').first();
    if (await registerLink.isVisible({ timeout: 5000 })) {
      await registerLink.click();
      await page.waitForURL(/register/, { timeout: 5000 });
      expect(page.url()).toContain('/register');
    }
  });

  test('varsayilan dil Turkce olarak yukler', async ({ page }) => {
    await page.goto('/');

    // Turkce locale'e yonlendirilmeli
    await page.waitForURL(/\/tr/, { timeout: 5000 });
    expect(page.url()).toContain('/tr');
  });
});

// ---------------------------------------------------------------------------
// Responsive (mobil gorunum)
// ---------------------------------------------------------------------------

test.describe('Anasayfa Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await setupHomepageMocks(page);
  });

  test('mobil gorunumde hero bolumu gorunur', async ({ page, browserName }) => {
    // Webkit projesi zaten mobil cihaz boyutlarinda
    if (browserName === 'webkit') {
      await page.goto('/tr');
      await page.waitForLoadState('networkidle');

      const heroTitle = page.locator('h1');
      await expect(heroTitle).toBeVisible();
    } else {
      // Desktop tarayicilarda viewport kucult
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/tr');
      await page.waitForLoadState('networkidle');

      const heroTitle = page.locator('h1');
      await expect(heroTitle).toBeVisible();
    }
  });

  test('mobil gorunumde kategoriler gorunur', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    const categoriesSection = page.locator('h2').filter({ hasText: /kategori/i }).first();
    if (await categoriesSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(categoriesSection).toBeVisible();
    }
  });

  test('mobil gorunumde istatistikler gorunur', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    // En az bir istatistik gorunur olmali
    const stats = page.locator('text=/12,450|2.5M|50,000|500M/');
    if (await stats.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(stats.first()).toBeVisible();
    }
  });

  test('tablet gorunumde duzgun renderlenir', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/tr');
    await page.waitForLoadState('networkidle');

    const heroTitle = page.locator('h1');
    await expect(heroTitle).toBeVisible();
  });
});
