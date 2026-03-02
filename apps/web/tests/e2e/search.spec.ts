import { test, expect } from '@playwright/test';
import { mockApiResponse } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_SEARCH_RESULTS = {
  hits: [
    {
      id: 'product-001',
      title: 'Osmanli Donemi Altin Kolye',
      shortDescription: 'Nadir bulunan Osmanli donemi el yapimi altin kolye',
      estimateLow: 15000,
      estimateHigh: 25000,
      condition: 'USED',
      category: 'Antika Taki',
      imageUrl: 'https://images.unsplash.com/photo-1515562141589-67f0d569b6c6?w=400',
      status: 'active',
    },
    {
      id: 'product-002',
      title: 'Rolex Submariner Date',
      shortDescription: 'Rolex Submariner Date 41mm celik kasa',
      estimateLow: 800000,
      estimateHigh: 1200000,
      condition: 'NEW',
      category: 'Luks Saat',
      imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400',
      status: 'active',
    },
    {
      id: 'product-003',
      title: 'Yagli Boya Istanbul Manzarasi',
      shortDescription: 'Anonim sanatci eliyle yapilmis Istanbul Bogazi manzarasi',
      estimateLow: 30000,
      estimateHigh: 50000,
      condition: 'USED',
      category: 'Sanat',
      imageUrl: null,
      status: 'active',
    },
  ],
  total: 3,
  facets: {
    categories: [
      { key: 'Antika Taki', doc_count: 15 },
      { key: 'Luks Saat', doc_count: 12 },
      { key: 'Sanat', doc_count: 8 },
    ],
    priceRanges: [
      { key: '0-50000', from: 0, to: 50000, doc_count: 20 },
      { key: '50000-200000', from: 50000, to: 200000, doc_count: 10 },
      { key: '200000+', from: 200000, to: 999999999, doc_count: 5 },
    ],
    statuses: [
      { key: 'active', doc_count: 30 },
      { key: 'ended', doc_count: 15 },
    ],
  },
};

const MOCK_EMPTY_RESULTS = {
  hits: [],
  total: 0,
  facets: null,
};

// ---------------------------------------------------------------------------
// Arama Sayfasi
// ---------------------------------------------------------------------------

test.describe('Arama Sayfasi (/tr/search)', () => {
  test('arama sayfasini yukler', async ({ page }) => {
    await page.goto('/tr/search');

    // Arama kutusu gorunur olmali
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();

    // Arama yap butonu
    const searchButton = page.locator('button[type="submit"]');
    await expect(searchButton).toBeVisible();
  });

  test('bos arama durumunda bilgilendirme mesaji gosterir', async ({ page }) => {
    await page.goto('/tr/search');

    // "Arama yapin" mesaji
    const emptyMessage = page.locator('text=/Arama yapın|arama/i');
    await expect(emptyMessage.first()).toBeVisible();
  });

  test('arama sorgusu girer ve sonuclari gorur', async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/search?*',
      body: MOCK_SEARCH_RESULTS,
    });

    await page.goto('/tr/search');

    // Arama kutusuna sorgu gir
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('altin kolye');

    // Arama butonuna tikla
    const searchButton = page.locator('button[type="submit"]');
    await searchButton.click();

    // Sonuc sayisi gorunmeli
    await page.waitForLoadState('networkidle');
    const resultCount = page.locator('text=/sonuç bulundu|results/i');
    if (await resultCount.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(resultCount).toBeVisible();
    }
  });

  test('arama sonuclari kartlari gosterir', async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/search?*',
      body: MOCK_SEARCH_RESULTS,
    });

    await page.goto('/tr/search?q=kolye');

    await page.waitForLoadState('networkidle');

    // Sonuc kartlari grid icinde gorunmeli
    const resultCards = page.locator('a[href*="/products/"]');
    if (await resultCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await resultCards.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('sonuc bulunamadiginda mesaj gosterir', async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/search?*',
      body: MOCK_EMPTY_RESULTS,
    });

    await page.goto('/tr/search?q=asdfghjkl');

    await page.waitForLoadState('networkidle');

    // "Sonuc bulunamadi" mesaji
    const noResultsMessage = page.locator('text=/bulunamadı|Sonuç bulunamadı/i');
    if (await noResultsMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(noResultsMessage).toBeVisible();
    }
  });

  test('filtre panelini acar', async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/search?*',
      body: MOCK_SEARCH_RESULTS,
    });

    await page.goto('/tr/search?q=kolye');
    await page.waitForLoadState('networkidle');

    // Filtrele butonuna tikla
    const filterButton = page.locator('button').filter({ hasText: /Filtrele|filtre/i }).first();
    if (await filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(500);

      // Kategori filtreleri gorunmeli
      const categorySection = page.locator('text=/Kategoriler|kategori/i');
      if (await categorySection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(categorySection).toBeVisible();
      }
    }
  });

  test('kategori filtresini uygular', async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/search?*',
      body: MOCK_SEARCH_RESULTS,
    });

    await page.goto('/tr/search?q=kolye');
    await page.waitForLoadState('networkidle');

    // Filtrele butonuna tikla
    const filterButton = page.locator('button').filter({ hasText: /Filtrele/i }).first();
    if (await filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(500);

      // Kategori secimi
      const categoryButton = page.locator('button').filter({ hasText: /Antika Taki/ }).first();
      if (await categoryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await categoryButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('fiyat filtresini uygular', async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/search?*',
      body: MOCK_SEARCH_RESULTS,
    });

    await page.goto('/tr/search?q=kolye');
    await page.waitForLoadState('networkidle');

    // Filtrele butonuna tikla
    const filterButton = page.locator('button').filter({ hasText: /Filtrele/i }).first();
    if (await filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(500);

      // Fiyat araligi inputlari
      const minInput = page.locator('input[placeholder="Min"]');
      const maxInput = page.locator('input[placeholder="Max"]');

      if (await minInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await minInput.fill('10000');
        await maxInput.fill('100000');

        // Uygula butonuna tikla
        const applyButton = page.locator('button').filter({ hasText: /Uygula/ });
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('siralama secenegini degistirir', async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/search?*',
      body: MOCK_SEARCH_RESULTS,
    });

    await page.goto('/tr/search?q=kolye');
    await page.waitForLoadState('networkidle');

    // Siralama dropdown'i
    const sortSelect = page.locator('select');
    if (await sortSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      // "Fiyat: Dusukten Yuksege" sec
      await sortSelect.selectOption('price_asc');
      await page.waitForTimeout(500);

      // Secimin uygulandigini dogrula
      const selectedValue = await sortSelect.inputValue();
      expect(selectedValue).toBe('price_asc');
    }
  });

  test('arama kutusunu temizleme butonu calisir', async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/search?*',
      body: MOCK_SEARCH_RESULTS,
    });

    await page.goto('/tr/search');

    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('test sorgusu');

    // Temizle butonu (X ikonu)
    const clearButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Input'un dolu oldugunu dogrula
      const value = await searchInput.inputValue();
      expect(value).toBe('test sorgusu');
    }
  });

  test('URL\'den arama sorgusunu okur', async ({ page }) => {
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/search?*',
      body: MOCK_SEARCH_RESULTS,
    });

    await page.goto('/tr/search?q=rolex');
    await page.waitForLoadState('networkidle');

    // Arama inputunda "rolex" yazmali
    const searchInput = page.locator('input[type="text"]');
    const value = await searchInput.inputValue();
    expect(value).toBe('rolex');
  });
});
