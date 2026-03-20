import { test, expect } from "@playwright/test";
import { loginAs, ROLE_CREDENTIALS } from "./helpers";

// ─── Per-role smoke tests ────────────────────────────────────────────
// Each test is tagged @<role> so the CI matrix can run them independently.

for (const [role, creds] of Object.entries(ROLE_CREDENTIALS)) {
  test.describe(`${role} smoke`, () => {
    test(`login and see dashboard @${role}`, async ({ page }) => {
      await loginAs(page, role);

      // Should land on some form of dashboard / home
      const heading = page.getByRole("heading").first();
      await expect(heading).toBeVisible({ timeout: 10000 });
      await expect(heading).toHaveText(creds.dashboardHeading);
    });

    test(`sidebar is visible after login @${role}`, async ({ page }) => {
      await loginAs(page, role);

      // The AppShell sidebar should render
      const sidebar = page.locator("aside, nav, [data-testid='sidebar']");
      await expect(sidebar.first()).toBeVisible({ timeout: 5000 });
    });

    test(`can log out @${role}`, async ({ page }) => {
      await loginAs(page, role);

      // Look for a logout/sign-out control
      const userMenu = page.getByRole("button", {
        name: /account|profile|menu|avatar/i,
      });
      if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userMenu.click();
      }

      const logoutBtn = page.getByRole("button", {
        name: /log\s?out|sign\s?out/i,
      });
      // Some layouts put logout in a menuitem
      const logoutItem =
        (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false))
          ? logoutBtn
          : page.getByRole("menuitem", { name: /log\s?out|sign\s?out/i });

      await logoutItem.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });
}
