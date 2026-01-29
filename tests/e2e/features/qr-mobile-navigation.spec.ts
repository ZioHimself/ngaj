/**
 * QR Mobile Navigation E2E Tests
 *
 * Tests overflow menu → QR page flow for mobile access.
 *
 * @see Handoff 016: QR Mobile Navigation
 * @see ADR-019: QR Mobile Navigation
 */

import { test, expect } from '@playwright/test';

test.describe('QR Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/auth/status', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      })
    );
    await page.route('/api/wizard/check', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hasProfile: true }),
      })
    );
    await page.route(/\/api\/opportunities(?:\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          opportunities: [],
          total: 0,
          limit: 20,
          offset: 0,
          hasMore: false,
        }),
      })
    );
  });

  test('should navigate from overflow menu to QR page when user clicks Mobile Access', async ({
    page,
  }) => {
    await page.goto('/opportunities');
    await expect(page.getByAltText('ngaj')).toBeVisible();

    const menuButton = page.getByRole('button', {
      name: /open menu|more|options/i,
    });
    await menuButton.click();

    await expect(page.getByText('Mobile Access')).toBeVisible();
    await page.getByText('Mobile Access').click();

    await expect(page).toHaveURL(/\/qr/);
    await expect(page.locator('svg')).toBeVisible();
    await expect(page.getByText(/scan to open|your device/i)).toBeVisible();
  });
});
