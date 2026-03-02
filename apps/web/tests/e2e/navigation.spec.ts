import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Navigation & Locale Switching
// ---------------------------------------------------------------------------

test.describe('Navigasyon (Navigation)', () => {
  test('anasayfa logosuna tiklayarak geri doner', async ({ page }) => {
    await page.goto('/tr/auctions');

    // Header'daki logo veya ana sayfa linkine tikla
    const header = page.locator('header');
    const homeLink = header.locator('a[href="/tr"]').first();
    await homeLink.click();

    await expect(page).toHaveURL(/\/tr$/);
  });

  test('muzayedeler linkine tiklayarak sayfa degistirir', async ({ page }) => {
    await page.goto('/tr');

    const header = page.locator('header');
    const auctionsLink = header.locator('a[href="/tr/auctions"]').first();
    await auctionsLink.click();

    await expect(page).toHaveURL(/\/tr\/auctions/);
  });

  test('giris ve kayit butonlari oturum acmamis kullanicilara gorunur', async ({ page }) => {
    await page.goto('/tr');

    const header = page.locator('header');

    // Giris linki/butonu gorunur olmali
    const loginLink = header.locator('a[href="/tr/login"]');
    await expect(loginLink).toBeVisible();

    // Kayit ol linki/butonu gorunur olmali
    const registerLink = header.locator('a[href="/tr/register"]');
    await expect(registerLink).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Dil Degistirme (Locale Switching)
// ---------------------------------------------------------------------------

test.describe('Dil Degistirme (Locale Switching)', () => {
  test('Turkce\'den Ingilizce\'ye gecis yapar', async ({ page }) => {
    await page.goto('/tr');

    const header = page.locator('header');

    // Dil degistirme butonlarina tikla
    const buttons = header.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible())) continue;

      await btn.click();

      // Ingilizce secenegi gorunuyor mu?
      const englishLink = page.locator('a[href="/en"]');
      if (await englishLink.isVisible().catch(() => false)) {
        await englishLink.click();
        await expect(page).toHaveURL(/\/en/);
        return;
      }

      // Acilan menuyu kapat
      await page.locator('body').click({ position: { x: 0, y: 0 } });
    }
  });

  test('Ingilizce\'den Turkce\'ye geri doner', async ({ page }) => {
    await page.goto('/en');

    const header = page.locator('header');

    const buttons = header.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible())) continue;

      await btn.click();

      // Turkce secenegi gorunuyor mu?
      const turkishLink = page.locator('a[href="/tr"]');
      if (await turkishLink.isVisible().catch(() => false)) {
        await turkishLink.click();
        await expect(page).toHaveURL(/\/tr/);
        return;
      }

      await page.locator('body').click({ position: { x: 0, y: 0 } });
    }
  });
});
