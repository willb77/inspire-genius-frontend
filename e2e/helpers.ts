import { type Page, expect } from "@playwright/test";

/**
 * Role credentials for smoke tests.
 * In CI these are seeded by the test database; locally they match MSW mock handlers.
 */
export const ROLE_CREDENTIALS: Record<
  string,
  { email: string; password: string; dashboardHeading: RegExp }
> = {
  user: {
    email: "testuser@inspiregeniusapp.com",
    password: "Test1234!",
    dashboardHeading: /welcome|home|dashboard/i,
  },
  manager: {
    email: "manager@inspiregeniusapp.com",
    password: "Test1234!",
    dashboardHeading: /manager|team|dashboard/i,
  },
  "company-admin": {
    email: "companyadmin@inspiregeniusapp.com",
    password: "Test1234!",
    dashboardHeading: /company|organization|dashboard/i,
  },
  practitioner: {
    email: "practitioner@inspiregeniusapp.com",
    password: "Test1234!",
    dashboardHeading: /practitioner|coach|dashboard/i,
  },
  distributor: {
    email: "distributor@inspiregeniusapp.com",
    password: "Test1234!",
    dashboardHeading: /distributor|credits|dashboard/i,
  },
  "super-admin": {
    email: "admin@inspiregeniusapp.com",
    password: "Test1234!",
    dashboardHeading: /super admin|admin|dashboard/i,
  },
};

/**
 * Login helper — navigates to /login and authenticates via the password form.
 */
export async function loginAs(page: Page, role: string) {
  const creds = ROLE_CREDENTIALS[role];
  if (!creds) throw new Error(`Unknown role: ${role}`);

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Click "Sign in with password" if the magic-link form is shown first
  const passwordBtn = page.getByRole("button", {
    name: /sign in with password/i,
  });
  if (await passwordBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await passwordBtn.click();
  }

  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in|log in|submit/i }).click();

  // Wait for navigation away from /login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}
