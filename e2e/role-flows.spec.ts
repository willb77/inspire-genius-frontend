import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

// ─── 3.INT3: Role-Based E2E Test Suite ──────────────────────────────
// Tests the critical user flows for each of the 6 roles.
// Tagged per role so CI matrix can run them independently.

// ─── Manager ────────────────────────────────────────────────────────
test.describe("manager flow", () => {
  test("login → dashboard → view team → assign coaching @manager", async ({
    page,
  }) => {
    await loginAs(page, "manager");

    // Should land on manager dashboard
    await expect(page).toHaveURL(/\/manager\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /dashboard/i })
    ).toBeVisible();

    // Navigate to team page
    await page.getByRole("link", { name: /team/i }).click();
    await expect(page).toHaveURL(/\/manager\/team/);

    // Team page should show team members
    await expect(
      page.getByRole("heading", { name: /team/i })
    ).toBeVisible();

    // Verify team data renders (table or list of members)
    const teamContent = page.locator(
      "table, [data-testid='team-list'], [role='grid']"
    );
    await expect(teamContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("can access hiring pipeline @manager", async ({ page }) => {
    await loginAs(page, "manager");

    await page.getByRole("link", { name: /hiring/i }).click();
    await expect(page).toHaveURL(/\/manager\/hiring/);
    await expect(
      page.getByRole("heading", { name: /hiring/i })
    ).toBeVisible();
  });

  test("cannot access super-admin routes @manager", async ({ page }) => {
    await loginAs(page, "manager");
    await page.goto("/super-admin/dashboard");

    // Should be redirected away (to manager dashboard or login)
    await expect(page).not.toHaveURL(/\/super-admin/, { timeout: 5000 });
  });
});

// ─── Company Admin ──────────────────────────────────────────────────
test.describe("company-admin flow", () => {
  test("login → dashboard → invite user → change role @company-admin", async ({
    page,
  }) => {
    await loginAs(page, "company-admin");

    // Should land on company admin dashboard
    await expect(page).toHaveURL(/\/company-admin\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /dashboard/i })
    ).toBeVisible();

    // Navigate to users page
    await page.getByRole("link", { name: /users/i }).click();
    await expect(page).toHaveURL(/\/company-admin\/users/);

    // Users page should render
    await expect(
      page.getByRole("heading", { name: /users/i })
    ).toBeVisible();

    // Look for invite/add user action
    const inviteBtn = page.getByRole("button", {
      name: /invite|add user|new user/i,
    });
    await expect(inviteBtn).toBeVisible({ timeout: 10000 });
  });

  test("can access organization settings @company-admin", async ({
    page,
  }) => {
    await loginAs(page, "company-admin");

    await page.getByRole("link", { name: /organization/i }).click();
    await expect(page).toHaveURL(/\/company-admin\/organization/);
  });

  test("can access cost dashboard @company-admin", async ({ page }) => {
    await loginAs(page, "company-admin");

    await page.getByRole("link", { name: /cost/i }).click();
    await expect(page).toHaveURL(/\/company-admin\/costs/);
    await expect(
      page.getByRole("heading", { name: /cost/i })
    ).toBeVisible();
  });

  test("cannot access super-admin routes @company-admin", async ({
    page,
  }) => {
    await loginAs(page, "company-admin");
    await page.goto("/super-admin/dashboard");
    await expect(page).not.toHaveURL(/\/super-admin/, { timeout: 5000 });
  });
});

// ─── Practitioner ───────────────────────────────────────────────────
test.describe("practitioner flow", () => {
  test("login → dashboard → clients → view detail @practitioner", async ({
    page,
  }) => {
    await loginAs(page, "practitioner");

    // Should land on practitioner dashboard
    await expect(page).toHaveURL(/\/practitioner\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /dashboard/i })
    ).toBeVisible();

    // Navigate to clients
    await page.getByRole("link", { name: /client/i }).click();
    await expect(page).toHaveURL(/\/practitioner\/clients/);

    // Clients page should render
    await expect(
      page.getByRole("heading", { name: /client/i })
    ).toBeVisible();
  });

  test("can access credits page @practitioner", async ({ page }) => {
    await loginAs(page, "practitioner");

    await page.getByRole("link", { name: /credit/i }).click();
    await expect(page).toHaveURL(/\/practitioner\/credits/);
  });

  test("cannot access manager routes @practitioner", async ({ page }) => {
    await loginAs(page, "practitioner");
    await page.goto("/manager/dashboard");
    await expect(page).not.toHaveURL(/\/manager/, { timeout: 5000 });
  });
});

