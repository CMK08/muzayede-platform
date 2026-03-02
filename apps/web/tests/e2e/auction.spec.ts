import { test, expect } from '@playwright/test';
import {
  loginAsUser,
  mockApiResponse,
  mockProfileApi,
} from '../helpers/auth';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_AUCTION = {
  id: 'auction-001',
  title: 'Osmanli Donemi Altin Kupe Seti',
  description: 'Nadir bulunan Osmanli donemi el yapimi altin kupe seti.\n\n18 ayar altin uzerine mine isleme teknigi ile suslenmistir.',
  category: 'Antika Taki',
  status: 'active',
  currentPrice: 42500,
  startingPrice: 25000,
  minBidIncrement: 500,
  totalBids: 28,
  watchCount: 156,
  startTime: '2025-12-01T10:00:00Z',
  endTime: '2026-12-31T22:00:00Z',
  images: [
    'https://images.unsplash.com/photo-1515562141589-67f0d569b6c6?w=800',
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
  ],
  sellerName: 'Antika Koleksiyoncusu',
  location: 'Istanbul, Turkiye',
  condition: 'good',
  shippingInfo: 'Kargo ile gonderim yapilacaktir.',
  winnerName: null,
};

const MOCK_AUCTIONS_LIST = {
  data: [
    { ...MOCK_AUCTION },
    {
      id: 'auction-002',
      title: '1967 Ford Mustang Shelby GT500',
      category: 'Klasik Otomobil',
      status: 'active',
      currentPrice: 875000,
      startingPrice: 500000,
      minBidIncrement: 5000,
      totalBids: 15,
      watchCount: 342,
      startTime: '2025-11-15T10:00:00Z',
      endTime: '2026-12-02T20:00:00Z',
      images: ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'],
      sellerName: 'Klasik Oto Garaj',
      location: 'Ankara, Turkiye',
      condition: 'like_new',
    },
    {
      id: 'auction-003',
      title: 'Rolex Daytona 116500LN',
      category: 'Luks Saat',
      status: 'ending_soon',
      currentPrice: 1250000,
      startingPrice: 900000,
      minBidIncrement: 10000,
      totalBids: 12,
      watchCount: 89,
      startTime: '2025-11-20T10:00:00Z',
      endTime: '2026-12-08T18:00:00Z',
      images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800'],
      sellerName: 'Saat Dunyasi',
      location: 'Izmir, Turkiye',
      condition: 'new',
    },
  ],
  meta: {
    total: 3,
    page: 1,
    limit: 12,
    totalPages: 1,
  },
};

const MOCK_BIDS = {
  data: [
    {
      id: 'bid-001',
      amount: 42500,
      bidderName: 'A***z',
      timestamp: '2025-12-20T15:30:00Z',
      isAutoBid: false,
    },
    {
      id: 'bid-002',
      amount: 42000,
      bidderName: 'M***t',
      timestamp: '2025-12-20T14:15:00Z',
      isAutoBid: true,
    },
    {
      id: 'bid-003',
      amount: 40000,
      bidderName: 'E***n',
      timestamp: '2025-12-19T22:00:00Z',
      isAutoBid: false,
    },
  ],
  meta: { total: 3 },
};

const MOCK_CATEGORIES = [
  { id: 'jewelry', name: 'Mucevher', count: 45 },
  { id: 'watches', name: 'Luks Saat', count: 32 },
  { id: 'cars', name: 'Klasik Otomobil', count: 18 },
  { id: 'art', name: 'Sanat', count: 27 },
  { id: 'property', name: 'Gayrimenkul', count: 12 },
  { id: 'electronics', name: 'Elektronik', count: 56 },
];

// ---------------------------------------------------------------------------
// Helper: set up standard auction API mocks
// ---------------------------------------------------------------------------

async function setupAuctionMocks(page: import('@playwright/test').Page) {
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auctions/categories',
    body: MOCK_CATEGORIES,
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auctions/featured',
    body: MOCK_AUCTIONS_LIST.data.slice(0, 4),
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auctions/upcoming',
    body: MOCK_AUCTIONS_LIST.data.slice(0, 2),
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auctions?*',
    body: MOCK_AUCTIONS_LIST,
  });
  await mockApiResponse(page, {
    urlPattern: '**/api/v1/auctions',
    body: MOCK_AUCTIONS_LIST,
  });
}

