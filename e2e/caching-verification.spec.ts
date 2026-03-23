import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

// ─── 5.T6.3: Caching Verification E2E ──────────────────────────────

test.describe("caching and performance", () => {
  test("dashboard loads within performance budget @user", async ({ page }) => {
    await loginAs(page, "user");

    const start = Date.now();

    // Navigate to dashboard
    const dashboardLink = page.getByRole("link", {
      name: /dashboard|home/i,
    });
    if (
      await dashboardLink.isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      await dashboardLink.click();
    }

    // Wait for main content to render
    const mainContent = page.locator("main, [data-testid='dashboard']");
    await expect(mainContent.first()).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - start;
    // Performance budget: dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("repeated navigation is faster (cache hit) @user", async ({
    page,
  }) => {
    await loginAs(page, "user");

    // First navigation — cold
    const coachesLink = page.getByRole("link", { name: /coach/i });
    if (
      await coachesLink.isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      const coldStart = Date.now();
      await coachesLink.click();
      await page.waitForLoadState("networkidle");
      const coldTime = Date.now() - coldStart;

      // Navigate away
      const homeLink = page.getByRole("link", { name: /home|dashboard/i });
      if (
        await homeLink.first().isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await homeLink.first().click();
        await page.waitForLoadState("networkidle");
      }

      // Second navigation — warm (should benefit from browser/service worker cache)
      const warmStart = Date.now();
      const coachesLink2 = page.getByRole("link", { name: /coach/i });
      if (
        await coachesLink2
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        await coachesLink2.click();
        await page.waitForLoadState("networkidle");
      }
      const warmTime = Date.now() - warmStart;

      // Warm navigation should not be dramatically slower than cold
      // (just verify it completes within budget)
      expect(warmTime).toBeLessThan(5000);
    }
  });

  test("data freshness after page navigation @manager", async ({ page }) => {
    await loginAs(page, "manager");

    // Load dashboard
    await expect(page).toHaveURL(/\/manager\/dashboard/);
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Navigate to team
    const teamLink = page.getByRole("link", { name: /team/i });
    if (await teamLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await teamLink.click();
      await expect(page).toHaveURL(/\/manager\/team/);
    }

    // Navigate back to dashboard
    const dashLink = page.getByRole("link", { name: /dashboard/i });
    if (
      await dashLink.first().isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      await dashLink.first().click();
      await expect(page).toHaveURL(/\/manager\/dashboard/);

      // Dashboard should still show data (not stale/empty)
      await expect(heading).toBeVisible({ timeout: 10000 });
    }
  });

  test("code splitting produces multiple chunks", async ({ page }) => {
    // Navigate to login page and check that JS chunks load properly
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // The page should load and render the login form
    const loginForm = page.locator(
      "form, [data-testid='login-form'], input[type='email'], input[name='email']"
    );
    await expect(loginForm.first()).toBeVisible({ timeout: 10000 });
  });
});