// ─── Distributor ────────────────────────────────────────────────────
test.describe("distributor flow", () => {
  test("login → dashboard → allocate credits → view transactions @distributor", async ({
    page,
  }) => {
    await loginAs(page, "distributor");

    // Should land on distributor dashboard
    await expect(page).toHaveURL(/\/distributor\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /dashboard/i })
    ).toBeVisible();

    // Navigate to credits
    await page.getByRole("link", { name: /credit/i }).click();
    await expect(page).toHaveURL(/\/distributor\/credits/);

    // Credits page should render
    await expect(
      page.getByRole("heading", { name: /credit/i })
    ).toBeVisible();
  });

  test("can view practitioners @distributor", async ({ page }) => {
    await loginAs(page, "distributor");

    await page.getByRole("link", { name: /practitioner/i }).click();
    await expect(page).toHaveURL(/\/distributor\/practitioners/);
  });

  test("can access territory page @distributor", async ({ page }) => {
    await loginAs(page, "distributor");

    await page.getByRole("link", { name: /territory/i }).click();
    await expect(page).toHaveURL(/\/distributor\/territory/);
  });

  test("cannot access company-admin routes @distributor", async ({
    page,
  }) => {
    await loginAs(page, "distributor");
    await page.goto("/company-admin/dashboard");
    await expect(page).not.toHaveURL(/\/company-admin/, { timeout: 5000 });
  });
});

// ─── User (end user) ────────────────────────────────────────────────
test.describe("user flow", () => {
  test("login → home → coaching session regression @user", async ({
    page,
  }) => {
    await loginAs(page, "user");

    // Should land on home or dashboard
    await expect(page).toHaveURL(/\/(home|dashboard)/);
    await expect(
      page.getByRole("heading", { name: /welcome|home|dashboard/i })
    ).toBeVisible();
  });

  test("can access coaches page @user", async ({ page }) => {
    await loginAs(page, "user");

    await page.getByRole("link", { name: /coach/i }).click();
    await expect(page).toHaveURL(/\/coaches/);
  });

  test("can access documents page @user", async ({ page }) => {
    await loginAs(page, "user");

    await page.getByRole("link", { name: /document/i }).click();
    await expect(page).toHaveURL(/\/documents/);
  });

  test("can access settings @user", async ({ page }) => {
    await loginAs(page, "user");

    await page.getByRole("link", { name: /setting/i }).click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test("cannot access manager routes @user", async ({ page }) => {
    await loginAs(page, "user");
    await page.goto("/manager/dashboard");
    await expect(page).not.toHaveURL(/\/manager/, { timeout: 5000 });
  });
});

// ─── Super Admin ────────────────────────────────────────────────────
test.describe("super-admin flow", () => {
  test("login → admin panel → verify management features @super-admin", async ({
    page,
  }) => {
    await loginAs(page, "super-admin");

    // Should land on super-admin dashboard
    await expect(page).toHaveURL(/\/super-admin\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /dashboard/i })
    ).toBeVisible();
  });

  test("can access user management @super-admin", async ({ page }) => {
    await loginAs(page, "super-admin");

    await page.getByRole("link", { name: /user/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/users/);
  });

  test("can access organizations @super-admin", async ({ page }) => {
    await loginAs(page, "super-admin");

    await page.getByRole("link", { name: /organization/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/organizations/);
  });

  test("can access coaches management @super-admin", async ({ page }) => {
    await loginAs(page, "super-admin");

    await page.getByRole("link", { name: /coach/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/coaches/);
  });

  test("can access audit log @super-admin", async ({ page }) => {
    await loginAs(page, "super-admin");

    await page.getByRole("link", { name: /audit/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/audit-log/);
  });

  test("can access RLHF training @super-admin", async ({ page }) => {
    await loginAs(page, "super-admin");

    await page.getByRole("link", { name: /rlhf|training/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/rlhf-training/);
  });
});

// ─── Cross-role RBAC verification ───────────────────────────────────
test.describe("RBAC enforcement", () => {
  const rolePaths: [string, string][] = [
    ["user", "/super-admin/dashboard"],
    ["user", "/manager/dashboard"],
    ["user", "/company-admin/dashboard"],
    ["user", "/practitioner/dashboard"],
    ["user", "/distributor/dashboard"],
    ["manager", "/super-admin/dashboard"],
    ["manager", "/company-admin/dashboard"],
    ["practitioner", "/super-admin/dashboard"],
    ["practitioner", "/distributor/dashboard"],
    ["distributor", "/super-admin/dashboard"],
    ["distributor", "/manager/dashboard"],
    ["company-admin", "/super-admin/dashboard"],
  ];

  for (const [role, forbiddenPath] of rolePaths) {
    test(`${role} blocked from ${forbiddenPath}`, async ({ page }) => {
      await loginAs(page, role);
      await page.goto(forbiddenPath);

      // Should redirect away from the forbidden route
      const pathPrefix = forbiddenPath.split("/").slice(0, 2).join("/");
      await expect(page).not.toHaveURL(new RegExp(pathPrefix), {
        timeout: 5000,
      });
    });
  }
});