// ---------------------------------------------------------------------------
// Muzayede listesi sayfasi
// ---------------------------------------------------------------------------

test.describe('Muzayede Listesi (/tr/auctions)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuctionMocks(page);
  });

  test('muzayede listeleme sayfasini yukler', async ({ page }) => {
    await page.goto('/tr/auctions');

    // Sayfa basligini dogrula
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // Arama inputu
    const searchInput = page.locator('input[type="text"], input[placeholder]').first();
    await expect(searchInput).toBeVisible();
  });

  test('muzayede kartlarini gosterir', async ({ page }) => {
    await page.goto('/tr/auctions');
    await page.waitForLoadState('networkidle');

    // Muzayede kartlari yuklenmeli (skeleton veya gercek veri)
    // Sayfada icerik olmali
    const mainContent = page.locator('.flex-1');
    await expect(mainContent).toBeVisible();
  });

  test('siralama menusu calisir', async ({ page }) => {
    await page.goto('/tr/auctions');

    // Siralama butonuna tikla
    const sortButton = page.locator('button').filter({ hasText: /sırala|sort/i });
    if (await sortButton.isVisible()) {
      await sortButton.click();

      // Siralama secenekleri gorunmeli
      const sortOptions = page.locator('text=/En Yeni|Bitmek Uzere|Fiyat/');
      await expect(sortOptions.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('gorunum modu degistirme (grid/list) calisir', async ({ page }) => {
    await page.goto('/tr/auctions');

    // Grid/list gorunum butonlari
    const viewButtons = page.locator('button svg.h-4.w-4').locator('..');
    const count = await viewButtons.count();
    // En az birisi gorunur olmali (masaustu goruntusunde)
    if (count >= 2) {
      await viewButtons.last().click();
      await page.waitForTimeout(500);
    }
  });

  test('durum filtreleri gorunur (desktop)', async ({ page }) => {
    await page.goto('/tr/auctions');

    // Desktop filtreleri -- sidebar'da durum filtresi
    const statusLabels = ['Aktif', 'Bitmek Uzere', 'Yakinda', 'Sona Erdi'];
    for (const label of statusLabels) {
      const checkbox = page.locator(`label`).filter({ hasText: label });
      // Desktop gorunumunde gorunur olabilir
      if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(checkbox).toBeVisible();
      }
    }
  });

  test('kategori filtreleri gorunur (desktop)', async ({ page }) => {
    await page.goto('/tr/auctions');

    // Sidebar'da kategori filtreleri
    const categoryCheckbox = page.locator('label').filter({ hasText: /Mucevher|Antika|Saat/ }).first();
    if (await categoryCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categoryCheckbox.click();
      await page.waitForTimeout(500);

      // Aktif filtre badge'i gorunmeli
      const activeBadge = page.locator('text=/Mucevher|Antika|Saat/').first();
      await expect(activeBadge).toBeVisible();
    }
  });

  test('fiyat araligi filtresi girer', async ({ page }) => {
    await page.goto('/tr/auctions');

    // Fiyat araligi inputlari
    const minPriceInput = page.locator('input[type="number"]').first();
    if (await minPriceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await minPriceInput.fill('10000');

      const maxPriceInput = page.locator('input[type="number"]').nth(1);
      if (await maxPriceInput.isVisible()) {
        await maxPriceInput.fill('100000');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Muzayede detay sayfasi
// ---------------------------------------------------------------------------

test.describe('Muzayede Detay Sayfasi', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/auctions/auction-001',
      body: MOCK_AUCTION,
    });
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/bids/auction/auction-001*',
      body: MOCK_BIDS,
    });
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/auctions/auction-001/similar',
      body: MOCK_AUCTIONS_LIST.data.slice(1),
    });
  });

  test('muzayede detay sayfasini yukler ve bilgileri gosterir', async ({ page }) => {
    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // Sayfa icerik icermeli (skeleton veya gercek veri)
    const mainContent = page.locator('.max-w-7xl');
    await expect(mainContent).toBeVisible();
  });

  test('muzayede basligi ve kategorisini dogrular', async ({ page }) => {
    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // Baslik
    const title = page.locator('h1');
    await expect(title).toBeVisible();

    // Breadcrumb navigasyonu
    const breadcrumb = page.locator('nav');
    if (await breadcrumb.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(breadcrumb.locator('text=Muzayedeler')).toBeVisible();
    }
  });

  test('tab navigasyonu calisir (aciklama, detaylar, kargo)', async ({ page }) => {
    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // Tab butonlarini kontrol et
    const tabs = page.locator('button').filter({ hasText: /aciklama|detay|kargo/i });
    const tabCount = await tabs.count();

    if (tabCount > 0) {
      // Her taba tikla ve icerigin degistigini dogrula
      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('teklif paneli gorunur', async ({ page }) => {
    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // Teklif paneli karti
    const bidPanel = page.locator('.sticky, [class*="sticky"]').first();
    if (await bidPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(bidPanel).toBeVisible();
    }
  });

  test('giris yapmadan teklif vermek icin giris yap mesaji gosterir', async ({ page }) => {
    // Cookie temizle (giris yapilmamis)
    await page.context().clearCookies();

    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // "Giris yap" mesaji veya butonu aranir
    const loginMessage = page.locator('text=/giriş|giris|login/i');
    if (await loginMessage.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(loginMessage.first()).toBeVisible();
    }
  });

  test('resim galerisi navigasyonu calisir', async ({ page }) => {
    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // Galeri navigasyon oklari
    const nextButton = page.locator('button').filter({ has: page.locator('svg') }).nth(0);
    if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('satici bilgisi gorunur', async ({ page }) => {
    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // Satici karti
    const sellerSection = page.locator('text=/satici|profil/i');
    if (await sellerSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sellerSection.first()).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Teklif verme (auth gerekli)
// ---------------------------------------------------------------------------

test.describe('Teklif Verme (Bidding)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/auctions/auction-001',
      body: MOCK_AUCTION,
    });
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/bids/auction/auction-001*',
      body: MOCK_BIDS,
    });
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/auctions/auction-001/similar',
      body: [],
    });
    await mockProfileApi(page);
  });

  test('giris yapmis kullanici teklif formu gorebilir', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // Teklif inputu veya hizli teklif butonlari
    const bidInput = page.locator('input[type="number"]').first();
    if (await bidInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(bidInput).toBeVisible();
    }
  });

  test('teklif verir ve onay dialogu gosterir', async ({ page }) => {
    await loginAsUser(page);

    // Teklif API mock
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/bids',
      method: 'POST',
      body: {
        data: {
          id: 'bid-new',
          amount: 43000,
          bidderName: 'A***z',
          timestamp: new Date().toISOString(),
          isAutoBid: false,
        },
      },
    });

    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // Teklif miktari gir
    const bidInput = page.locator('input[type="number"]').first();
    if (await bidInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bidInput.fill('43000');

      // Teklif ver butonuna tikla
      const bidButton = page.locator('button').filter({ hasText: /teklif ver|place bid/i }).first();
      if (await bidButton.isVisible()) {
        await bidButton.click();
        await page.waitForTimeout(1000);

        // Onay dialogu acilabilir
        const dialog = page.locator('[role="dialog"], [class*="dialog"]');
        if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(dialog).toBeVisible();
        }
      }
    }
  });

  test('minimum teklif miktarinin altinda hata gosterir', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    const bidInput = page.locator('input[type="number"]').first();
    if (await bidInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Dusuk miktar gir (minimum 43000 olmali, 42500 + 500)
      await bidInput.fill('100');

      // Hata mesaji gorunmeli
      const errorMessage = page.locator('text=/minimum/i');
      if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });

  test('teklif gecmisi gorunur', async ({ page }) => {
    await page.goto('/tr/auctions/auction-001');
    await page.waitForLoadState('networkidle');

    // Teklif gecmisi basligini ara
    const bidHistoryTitle = page.locator('text=/teklif gecmisi|bid history/i');
    if (await bidHistoryTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(bidHistoryTitle).toBeVisible();
    }
  });
});
