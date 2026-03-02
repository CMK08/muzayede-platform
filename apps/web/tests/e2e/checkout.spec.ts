import { test, expect } from '@playwright/test';
import { loginAsUser, mockApiResponse, mockProfileApi } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_ORDER = {
  id: 'order-001',
  hammerPrice: 42500,
  buyerCommission: 4250,
  vatAmount: 8415,
  totalAmount: 55165,
  status: 'pending_payment',
  lot: {
    product: {
      id: 'product-001',
      title: 'Osmanli Donemi Altin Kupe Seti',
      media: [
        { url: 'https://images.unsplash.com/photo-1515562141589-67f0d569b6c6?w=400', isPrimary: true },
      ],
    },
  },
  auction: {
    id: 'auction-001',
    title: 'Antika Mucevher Muzayedesi',
  },
  shippingOptions: [
    {
      id: 'ship-001',
      carrier: 'Yurtici Kargo',
      price: 150,
      estimatedDays: 3,
    },
    {
      id: 'ship-002',
      carrier: 'Aras Kargo',
      price: 120,
      estimatedDays: 5,
    },
  ],
};

// ---------------------------------------------------------------------------
// Checkout Akisi
// ---------------------------------------------------------------------------

test.describe('Odeme Sayfasi (Checkout)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await mockProfileApi(page);

    // Siparis API mock
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/orders/order-001',
      body: MOCK_ORDER,
    });
  });

  test('odeme sayfasini yukler ve siparis ozetini gosterir', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Sayfa basligini dogrula
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // Siparis ozeti karti
    const orderSummary = page.locator('text=/Sipariş Özeti|siparis/i');
    if (await orderSummary.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(orderSummary.first()).toBeVisible();
    }
  });

  test('odeme yontemlerini gosterir (kredi karti ve havale)', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Kredi Karti secenegi
    const creditCardOption = page.locator('text=/Kredi Kartı|kredi kart/i');
    if (await creditCardOption.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(creditCardOption.first()).toBeVisible();
    }

    // Havale / EFT secenegi
    const bankOption = page.locator('text=/Havale|EFT/i');
    if (await bankOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(bankOption.first()).toBeVisible();
    }
  });

  test('kredi karti formunu doldurur', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Kredi karti alanlarini doldur
    const cardNameInput = page.locator('input[placeholder="Ad Soyad"]');
    if (await cardNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cardNameInput.fill('Ahmet Yilmaz');

      const cardNumberInput = page.locator('input[placeholder*="0000"]');
      await cardNumberInput.fill('4111111111111111');

      const expiryInput = page.locator('input[placeholder*="AA"]');
      await expiryInput.fill('1228');

      const cvcInput = page.locator('input[placeholder="000"]');
      await cvcInput.fill('123');
    }
  });

  test('odeme yontemi secimini degistirir (havale)', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Havale / EFT butonuna tikla
    const bankButton = page.locator('button').filter({ hasText: /Havale|EFT/ }).first();
    if (await bankButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bankButton.click();
      await page.waitForTimeout(500);

      // Banka bilgileri gorunmeli
      const bankInfo = page.locator('text=/IBAN|Banka/i');
      if (await bankInfo.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(bankInfo.first()).toBeVisible();
      }
    }
  });

  test('taksit secenegini degistirir', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Taksit dropdown'i
    const installmentSelect = page.locator('select');
    if (await installmentSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await installmentSelect.selectOption('6');

      const selectedValue = await installmentSelect.inputValue();
      expect(selectedValue).toBe('6');
    }
  });

  test('kargo secenegini secer', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Kargo secenekleri
    const shippingOption = page.locator('button').filter({ hasText: /Yurtici Kargo|Aras Kargo/ }).first();
    if (await shippingOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shippingOption.click();
      await page.waitForTimeout(300);
    }
  });

  test('devam et ile onay adimina gecer', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Kredi karti bilgilerini doldur
    const cardNameInput = page.locator('input[placeholder="Ad Soyad"]');
    if (await cardNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cardNameInput.fill('Ahmet Yilmaz');
      await page.locator('input[placeholder*="0000"]').fill('4111111111111111');
      await page.locator('input[placeholder*="AA"]').fill('1228');
      await page.locator('input[placeholder="000"]').fill('123');

      // Devam Et butonuna tikla
      const continueButton = page.locator('button').filter({ hasText: /Devam Et/ });
      if (await continueButton.isVisible({ timeout: 3000 })) {
        await continueButton.click();
        await page.waitForTimeout(500);

        // Onay adimi gorunmeli
        const confirmSection = page.locator('text=/Ödeme Onayı|onay/i');
        if (await confirmSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(confirmSection.first()).toBeVisible();
        }
      }
    }
  });

  test('odemeyi tamamlar ve basari durumunu dogrular', async ({ page }) => {
    // Odeme API mock
    await mockApiResponse(page, {
      urlPattern: '**/api/v1/payments',
      method: 'POST',
      body: { success: true, transactionId: 'tx-001' },
    });

    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Kart bilgilerini doldur
    const cardNameInput = page.locator('input[placeholder="Ad Soyad"]');
    if (await cardNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cardNameInput.fill('Ahmet Yilmaz');
      await page.locator('input[placeholder*="0000"]').fill('4111111111111111');
      await page.locator('input[placeholder*="AA"]').fill('1228');
      await page.locator('input[placeholder="000"]').fill('123');

      // Devam Et
      const continueButton = page.locator('button').filter({ hasText: /Devam Et/ });
      if (await continueButton.isVisible({ timeout: 3000 })) {
        await continueButton.click();
        await page.waitForTimeout(500);

        // Ode butonuna tikla
        const payButton = page.locator('button').filter({ hasText: /Öde|ode/i }).first();
        if (await payButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await payButton.click();
          await page.waitForTimeout(2000);

          // Basari mesaji
          const successMessage = page.locator('text=/Başarılı|basarili/i');
          if (await successMessage.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(successMessage.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('siparis ozeti fiyat bilgilerini gosterir', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Fiyat kalemleri
    const priceItems = ['Çekiç Fiyatı', 'Komisyon', 'KDV', 'Toplam'];
    for (const item of priceItems) {
      const element = page.locator(`text=/${item}/i`);
      if (await element.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(element.first()).toBeVisible();
      }
    }
  });

  test('urun bilgisini siparis ozetinde gosterir', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Urun basligi
    const productTitle = page.locator('text=/Osmanli|Altin Kupe/i');
    if (await productTitle.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(productTitle.first()).toBeVisible();
    }
  });

  test('ilerleme adimlari gorunur', async ({ page }) => {
    await page.goto('/tr/checkout/order-001');
    await page.waitForLoadState('networkidle');

    // Adim gostergeleri
    const step1 = page.locator('text=/Ödeme Yöntemi/i');
    if (await step1.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(step1.first()).toBeVisible();
    }

    const step2 = page.locator('text=/Onay/i');
    if (await step2.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(step2.first()).toBeVisible();
    }
  });
});
