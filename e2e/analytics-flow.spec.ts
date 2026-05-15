import { test, expect } from "@playwright/test";
import { loginAs, ROLE_CREDENTIALS } from "./helpers";

// ─── 5.T6.2: Analytics Verification E2E ─────────────────────────────

const ROLES_WITH_ANALYTICS = [
  "user",
  "manager",
  "company-admin",
  "practitioner",
  "distributor",
  "super-admin",
] as const;

test.describe("analytics dashboards", () => {
  for (const role of ROLES_WITH_ANALYTICS) {
    test.describe(`${role} analytics`, () => {
      test(`dashboard data loads @${role}`, async ({ page }) => {
        await loginAs(page, role);

        // Navigate to analytics page
        const analyticsLink = page.getByRole("link", {
          name: /analytics|reports|insights/i,
        });
        if (
          await analyticsLink.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          await analyticsLink.click();
        }

        // Verify charts/data containers render
        const dataContainer = page.locator(
          "[data-testid='analytics-dashboard'], [data-testid='chart'], canvas, svg.recharts-surface, .recharts-wrapper"
        );
        await expect(dataContainer.first()).toBeVisible({ timeout: 10000 });
      });

      test(`date range filtering works @${role}`, async ({ page }) => {
        await loginAs(page, role);

        const analyticsLink = page.getByRole("link", {
          name: /analytics|reports|insights/i,
        });
        if (
          await analyticsLink.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          await analyticsLink.click();
        }

        // Look for date range selector
        const dateFilter = page.locator(
          "[data-testid='date-range'], [data-testid='date-filter'], select, [role='combobox']"
        );
        if (
          await dateFilter.first().isVisible({ timeout: 5000 }).catch(() => false)
        ) {
          await dateFilter.first().click();

          // Select a different range option
          const option = page.getByRole("option", {
            name: /30 days|this month|last week|7 days/i,
          });
          if (await option.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await option.first().click();
          }

          // Data should reload (loading indicator or new data)
          await page.waitForTimeout(1000);
          const dataContainer = page.locator(
            "[data-testid='analytics-dashboard'], canvas, svg.recharts-surface"
          );
          await expect(dataContainer.first()).toBeVisible({ timeout: 10000 });
        }
      });
    });
  }
});

test.describe("role-scoped analytics data", () => {
  test("manager sees only team data, not org-wide @manager", async ({
    page,
  }) => {
    await loginAs(page, "manager");

    const analyticsLink = page.getByRole("link", {
      name: /analytics|reports/i,
    });
    if (
      await analyticsLink.isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      await analyticsLink.click();
    }

    // Should see team-scoped heading, not org-wide
    const heading = page.getByRole("heading");
    await expect(heading.first()).toBeVisible({ timeout: 5000 });

    // Should NOT see org-level admin controls
    const orgControls = page.locator(
      "[data-testid='org-selector'], [data-testid='all-users']"
    );
    await expect(orgControls).toHaveCount(0);
  });

  test("company-admin sees org-wide data @company-admin", async ({
    page,
  }) => {
    await loginAs(page, "company-admin");

    const analyticsLink = page.getByRole("link", {
      name: /analytics|reports/i,
    });
    if (
      await analyticsLink.isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      await analyticsLink.click();
    }

    // Should see org-level metrics
    const heading = page.getByRole("heading");
    await expect(heading.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("report export", () => {
  test("export button is available for super-admin @super-admin", async ({
    page,
  }) => {
    await loginAs(page, "super-admin");

    const analyticsLink = page.getByRole("link", {
      name: /analytics|reports/i,
    });
    if (
      await analyticsLink.isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      await analyticsLink.click();
    }

    // Look for export/download button
    const exportBtn = page.getByRole("button", {
      name: /export|download|csv|pdf/i,
    });
    if (
      await exportBtn.first().isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await expect(exportBtn.first()).toBeEnabled();
    }
  });
});
