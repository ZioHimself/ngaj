/**
 * SPA Routing E2E Tests
 *
 * Verifies that frontend routes render correctly when accessed directly.
 * These tests catch issues where backend returns 404 JSON instead of serving
 * the SPA's index.html for client-side routes.
 *
 * @see Issue #25: Frontend SPA routes return 404 JSON response
 */

import { test, expect } from '@playwright/test';

test.describe('SPA Route Direct Access', () => {
  test('should render login page when navigating directly to /login', async ({
    page,
  }) => {
    // Navigate directly to /login route
    await page.goto('/login');

    // Should NOT see JSON error response
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('"error":"Not found"');
    expect(bodyText).not.toContain('"path":"/login"');

    // Should see actual login page content
    await expect(page.getByText('ngaj')).toBeVisible();
    await expect(
      page.getByPlaceholder('XXXX-XXXX-XXXX-XXXX')
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('should render setup page when navigating directly to /setup', async ({
    page,
  }) => {
    // Mock authenticated state
    await page.route('/api/auth/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    await page.route('/api/wizard/check', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hasProfile: false }),
      });
    });

    await page.route('/api/wizard/existing', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    await page.goto('/setup');

    // Should NOT see JSON error
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('"error":"Not found"');

    // Should see setup wizard
    await expect(page.getByText('ngaj Setup')).toBeVisible();
  });

  test('should render opportunities page when navigating directly to /opportunities', async ({
    page,
  }) => {
    // Mock authenticated state with profile
    await page.route('/api/auth/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    await page.route('/api/wizard/check', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hasProfile: true }),
      });
    });

    await page.goto('/opportunities');

    // Should NOT see JSON error
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('"error":"Not found"');
  });
});
